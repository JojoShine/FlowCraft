import {randomUUID} from 'crypto';
import {it,expect} from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../../src/app';
import {withContentFixture} from '../fixtures';
const token=(id:string)=>`Bearer ${jwt.sign({userId:id},process.env.JWT_SECRET!)}`;
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
