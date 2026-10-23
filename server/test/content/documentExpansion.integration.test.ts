import {it,expect,vi,beforeEach} from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
const llm=vi.hoisted(()=>({complete:vi.fn()}));
vi.mock('../../src/ai/llm',()=>({chatComplete:llm.complete}));
import app from '../../src/app';
import {withContentFixture} from '../fixtures';
import {documentService} from '../../src/content/documentService';
const auth=(id:string)=>`Bearer ${jwt.sign({userId:id},process.env.JWT_SECRET!)}`;
beforeEach(()=>llm.complete.mockReset().mockResolvedValue(JSON.stringify({markdown:'# 实施方案\n\n## 环境准备\n\n先检查资源与网络。'})));
it('expands saved document structure with attachments as a preview without writing document or artifact',()=>withContentFixture(async fx=>{
 const doc=await documentService.create(fx.owner,{projectId:fx.project.id,title:'实施方案',payload:fx.body}),beforeArtifacts=await fx.db.artifact.count({where:{projectId:fx.project.id}});
 const result=await request(app).post('/api/v1/ai/document-expansion').set('Authorization',auth(fx.owner.id)).field('documentId',doc.id).field('baseVersion','1').field('text','上线前进行验收').field('instructions','按现有章节扩写').attach('files',Buffer.from('先备份，再升级'),{filename:'实施材料.md'}).expect(200);
 expect(result.body.data).toEqual({documentId:doc.id,baseVersion:1,title:'实施方案',markdown:'# 实施方案\n\n## 环境准备\n\n先检查资源与网络。'});const prompt=llm.complete.mock.calls[0][0][1].content;expect(prompt).toContain('服务器说明');expect(prompt).toContain('上线前进行验收');expect(prompt).toContain('先备份，再升级');expect(prompt).toContain('实施材料.md');expect((await documentService.read(fx.owner,doc.id)).payload).toEqual(doc.payload);expect(await fx.db.documentRevision.count({where:{documentId:doc.id}})).toBe(1);expect(await fx.db.artifact.count({where:{projectId:fx.project.id}})).toBe(beforeArtifacts);
}));
it('rejects viewers, foreign or deleted documents and stale versions before calling AI',()=>withContentFixture(async fx=>{
 const doc=await documentService.create(fx.owner,{projectId:fx.project.id,title:'方案',payload:fx.body}),post=(id:string,body:any)=>request(app).post('/api/v1/ai/document-expansion').set('Authorization',auth(id)).send(body),input={documentId:doc.id,baseVersion:1,text:'扩写'};
 await post(fx.viewer.id,input).expect(403);await post(fx.otherOwner.id,input).expect(404);await post(fx.owner.id,{...input,baseVersion:2}).expect(409);await fx.db.document.update({where:{id:doc.id},data:{deletedAt:new Date()}});await post(fx.owner.id,input).expect(404);expect(llm.complete).not.toHaveBeenCalled();
}));
it('rejects invalid model output and provider failures without saving a revision',()=>withContentFixture(async fx=>{
 const doc=await documentService.create(fx.owner,{projectId:fx.project.id,title:'方案',payload:fx.body}),post=()=>request(app).post('/api/v1/ai/document-expansion').set('Authorization',auth(fx.owner.id)).send({documentId:doc.id,baseVersion:1,text:'具体扩写要求'});
 for(const response of ['not json',JSON.stringify({markdown:''}),JSON.stringify({markdown:'x'.repeat(120001)})]){llm.complete.mockResolvedValueOnce(response);await post().expect(502);}llm.complete.mockRejectedValueOnce(new Error('secret upstream details'));const failure=await post().expect(502);expect(JSON.stringify(failure.body)).not.toContain('secret upstream');expect(await fx.db.documentRevision.count({where:{documentId:doc.id}})).toBe(1);
}));
it('rejects invalid or oversized source material and attachments',()=>withContentFixture(async fx=>{
 const doc=await documentService.create(fx.owner,{projectId:fx.project.id,title:'方案',payload:fx.body}),post=()=>request(app).post('/api/v1/ai/document-expansion').set('Authorization',auth(fx.owner.id));
 await post().send({documentId:doc.id,baseVersion:1,text:'x'.repeat(30001)}).expect(400);await post().send({documentId:doc.id,baseVersion:0,text:'扩写'}).expect(400);await post().field('documentId',doc.id).field('baseVersion','1').attach('files',Buffer.from('x'),{filename:'wrong.exe'}).expect(400);expect(llm.complete).not.toHaveBeenCalled();
}));
