import {it,expect,vi,beforeEach} from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
const llm=vi.hoisted(()=>({complete:vi.fn()}));
vi.mock('../../src/ai/llm',()=>({chatComplete:llm.complete}));
import app from '../../src/app';
import {withContentFixture} from '../fixtures';
import {documentService} from '../../src/content/documentService';
const auth=(id:string)=>`Bearer ${jwt.sign({userId:id},process.env.JWT_SECRET!)}`;
beforeEach(()=>{llm.complete.mockReset().mockImplementation(async messages=>JSON.stringify(messages[0].content.includes('材料依据核对员')?{checks:[{line:5,evidence:['上线前进行验收'],unsupportedDetails:[],reason:'已给定的验收要求'}]}:{markdown:'# 实施方案\n\n## 环境准备\n\n上线前进行验收。'}));});
it('expands saved document structure with attachments as a preview without writing document or artifact',()=>withContentFixture(async fx=>{
 const doc=await documentService.create(fx.owner,{projectId:fx.project.id,title:'实施方案',payload:fx.body}),beforeArtifacts=await fx.db.artifact.count({where:{projectId:fx.project.id}});
 const result=await request(app).post('/api/v1/ai/document-expansion').set('Authorization',auth(fx.owner.id)).field('documentId',doc.id).field('baseVersion','1').field('text','上线前进行验收').field('instructions','按现有章节扩写').attach('files',Buffer.from('先备份，再升级'),{filename:'实施材料.md'}).expect(200);
 expect(result.body.data).toMatchObject({documentId:doc.id,baseVersion:1,title:'实施方案',markdown:'# 实施方案\n\n## 环境准备\n\n上线前进行验收。'});const prompt=llm.complete.mock.calls[0][0][1].content;expect(prompt).toContain('服务器说明');expect(prompt).toContain('上线前进行验收');expect(prompt).toContain('先备份，再升级');expect(prompt).toContain('实施材料.md');expect((await documentService.read(fx.owner,doc.id)).payload).toEqual(doc.payload);expect(await fx.db.documentRevision.count({where:{documentId:doc.id}})).toBe(1);expect(await fx.db.artifact.count({where:{projectId:fx.project.id}})).toBe(beforeArtifacts);
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
it('compresses an overlong response within the requested limit before reviewing or returning it',()=>withContentFixture(async fx=>{
 const doc=await documentService.create(fx.owner,{projectId:fx.project.id,title:'方案',payload:fx.body});llm.complete.mockReset().mockResolvedValueOnce(JSON.stringify({markdown:'# 方案\n'+ '中'.repeat(1510)})).mockResolvedValueOnce(JSON.stringify({markdown:'# 方案\n\n已提供：备份数据库。\n\n待补充'})).mockResolvedValueOnce(JSON.stringify({checks:[{line:3,evidence:['备份数据库'],unsupportedDetails:[],reason:'材料已提供备份数据库'}]}));
 const result=await request(app).post('/api/v1/ai/document-expansion').set('Authorization',auth(fx.owner.id)).send({documentId:doc.id,baseVersion:1,text:'备份数据库',instructions:'总长度控制在 1500 个汉字以内。'}).expect(200);expect((result.body.data.markdown.match(/\p{Script=Han}/gu)||[]).length).toBeLessThanOrEqual(1500);expect(result.body.data.validation).toMatchObject({max:1500,unit:'han'});expect(llm.complete.mock.calls[1][0].at(-1).content).toContain('超出');expect(await fx.db.documentRevision.count({where:{documentId:doc.id}})).toBe(1);
}));
it('rejects a still-overlong rewrite and never returns a preview that can be applied',()=>withContentFixture(async fx=>{
 const doc=await documentService.create(fx.owner,{projectId:fx.project.id,title:'方案',payload:fx.body});llm.complete.mockReset().mockResolvedValue(JSON.stringify({markdown:'中'.repeat(1510)}));const result=await request(app).post('/api/v1/ai/document-expansion').set('Authorization',auth(fx.owner.id)).send({documentId:doc.id,baseVersion:1,text:'备份数据库',instructions:'不超过1500汉字'}).expect(502);expect(result.body.data).toBeUndefined();expect(llm.complete).toHaveBeenCalledTimes(2);expect(await fx.db.documentRevision.count({where:{documentId:doc.id}})).toBe(1);
}));
it('checks only supplied materials as fact evidence, marks unsupported operations and leaves missing details pending',()=>withContentFixture(async fx=>{
 const doc=await documentService.create(fx.owner,{projectId:fx.project.id,title:'方案',payload:{formatVersion:1,blocks:[{id:fx.requestId(),type:'heading',props:{level:2},content:'切换与迁移'},{id:fx.requestId(),type:'paragraph',content:'说明旧系统切回和增量同步步骤'}]}});llm.complete.mockReset().mockResolvedValueOnce(JSON.stringify({markdown:'# 方案\n\n## 切换与迁移\n\n备份数据库。\n\n执行增量同步并切回原系统。'})).mockResolvedValueOnce(JSON.stringify({checks:[{line:5,evidence:['备份数据库'],unsupportedDetails:[],reason:'材料已提供备份数据库'},{line:7,evidence:[],unsupportedDetails:['材料未提供的操作步骤'],reason:'模板填写说明没有事实依据'}]}));
 const result=await request(app).post('/api/v1/ai/document-expansion').set('Authorization',auth(fx.owner.id)).send({documentId:doc.id,baseVersion:1,text:'唯一已确认操作：备份数据库。'}).expect(200);expect(result.body.data.markdown).toContain('待补充');expect(result.body.data.markdown).not.toMatch(/执行增量同步|切回原系统/);const review=llm.complete.mock.calls[1][0];expect(review[0].content).toContain('模板');expect(review[1].content).toContain('唯一已确认操作');expect(review[0].content).toContain('填写说明不是事实依据');expect(result.body.data.validation.unsupportedLines).toBe(1);expect(await fx.db.documentRevision.count({where:{documentId:doc.id}})).toBe(1);
}));
it('fails closed if the factual review fails or returns malformed line references',()=>withContentFixture(async fx=>{
 const doc=await documentService.create(fx.owner,{projectId:fx.project.id,title:'方案',payload:fx.body}),post=()=>request(app).post('/api/v1/ai/document-expansion').set('Authorization',auth(fx.owner.id)).send({documentId:doc.id,baseVersion:1,text:'备份数据库'});
 for(const review of ['wrong json',JSON.stringify({checks:[{line:999,evidence:[],unsupportedDetails:['材料未提供的操作步骤'],reason:'无效行号'}]}),JSON.stringify({checks:[]})]){llm.complete.mockReset().mockResolvedValueOnce(JSON.stringify({markdown:'# 方案\n\n备份数据库。'})).mockResolvedValueOnce(review);await post().expect(502);}llm.complete.mockReset().mockResolvedValueOnce(JSON.stringify({markdown:'# 方案\n\n备份数据库。'})).mockRejectedValueOnce(new Error('review unavailable'));await post().expect(502);expect(await fx.db.documentRevision.count({where:{documentId:doc.id}})).toBe(1);
}));
