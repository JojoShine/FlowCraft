import {it,expect,vi,beforeEach} from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
const llm=vi.hoisted(()=>({complete:vi.fn()}));
vi.mock('../../src/ai/llm',()=>({chatComplete:llm.complete}));
import app from '../../src/app';
import {withContentFixture} from '../fixtures';
import {documentService} from '../../src/content/documentService';
const auth=(id:string)=>`Bearer ${jwt.sign({userId:id},process.env.JWT_SECRET!)}`;
const tasks=[{title:'准备环境',description:'安装依赖并验证服务可访问',type:'deploy',priority:'high',dueDate:null},{title:'验证发布',description:'执行回归并保存验证结果',type:'testing',priority:'med',dueDate:'2026-11-01'}];
beforeEach(()=>{llm.complete.mockReset();llm.complete.mockResolvedValue(JSON.stringify({summary:'两个步骤',tasks}));});
it('AI preview reads only the owned project material and never creates tasks',()=>withContentFixture(async fx=>{
 const preview=await request(app).post('/api/v1/ai/task-breakdown').set('Authorization',auth(fx.owner.id)).send({projectId:fx.project.id,text:'准备测试环境并验证发布',instructions:'注明验收标准'}).expect(200);expect(preview.body.data.tasks).toEqual(tasks);expect(await fx.db.task.count({where:{projectId:fx.project.id}})).toBe(0);expect(llm.complete.mock.calls[0][0][1].content).toContain('注明验收标准');
 const doc=await documentService.create(fx.owner,{projectId:fx.project.id,title:'实施方案',payload:fx.body});await request(app).post('/api/v1/ai/task-breakdown').set('Authorization',auth(fx.owner.id)).send({projectId:fx.project.id,documentId:doc.id}).expect(200);expect(llm.complete.mock.calls[1][0][1].content).toContain('服务器说明');
}));
it('denies viewers, foreign projects and foreign documents before using AI',()=>withContentFixture(async fx=>{
 const foreign=await documentService.create(fx.otherOwner,{projectId:fx.otherProject.id,title:'私有方案',payload:fx.body});
 await request(app).post('/api/v1/ai/task-breakdown').set('Authorization',auth(fx.viewer.id)).send({projectId:fx.project.id,text:'分析'}).expect(403);
 await request(app).post('/api/v1/ai/task-breakdown').set('Authorization',auth(fx.owner.id)).send({projectId:fx.otherProject.id,text:'分析'}).expect(403);
 await request(app).post('/api/v1/ai/task-breakdown').set('Authorization',auth(fx.owner.id)).send({projectId:fx.project.id,documentId:foreign.id}).expect(404);
 await request(app).post('/api/v1/ai/task-breakdown').set('Authorization',auth(fx.owner.id)).send({projectId:fx.project.id,text:'x',documentId:foreign.id}).expect(400);expect(llm.complete).not.toHaveBeenCalled();
}));
it('imports reviewed tasks atomically and replays retries without duplicates',()=>withContentFixture(async fx=>{
 const input={projectId:fx.project.id,requestId:fx.requestId(),tasks};const post=(data:any)=>request(app).post('/api/v1/ai/task-breakdown/import').set('Authorization',auth(fx.owner.id)).send(data);
 await post({...input,tasks:[tasks[0],{...tasks[1],dueDate:'2026-02-30'}]}).expect(400);expect(await fx.db.task.count({where:{projectId:fx.project.id}})).toBe(0);
 const created=await post(input).expect(200),retry=await post(input).expect(200);expect(retry.body.data).toEqual(created.body.data);expect(created.body.data.count).toBe(2);expect(await fx.db.task.count({where:{projectId:fx.project.id,column:'todo',status:'todo',assigneeId:null}})).toBe(2);
 await post({...input,tasks:[{...tasks[0],title:'换一项'}]}).expect(409);const next={...input,requestId:fx.requestId()};const concurrent=await Promise.all([post(next),post(next)]);expect(concurrent.map(result=>result.status)).toEqual([200,200]);expect(concurrent[0].body.data).toEqual(concurrent[1].body.data);expect(await fx.db.task.count({where:{projectId:fx.project.id}})).toBe(4);
 await request(app).post('/api/v1/ai/task-breakdown/import').set('Authorization',auth(fx.viewer.id)).send({...input,requestId:fx.requestId()}).expect(403);await post({...input,requestId:fx.requestId(),projectId:fx.otherProject.id}).expect(403);expect(await fx.db.task.count({where:{projectId:fx.otherProject.id}})).toBe(0);
}));
it('returns a retryable provider failure without creating any task',()=>withContentFixture(async fx=>{
 llm.complete.mockRejectedValueOnce(new Error('provider unavailable'));await request(app).post('/api/v1/ai/task-breakdown').set('Authorization',auth(fx.owner.id)).send({projectId:fx.project.id,text:'部署系统'}).expect(502);expect(await fx.db.task.count({where:{projectId:fx.project.id}})).toBe(0);
}));
it('accepts a reviewed Chinese task batch within the declared field limits',()=>withContentFixture(async fx=>{
 const input={projectId:fx.project.id,requestId:fx.requestId(),tasks:Array.from({length:12},(_,index)=>({...tasks[0],title:`实施任务 ${index+1}`,description:'中'.repeat(3000)}))};const result=await request(app).post('/api/v1/ai/task-breakdown/import').set('Authorization',auth(fx.owner.id)).send(input).expect(200);expect(result.body.data.count).toBe(12);expect(await fx.db.task.count({where:{projectId:fx.project.id}})).toBe(12);
}));
it('extracts uploaded text and Word attachments together with the selected project document',()=>withContentFixture(async fx=>{
 const htmlToDocx=(await import('html-to-docx')).default;const word=await htmlToDocx('<p>Prepare deployment and verify acceptance</p>') as Buffer;
 const doc=await documentService.create(fx.owner,{projectId:fx.project.id,title:'实施方案',payload:fx.body});
 const result=await request(app).post('/api/v1/ai/task-breakdown').set('Authorization',auth(fx.owner.id)).field('projectId',fx.project.id).field('documentId',doc.id).field('instructions','按阶段拆分').attach('files',Buffer.from('# 验收\n补充安全验证'),{filename:'验收方案.md',contentType:'text/markdown'}).attach('files',word,{filename:'plan.docx',contentType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'}).expect(200);
 expect(result.body.data.tasks).toEqual(tasks);const material=llm.complete.mock.calls[0][0][1].content;expect(material).toContain('服务器说明');expect(material).toContain('补充安全验证');expect(material).toContain('Prepare deployment');expect(material).toContain('验收方案.md');expect(await fx.db.task.count({where:{projectId:fx.project.id}})).toBe(0);
}));
it('accepts attachments alone and rejects unreadable, oversized or unauthorized attachments before AI',()=>withContentFixture(async fx=>{
 const post=()=>request(app).post('/api/v1/ai/task-breakdown').set('Authorization',auth(fx.owner.id)).field('projectId',fx.project.id);
 await post().attach('files',Buffer.from('Deploy and test the system'),{filename:'plan.txt'}).expect(200);expect(llm.complete.mock.calls[0][0][1].content).toContain('Deploy and test');llm.complete.mockClear();
 await post().attach('files',Buffer.from('binary'),{filename:'run.exe'}).expect(400);
 await post().attach('files',Buffer.from('broken Word'),{filename:'broken.docx'}).expect(400);
 await post().attach('files',Buffer.alloc(5*1024*1024+1),{filename:'large.txt'}).expect(413);
 await post().attach('files',Buffer.from(' '.repeat(100)),{filename:'empty.txt'}).expect(400);
 await post().attach('files',Buffer.from('字'.repeat(30001)),{filename:'long.md'}).expect(400);
 await request(app).post('/api/v1/ai/task-breakdown').set('Authorization',auth(fx.owner.id)).field('projectId',fx.otherProject.id).attach('files',Buffer.from('Secret'),{filename:'plan.txt'}).expect(403);
 await request(app).post('/api/v1/ai/task-breakdown').set('Authorization',auth(fx.viewer.id)).field('projectId',fx.project.id).attach('files',Buffer.from('Test'),{filename:'plan.txt'}).expect(403);expect(llm.complete).not.toHaveBeenCalled();
}));
it('extracts a real text PDF and rejects a corrupt PDF before invoking AI',()=>withContentFixture(async fx=>{
 const stream='BT /F1 12 Tf 40 200 Td (Deploy staging and run acceptance tests) Tj ET';
 const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 300] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'];
 let pdf='%PDF-1.4\n';const offsets=[0];for(const [index,object] of objects.entries()){offsets.push(Buffer.byteLength(pdf));pdf+=`${index+1} 0 obj\n${object}\nendobj\n`;}const xref=Buffer.byteLength(pdf);pdf+=`xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map(offset=>String(offset).padStart(10,'0')+' 00000 n \n').join('')}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
 const post=()=>request(app).post('/api/v1/ai/task-breakdown').set('Authorization',auth(fx.owner.id)).field('projectId',fx.project.id);
 await post().attach('files',Buffer.from(pdf),{filename:'deployment.pdf',contentType:'application/pdf'}).expect(200);expect(llm.complete.mock.calls[0][0][1].content).toContain('Deploy staging and run acceptance tests');llm.complete.mockClear();await post().attach('files',Buffer.from('broken PDF'),{filename:'broken.pdf'}).expect(400);expect(llm.complete).not.toHaveBeenCalled();
}));
