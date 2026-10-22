import {it,expect,vi} from 'vitest';
import {render,screen,fireEvent} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {DocumentEditor} from '../../src/features/documents/DocumentEditor';
it('viewer gets read-only text and cannot toggle checkboxes',async()=>{
 const change=vi.fn();const view={id:'doc',projectId:'p',version:1,title:'服务器说明',payload:{formatVersion:1 as const,blocks:[{id:'check',type:'checkListItem',props:{checked:false},content:[{type:'text',text:'检查部署',styles:{}}]}]},canEdit:false,savedAt:'2026-10-22T00:00:00Z',deletedAt:null};
 const {container}=render(<MemoryRouter><DocumentEditor view={view} onChange={change} onComposition={()=>{}} renderDrawing={()=>null}/></MemoryRouter>);
 expect(screen.getByText('服务器说明')).toBeTruthy();expect(container.querySelector('[contenteditable="true"]')).toBeNull();const checkbox=await screen.findByRole('checkbox');fireEvent.click(checkbox);expect(change).not.toHaveBeenCalled();
});

it('code blocks render text and provide a working copy action in reading mode',async()=>{
 const writeText=vi.fn(async()=>{});Object.defineProperty(navigator,'clipboard',{value:{writeText},configurable:true});
 const view={id:'code-doc',projectId:'p',version:1,title:'手册',payload:{formatVersion:1 as const,blocks:[{id:'code',type:'codeBlock',props:{language:'bash'},content:'echo hello'}]},canEdit:false,savedAt:'2026-10-22T00:00:00Z',deletedAt:null};
 render(<MemoryRouter><DocumentEditor view={view} onChange={()=>{}} onComposition={()=>{}} renderDrawing={()=>null}/></MemoryRouter>);
 fireEvent.click(await screen.findByRole('button',{name:'复制代码'}));expect(writeText).toHaveBeenCalledWith('echo hello');
});
