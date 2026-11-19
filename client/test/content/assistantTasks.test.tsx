import {it,expect,vi} from 'vitest';
import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
Element.prototype.scrollIntoView=vi.fn();
const state=vi.hoisted(()=>({projectId:'p1',preview:vi.fn(),import:vi.fn(),messages:[]}));
vi.mock('../../src/contexts/AuthContext',()=>({useAuth:()=>({user:{id:'u',role:'admin'}})}));
vi.mock('../../src/contexts/ProjectContext',()=>({useProjectContext:()=>({selectedProjectId:state.projectId,projects:['p1','p2','p3'].map(id=>({id,name:id,ownerId:'u'}))})}));
vi.mock('../../src/hooks/useAIChat',()=>({useAIChat:()=>({conversations:[],messages:state.messages,loading:false})}));
vi.mock('../../src/components/ui/TaskDrawer',()=>({TaskDrawer:()=>null}));
vi.mock('../../src/services/api',()=>({aiApi:{previewTasks:state.preview,importTasks:state.import}}));
vi.mock('../../src/features/content/api',()=>({documentsApi:{list:vi.fn()}}));
import {AIPanel} from '../../src/components/layout/AIPanel';
it('keeps draft attachments, preview and retry identity when the main app switches projects',async()=>{
 state.projectId='p1';state.preview.mockResolvedValue({data:{summary:'部署步骤',sourceTitle:'plan.md',tasks:[{title:'部署验证',description:'确认服务正常',type:'deploy',priority:'med',dueDate:null}]}});state.import.mockRejectedValueOnce(new Error('连接中断')).mockResolvedValueOnce({data:{count:1}});
 const app=<MemoryRouter><AIPanel isOpen onClose={()=>{}}/></MemoryRouter>;const {rerender}=render(app);fireEvent.click(screen.getByRole('button',{name:'拆任务',exact:true}));fireEvent.change(screen.getByLabelText('方案或对话'),{target:{value:'保留的方案'}});const file=new File(['部署计划'],'plan.md');fireEvent.change(screen.getByLabelText('添加附件'),{target:{files:[file]}});state.projectId='p2';rerender(<MemoryRouter><AIPanel isOpen onClose={()=>{}}/></MemoryRouter>);expect((screen.getByLabelText('方案或对话') as HTMLTextAreaElement).value).toBe('保留的方案');expect(screen.getByText('plan.md')).toBeTruthy();fireEvent.click(screen.getByRole('button',{name:'生成任务清单'}));await screen.findByLabelText('任务 1 标题');expect(state.preview.mock.calls[0][0].projectId).toBe('p1');fireEvent.click(screen.getByRole('button',{name:'加入看板（1 项）'}));await screen.findByRole('alert');state.projectId='p3';rerender(<MemoryRouter><AIPanel isOpen onClose={()=>{}}/></MemoryRouter>);expect((screen.getByLabelText('任务 1 标题') as HTMLInputElement).disabled).toBe(true);fireEvent.click(screen.getByRole('button',{name:'重试加入看板'}));await waitFor(()=>expect(screen.getByRole('status').textContent).toContain('已加入 1 项任务'));expect(state.import.mock.calls[1][0]).toEqual(state.import.mock.calls[0][0]);expect(state.import.mock.calls[1][0].projectId).toBe('p1');
});
