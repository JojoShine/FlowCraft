import {it,expect} from 'vitest';
import {parseTaskBreakdown,parseTaskBatch} from '../../src/ai/taskBreakdown';
it('accepts structured task previews and strips model-controlled project and assignee fields',()=>{
 const parsed=parseTaskBreakdown('```json\n'+JSON.stringify({summary:'两项任务',tasks:[{title:'准备环境',description:'验证服务可访问',type:'deploy',priority:'high',dueDate:null,projectId:'foreign',assigneeId:'invented'}]})+'\n```');expect(parsed.tasks[0]).toEqual({title:'准备环境',description:'验证服务可访问',type:'deploy',priority:'high',dueDate:null});
});
it('rejects malformed AI output and impossible dates instead of importing partial tasks',()=>{
 for(const result of ['not JSON',JSON.stringify({tasks:[{title:''}]}),JSON.stringify({tasks:[{title:'测试',description:'',type:'testing',priority:'high',dueDate:'2026-02-30'}]})]) expect(()=>parseTaskBreakdown(result)).toThrow();
});
it('requires a nonempty, bounded, validated reviewed task batch with an idempotency key',()=>{
 expect(()=>parseTaskBatch({projectId:'project',tasks:[]})).toThrow();expect(()=>parseTaskBatch({projectId:'project',requestId:'x',tasks:[]})).toThrow();
 expect(parseTaskBatch({projectId:'a717df13-fba4-4b09-9a76-f81598c322ba',requestId:'86682350-ff75-4f15-a9af-05fbff232634',tasks:[{title:'评审方案',description:'完成评审',type:'review',priority:'med',dueDate:'2026-11-01'}]}).tasks).toHaveLength(1);
});
