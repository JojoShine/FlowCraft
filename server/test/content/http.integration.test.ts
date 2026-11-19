import {randomUUID} from 'crypto';
import {it,expect} from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../../src/app';
import {withContentFixture} from '../fixtures';
const token=(id:string)=>`Bearer ${jwt.sign({userId:id},process.env.JWT_SECRET!)}`;
it.each(['document','drawing'] as const)('requires both the project grant and per-item permission for %s editing',kind=>withContentFixture(async fx=>{
 const owner=token(fx.owner.id),viewer=token(fx.viewer.id),project=`/api/v1/projects/${fx.project.id}`;
 const field=kind==='document'?'canEditDocuments':'canEditDrawings';
 const otherKind=kind==='document'?'drawing':'document',payload=kind==='document'?fx.body:fx.scene;
 const create=async(type:'document'|'drawing',projectId=fx.project.id,auth=owner)=>{
  const root=`/api/v1/${type}s`;
  const response=await request(app).post(root).set('Authorization',auth).send({projectId,title:'原稿',payload:type==='document'?fx.body:fx.scene}).expect(201);
  return `${root}/${response.body.data.id}`;
 };
 const url=await create(kind),sibling=await create(kind),otherUrl=await create(otherKind),foreign=await create(kind,fx.otherProject.id,token(fx.otherOwner.id));
 const itemId=url.split('/').at(-1)!;
 let embedUrl:string|undefined;
 if(kind==='drawing') {
  const embedded=await request(app).post('/api/v1/documents').set('Authorization',owner).send({projectId:fx.project.id,title:'内嵌绘图',payload:{formatVersion:1,blocks:[{id:'embedded-drawing',type:'drawing',props:{drawingId:itemId,mode:'latest',revision:0},children:[]}]}}).expect(201);
  embedUrl=`/api/v1/documents/${embedded.body.data.id}/embeds/embedded-drawing`;
 }
 const access=`${project}/viewers/${fx.viewer.id}`;
 const itemAccess=(enabled:boolean,auth=owner,resource=url)=>request(app).put(`${resource}/collaborator-editing`).set('Authorization',auth).send({allowCollaboratorEditing:enabled});
 const save=()=>({baseVersion:1,requestId:fx.requestId(),source:'manual',title:'协作者修改',payload});
 expect((await request(app).get(url).set('Authorization',viewer).expect(200)).body.data.canEdit).toBe(false);
 await request(app).patch(access).set('Authorization',viewer).send({[field]:true}).expect(403);
 await request(app).patch(access).set('Authorization',token(fx.otherOwner.id)).send({[field]:true}).expect(403);
 const foreignProject=`/api/v1/projects/${fx.otherProject.id}`;
 await request(app).patch(`${foreignProject}/viewers/${fx.viewer.id}`).set('Authorization',token(fx.otherOwner.id)).send({[field]:true}).expect(404);
 await request(app).delete(`${foreignProject}/invite/${fx.viewer.id}`).set('Authorization',token(fx.otherOwner.id)).expect(404);
 await request(app).patch(`${project}/viewers/${fx.otherOwner.id}`).set('Authorization',owner).send({[field]:true}).expect(404);
 await request(app).patch(access).set('Authorization',owner).send({[field]:'true'}).expect(400);
 await request(app).patch(access).set('Authorization',owner).send({[field]:true}).expect(200);
 const listed=await request(app).get(`${project}/viewers`).set('Authorization',owner).expect(200);
 expect(listed.body.data).toEqual([expect.objectContaining({id:fx.viewer.id,[field]:true,[kind==='document'?'canEditDrawings':'canEditDocuments']:false})]);
 expect((await request(app).get(url).set('Authorization',viewer).expect(200)).body.data.canEdit).toBe(false);
 if(embedUrl) expect((await request(app).get(embedUrl).set('Authorization',viewer).expect(200)).body.data.canEditDrawing).toBe(false);
 await request(app).patch(url).set('Authorization',viewer).send(save()).expect(403);
 await itemAccess(true,viewer).expect(403);
 await itemAccess(true,owner,foreign).expect(403);
 await request(app).put(`${url}/collaborator-editing`).set('Authorization',owner).send({allowCollaboratorEditing:'true'}).expect(400);
 expect((await itemAccess(true).expect(200)).body.data).toEqual({allowCollaboratorEditing:true});
 const items=await request(app).get(`/api/v1/${kind}s`).set('Authorization',owner).expect(200);
 expect(items.body.data.items).toEqual(expect.arrayContaining([
  expect.objectContaining({id:itemId,allowCollaboratorEditing:true}),
  expect.objectContaining({id:sibling.split('/').at(-1),allowCollaboratorEditing:false}),
 ]));
 expect((await request(app).get(url).set('Authorization',viewer).expect(200)).body.data.canEdit).toBe(true);
 if(embedUrl) expect((await request(app).get(embedUrl).set('Authorization',viewer).expect(200)).body.data.canEditDrawing).toBe(true);
 expect((await request(app).get(sibling).set('Authorization',viewer).expect(200)).body.data.canEdit).toBe(false);
 await request(app).patch(sibling).set('Authorization',viewer).send(save()).expect(403);
 expect((await request(app).get(otherUrl).set('Authorization',viewer).expect(200)).body.data.canEdit).toBe(false);
 await request(app).patch(foreign).set('Authorization',viewer).send(save()).expect(403);
 const upload=(projectId:string,resource?:string)=>{
  const req=request(app).post('/api/v1/content-assets').set('Authorization',viewer).field('projectId',projectId).field('category','attachment');
  if(resource) req.field('context',JSON.stringify({kind,id:resource.split('/').at(-1)}));
  return req.attach('file',Buffer.from('collaborator attachment'),{filename:'edit.txt',contentType:'text/plain'});
 };
 await upload(fx.project.id,url).expect(201);
 await upload(fx.project.id).expect(403);
 await upload(fx.project.id,sibling).expect(403);
 await upload(fx.otherProject.id).expect(403);
 await request(app).patch(url).set('Authorization',viewer).send(save()).expect(200);
 expect((await request(app).get(url).set('Authorization',owner).expect(200)).body.data).toMatchObject({title:'协作者修改',version:2});
 await request(app).post(url+'/share').set('Authorization',viewer).expect(403);
 await request(app).delete(url).set('Authorization',viewer).expect(403);
 await request(app).get(url+'/revisions').set('Authorization',viewer).expect(403);
 if(kind==='drawing') {
  await request(app).get(url+'/revisions/1').set('Authorization',viewer).expect(403);
  const revision=await request(app).get(url+'/revisions/2').set('Authorization',viewer).expect(200);
  await request(app).put(url+'/revisions/2/preview').set('Authorization',viewer).set('X-Content-Digest',revision.body.data.digest).type('image/svg+xml').send('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10"/></svg>').expect(200);
 }
 const shareToken=(await request(app).post(url+'/share').set('Authorization',owner).expect(200)).body.data.shareToken;
 expect((await request(app).get(`/api/v1/public/content/${kind}/${shareToken}`).set('Authorization',viewer).expect(200)).body.data.canEdit).toBe(false);
 await itemAccess(false).expect(200);
 expect((await request(app).get(url).set('Authorization',viewer).expect(200)).body.data.canEdit).toBe(false);
 if(embedUrl) expect((await request(app).get(embedUrl).set('Authorization',viewer).expect(200)).body.data.canEditDrawing).toBe(false);
 await upload(fx.project.id,url).expect(403);
 await request(app).patch(url).set('Authorization',viewer).send({...save(),baseVersion:2}).expect(403);
 if(kind==='drawing') await request(app).get(url+'/revisions/2').set('Authorization',viewer).expect(403);
 await itemAccess(true).expect(200);
 await request(app).patch(access).set('Authorization',owner).send({[field]:false}).expect(200);
 await upload(fx.project.id,url).expect(403);
 await request(app).patch(url).set('Authorization',viewer).send({...save(),baseVersion:2}).expect(403);
 expect((await request(app).get(url).set('Authorization',viewer).expect(200)).body.data.canEdit).toBe(false);
}));
it('content endpoints require header auth and enforce owner writes, current viewer reads, and static trash routing',()=>withContentFixture(async fx=>{
 await request(app).get('/api/v1/documents').expect(401);
 await request(app).get('/api/v1/documents').query({token:token(fx.owner.id).slice(7)}).expect(401);
 const created=await request(app).post('/api/v1/documents').set('Authorization',token(fx.owner.id)).send({projectId:fx.project.id,title:'说明',payload:fx.body}).expect(201);
 const id=created.body.data.id;expect(created.body.success).toBe(true);
 await request(app).get(`/api/v1/documents/${id}`).set('Authorization',token(fx.viewer.id)).expect(200);
 await request(app).get(`/api/v1/documents/${id}`).set('Authorization',token(fx.otherOwner.id)).expect(404);
 await request(app).patch(`/api/v1/documents/${id}`).set('Authorization',token(fx.viewer.id)).send({baseVersion:1,requestId:fx.requestId(),source:'auto',title:'x',payload:fx.body}).expect(403);
 await request(app).get(`/api/v1/documents/${id}/revisions`).set('Authorization',token(fx.viewer.id)).expect(403);
 await request(app).get('/api/v1/documents/trash').set('Authorization',token(fx.owner.id)).expect(200);
 const drawing=await request(app).post('/api/v1/drawings').set('Authorization',token(fx.owner.id)).send({projectId:fx.project.id,title:'图',payload:fx.scene}).expect(201);
 const did=drawing.body.data.id;
 const save={baseVersion:1,requestId:fx.requestId(),source:'manual',title:'新图',payload:fx.scene};
 const ack=await request(app).patch(`/api/v1/drawings/${did}`).set('Authorization',token(fx.owner.id)).send(save).expect(200);expect(ack.body.data.version).toBe(2);expect(ack.body.data.requestId).toBe(save.requestId);
 await request(app).patch(`/api/v1/drawings/${did}`).set('Authorization',token(fx.viewer.id)).send(save).expect(403);
 await request(app).post(`/api/v1/drawings/${did}/restore`).set('Authorization',token(fx.viewer.id)).send({baseVersion:2,requestId:fx.requestId(),revision:1}).expect(403);
 await request(app).delete(`/api/v1/drawings/${did}`).set('Authorization',token(fx.viewer.id)).expect(403);
 await request(app).post('/api/v1/content-assets').set('Authorization',token(fx.viewer.id)).field('projectId',fx.project.id).field('category','image').attach('file',Buffer.from('bad'),{filename:'x.png',contentType:'image/png'}).expect(403);
 const old=await request(app).get('/api/v1/projects').set('Authorization',token(fx.owner.id)).expect(200);expect(old.body.success).toBe(true);expect(Array.isArray(old.body.data)).toBe(true);
}));
it('utf8_bytes_enforce_limits with independent payload and transport caps and invalid formats',()=>withContentFixture(async fx=>{
 const post=(payload:any)=>request(app).post('/api/v1/documents').set('Authorization',token(fx.owner.id)).send({projectId:fx.project.id,title:'中文',payload});
 await post({formatVersion:1,blocks:[{id:'a',type:'paragraph',content:'中'.repeat(40000)}]}).expect(201);
 await post({formatVersion:1,blocks:[{id:'a',type:'paragraph',content:'中'.repeat(710000)}]}).expect(413);
 await post({formatVersion:99,blocks:[]}).expect(400);
 await request(app).post('/api/v1/drawings').set('Authorization',token(fx.owner.id)).send({projectId:fx.project.id,title:'图',payload:{...fx.scene,elements:[{id:'x',type:'rectangle',text:'中'.repeat(3600000)}]}}).expect(413);
 await request(app).post('/api/v1/documents').set('Authorization',token(fx.owner.id)).set('Content-Type','application/json').send('{').expect(400);
 expect(await fx.db.document.count({where:{projectId:fx.project.id}})).toBe(1);
}));

it('legacy project identifiers work for documents, drawings, preferences and uploads without weakening ownership',()=>withContentFixture(async fx=>{
 const owner=token(fx.owner.id),viewer=token(fx.viewer.id);
 await request(app).post('/api/v1/documents').set('Authorization',owner).send({projectId:fx.project.id,title:'旧项目文档',payload:fx.body}).expect(201);
 await request(app).post('/api/v1/drawings').set('Authorization',owner).send({projectId:fx.project.id,title:'旧项目绘图',payload:fx.scene}).expect(201);
 for(const route of ['/api/v1/documents','/api/v1/drawings','/api/v1/content-preferences/document']) await request(app).get(route).set('Authorization',owner).query({projectId:fx.project.id}).expect(200);
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jT1sAAAAASUVORK5CYII=','base64');
 await request(app).post('/api/v1/content-assets').set('Authorization',owner).field('projectId',fx.project.id).field('category','image').attach('file',png,{filename:'legacy.png',contentType:'image/png'}).expect(201);
 await request(app).post('/api/v1/documents').set('Authorization',token(fx.otherOwner.id)).send({projectId:fx.project.id,title:'无权写入',payload:fx.body}).expect(403);
 await request(app).post('/api/v1/documents').set('Authorization',viewer).send({projectId:fx.project.id,title:'只读',payload:fx.body}).expect(403);
},'legacy-project-'+randomUUID()));
