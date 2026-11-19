import {it,expect,vi,beforeEach} from 'vitest';
import {render,screen,fireEvent,waitFor} from '@testing-library/react';
const mocks=vi.hoisted(()=>({preview:vi.fn(),import:vi.fn(),documents:vi.fn()}));
vi.mock('../../src/services/api',()=>({aiApi:{previewTasks:mocks.preview,importTasks:mocks.import}}));
vi.mock('../../src/features/content/api',()=>({documentsApi:{list:mocks.documents}}));
import {TaskBreakdownPanel} from '../../src/features/tasks/TaskBreakdownPanel';
const tasks=[{title:'准备环境',description:'验证服务可访问',type:'deploy',priority:'high',dueDate:null},{title:'执行回归',description:'验证关键功能',type:'testing',priority:'med',dueDate:null}];
beforeEach(()=>{mocks.preview.mockReset().mockResolvedValue({data:{summary:'两个步骤',tasks,sourceTitle:'项目方案'}});mocks.import.mockReset().mockResolvedValue({data:{count:1,taskIds:['t1']}});mocks.documents.mockReset().mockResolvedValue({items:[{id:'doc1',title:'实施方案'}]});});
function open(){const close=vi.fn(),created=vi.fn();render(<TaskBreakdownPanel projects={[{id:'p1',name:'项目 A'}]} initialProjectId="p1" onClose={close} onCreated={created}/>);return {close,created};}
async function preview(){fireEvent.change(screen.getByLabelText('方案或对话'),{target:{value:'准备环境并执行回归'}});fireEvent.click(screen.getByRole('button',{name:'生成任务清单'}));await screen.findByLabelText('任务 1 标题');}
it('reviews and edits selected tasks before a single confirmed import',async()=>{
 const {created}=open();await preview();expect(mocks.import).not.toHaveBeenCalled();fireEvent.change(screen.getByLabelText('任务 1 标题'),{target:{value:'准备隔离环境'}});fireEvent.click(screen.getByLabelText('加入任务 2'));fireEvent.click(screen.getByRole('button',{name:'加入看板（1 项）'}));await waitFor(()=>expect(created).toHaveBeenCalledWith(1));expect(mocks.import.mock.calls[0][0]).toMatchObject({projectId:'p1',tasks:[{...tasks[0],title:'准备隔离环境'}]});expect(mocks.import.mock.calls[0][0].tasks[0]).not.toHaveProperty('selected');
});
it('keeps source text after a generation error and allows retry',async()=>{
 mocks.preview.mockRejectedValueOnce(new Error('AI 暂不可用'));open();fireEvent.change(screen.getByLabelText('方案或对话'),{target:{value:'需要保留的方案'}});fireEvent.click(screen.getByRole('button',{name:'生成任务清单'}));await screen.findByRole('alert');expect((screen.getByLabelText('方案或对话') as HTMLTextAreaElement).value).toBe('需要保留的方案');fireEvent.click(screen.getByRole('button',{name:'生成任务清单'}));await screen.findByLabelText('任务 1 标题');expect(mocks.preview).toHaveBeenCalledTimes(2);expect(mocks.import).not.toHaveBeenCalled();
});
it('retries an uncertain import with the same immutable request rather than creating duplicates',async()=>{
 mocks.import.mockRejectedValueOnce(new Error('网络中断'));const {created}=open();await preview();fireEvent.click(screen.getByRole('button',{name:'加入看板（2 项）'}));await screen.findByRole('alert');expect((screen.getByLabelText('任务 1 标题') as HTMLInputElement).disabled).toBe(true);fireEvent.click(screen.getByRole('button',{name:'重试加入看板'}));await waitFor(()=>expect(created).toHaveBeenCalled());expect(mocks.import.mock.calls[1][0]).toEqual(mocks.import.mock.calls[0][0]);
});
it('cancels an active AI request when the dialog closes',async()=>{
 mocks.preview.mockImplementation(()=>new Promise(()=>{}));const {close}=open();fireEvent.change(screen.getByLabelText('方案或对话'),{target:{value:'部署系统'}});fireEvent.click(screen.getByRole('button',{name:'生成任务清单'}));fireEvent.click(await screen.findByRole('button',{name:'取消生成'}));expect(close).toHaveBeenCalled();expect(mocks.preview.mock.calls[0][1].aborted).toBe(true);expect(mocks.import).not.toHaveBeenCalled();
});
it('allows clearing an AI proposed deadline before confirming import',async()=>{
 mocks.preview.mockResolvedValueOnce({data:{summary:'两个步骤',tasks:[{...tasks[0],dueDate:'2026-11-01'}],sourceTitle:'项目方案'}});const {created}=open();await preview();fireEvent.click(screen.getByRole('button',{name:'清除任务 1 截止日期'}));fireEvent.click(screen.getByRole('button',{name:'加入看板（1 项）'}));await waitFor(()=>expect(created).toHaveBeenCalled());expect(mocks.import.mock.calls[0][0].tasks[0].dueDate).toBeNull();
});
it('runs inside the assistant and supports removable attachments without source text',async()=>{
 open();expect(screen.getByRole('region',{name:'拆任务模式'})).toBeTruthy();const file=new File(['部署测试环境并验收'],'plan.md',{type:'text/markdown'});fireEvent.change(screen.getByLabelText('添加附件'),{target:{files:[file]}});expect(screen.getByText('plan.md')).toBeTruthy();expect((screen.getByRole('button',{name:'生成任务清单'}) as HTMLButtonElement).disabled).toBe(false);fireEvent.click(screen.getByRole('button',{name:'生成任务清单'}));await screen.findByLabelText('任务 1 标题');expect(mocks.preview.mock.calls[0][2]).toEqual([file]);
});
it('removes an attachment before generation and rejects unsupported files',()=>{
 open();fireEvent.change(screen.getByLabelText('添加附件'),{target:{files:[new File(['x'],'plan.md')]}});fireEvent.click(screen.getByRole('button',{name:'移除附件 plan.md'}));expect(screen.queryByText('plan.md')).toBeNull();expect((screen.getByRole('button',{name:'生成任务清单'}) as HTMLButtonElement).disabled).toBe(true);fireEvent.change(screen.getByLabelText('添加附件'),{target:{files:[new File(['x'],'script.exe')]}});expect(screen.getByRole('alert').textContent).toContain('支持');
});
