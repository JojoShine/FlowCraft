import {it,expect,vi} from 'vitest';
import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
const shared=vi.hoisted(()=>({user:{id:'u',role:'admin',projectId:null as string|null},projects:[{id:'p',name:'项目 A'}]}));
vi.mock('../../src/contexts/AuthContext',()=>({useAuth:()=>({user:shared.user})}));
vi.mock('../../src/contexts/ProjectContext',()=>({useProjectContext:()=>({selectedProjectId:'p',projects:shared.projects,projectsLoading:false})}));
vi.mock('../../src/components/ui/ConfirmDialog',()=>({useConfirm:()=>vi.fn(async()=>true)}));
const apis=vi.hoisted(()=>({list:vi.fn(async()=>({items:[],total:0,page:1,pageSize:50})),create:vi.fn(),trashList:vi.fn(async()=>({items:[],total:0,page:1,pageSize:50})),undelete:vi.fn(),preferences:vi.fn(async()=>[])}));
vi.mock('../../src/features/content/api',()=>({documentsApi:apis,drawingsApi:apis,contentPreferencesApi:{list:apis.preferences,set:vi.fn()},contentAssetsApi:{read:vi.fn()}}));
import {Documents} from '../../src/pages/Documents';
import {Drawings} from '../../src/pages/Drawings';
it('flat document center can explicitly select all projects without changing global selection',async()=>{
 shared.user={id:'u',role:'admin',projectId:null};render(<MemoryRouter><Documents/></MemoryRouter>);expect(screen.getByRole('heading',{name:'文档中心'})).toBeTruthy();fireEvent.change(screen.getByLabelText('项目范围'),{target:{value:'all'}});await waitFor(()=>expect(apis.list).toHaveBeenLastCalledWith(expect.objectContaining({projectId:undefined}),expect.anything()));expect(screen.queryByRole('tree')).toBeNull();
});
it('viewer has no creation, upload, trash, or history controls',async()=>{
 shared.user={id:'v',role:'viewer',projectId:'p'};render(<MemoryRouter><Drawings/></MemoryRouter>);await screen.findByRole('heading',{name:'绘图中心'});expect(screen.queryByRole('button',{name:'新建绘图'})).toBeNull();expect(screen.queryByRole('button',{name:'回收站'})).toBeNull();expect(screen.queryByText('导入 Excalidraw')).toBeNull();
});
it('owner without projects gets a project creation entry',async()=>{
 shared.user={id:'u',role:'admin',projectId:null};shared.projects=[];render(<MemoryRouter><Documents/></MemoryRouter>);expect(await screen.findByRole('link',{name:'创建项目'})).toBeTruthy();shared.projects=[{id:'p',name:'项目 A'}];
});
