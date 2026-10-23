import {it,expect,vi} from 'vitest';
import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
Element.prototype.scrollIntoView=vi.fn();
const shared=vi.hoisted(()=>({user:{id:'u',role:'admin',projectId:null as string|null},projects:[{id:'p',name:'项目 A'}]}));
vi.mock('../../src/contexts/AuthContext',()=>({useAuth:()=>({user:shared.user})}));
vi.mock('../../src/contexts/ProjectContext',()=>({useProjectContext:()=>({selectedProjectId:'p',projects:shared.projects,projectsLoading:false})}));
vi.mock('../../src/components/ui/ConfirmDialog',()=>({useConfirm:()=>vi.fn(async()=>true)}));
const apis=vi.hoisted(()=>({list:vi.fn(async()=>({items:[],total:0,page:1,pageSize:50})),create:vi.fn(),trash:vi.fn(async()=>{}),trashList:vi.fn(async()=>({items:[],total:0,page:1,pageSize:50})),undelete:vi.fn(),preferences:vi.fn(async()=>[])}));
vi.mock('../../src/features/content/api',()=>({documentsApi:apis,drawingsApi:apis,contentPreferencesApi:{list:apis.preferences,set:vi.fn()},contentAssetsApi:{read:vi.fn()}}));
import {Documents} from '../../src/pages/Documents';
import {Drawings} from '../../src/pages/Drawings';
it('flat document center can explicitly select all projects without changing global selection',async()=>{
 shared.user={id:'u',role:'admin',projectId:null};render(<MemoryRouter><Documents/></MemoryRouter>);expect(screen.getByRole('heading',{name:'文档中心'})).toBeTruthy();fireEvent.keyDown(screen.getByRole('combobox',{name:'项目范围'}),{key:'ArrowDown'});fireEvent.click(await screen.findByRole('option',{name:'全部项目'}));await waitFor(()=>expect(apis.list).toHaveBeenLastCalledWith(expect.objectContaining({projectId:undefined}),expect.anything()));expect(screen.queryByRole('tree')).toBeNull();
});
it('viewer has no creation, upload, trash, or history controls',async()=>{
 shared.user={id:'v',role:'viewer',projectId:'p'};render(<MemoryRouter><Drawings/></MemoryRouter>);await screen.findByRole('heading',{name:'绘图中心'});expect(screen.queryByRole('button',{name:'新建绘图'})).toBeNull();expect(screen.queryByRole('button',{name:'回收站'})).toBeNull();expect(screen.queryByText('导入 Excalidraw')).toBeNull();
});
it('owner without projects gets a project creation entry',async()=>{
 shared.user={id:'u',role:'admin',projectId:null};shared.projects=[];render(<MemoryRouter><Documents/></MemoryRouter>);expect(await screen.findByRole('link',{name:'创建项目'})).toBeTruthy();shared.projects=[{id:'p',name:'项目 A'}];
});

it('owner can delete a document from its list row and the list reloads',async()=>{
 shared.user={id:'u',role:'admin',projectId:null};apis.list.mockResolvedValueOnce({items:[{id:'doc-delete',projectId:'p',title:'可删除文档',updatedAt:'2026-10-23T00:00:00Z'}] as any,total:1,page:1,pageSize:50});
 render(<MemoryRouter><Documents/></MemoryRouter>);fireEvent.click(await screen.findByRole('button',{name:'删除文档 可删除文档',exact:true}));await waitFor(()=>expect(apis.trash).toHaveBeenCalledWith('doc-delete'));await waitFor(()=>expect(screen.queryByRole('button',{name:'删除文档 可删除文档',exact:true})).toBeNull());
});
it('returns to the previous page after deleting the last item on a later page',async()=>{
 shared.user={id:'u',role:'admin',projectId:null};let deleted=false;const remaining=Array.from({length:50},(_,n)=>({id:`remaining-${n}`,projectId:'p',title:`保留文档 ${n}`,updatedAt:'2026-10-23T00:00:00Z'}));
 apis.list.mockImplementation(async(params:any)=>({items:(params.page===1?remaining:deleted?[]:[{id:'last-on-page',projectId:'p',title:'最后一项',updatedAt:'2026-10-23T00:00:00Z'}]) as any,total:deleted?50:51,page:params.page,pageSize:50}));apis.trash.mockImplementation(async()=>{deleted=true;});
 try{render(<MemoryRouter><Documents/></MemoryRouter>);await screen.findByRole('button',{name:'删除文档 保留文档 0',exact:true});fireEvent.click(screen.getByRole('button',{name:'下一页',exact:true}));fireEvent.click(await screen.findByRole('button',{name:'删除文档 最后一项',exact:true}));await screen.findByRole('button',{name:'删除文档 保留文档 0',exact:true});expect(apis.list).toHaveBeenLastCalledWith(expect.objectContaining({page:1}),expect.anything());}finally{apis.list.mockImplementation(async()=>({items:[],total:0,page:1,pageSize:50}));apis.trash.mockImplementation(async()=>{});}
});
