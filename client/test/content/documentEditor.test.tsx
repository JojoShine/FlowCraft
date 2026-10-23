import {it,expect,vi} from 'vitest';
import {render,screen,fireEvent} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
Element.prototype.scrollIntoView=vi.fn();
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

it('programmatic draft restoration displays the body without emitting an edit',async()=>{
 const change=vi.fn(),base={id:'restore-doc',projectId:'p',version:1,title:'说明',payload:{formatVersion:1 as const,blocks:[{id:'p',type:'paragraph',content:'旧内容'}]},canEdit:true,savedAt:'2026-10-22T00:00:00Z',deletedAt:null};
 const {rerender}=render(<MemoryRouter><DocumentEditor view={base} onChange={change} onComposition={()=>{}} renderDrawing={()=>null}/></MemoryRouter>);change.mockClear();
 rerender(<MemoryRouter><DocumentEditor view={{...base,payload:{formatVersion:1,blocks:[{id:'p',type:'paragraph',content:'恢复草稿'}]}}} onChange={change} onComposition={()=>{}} renderDrawing={()=>null}/></MemoryRouter>);
 expect(await screen.findByText('恢复草稿')).toBeTruthy();expect(change).not.toHaveBeenCalled();
});

it('deletes only the active table, preserves surrounding text, and allows undo',async()=>{
 const {act}=await import('@testing-library/react');const change=vi.fn();const view={id:'table-delete',projectId:'p',version:1,title:'表格说明',payload:{formatVersion:1 as const,blocks:[{id:'before',type:'paragraph',content:'表前'},{id:'table',type:'table',content:{type:'tableContent',rows:[{cells:[[{type:'text',text:'表内',styles:{}}]]}]}},{id:'after',type:'paragraph',content:'表后'}]},canEdit:true,savedAt:'2026-10-22T00:00:00Z',deletedAt:null};
 render(<MemoryRouter><DocumentEditor view={view} onChange={change} onComposition={()=>{}} renderDrawing={()=>null}/></MemoryRouter>);const root=await screen.findByRole('textbox',{name:'文档正文'}),editor=(root as any).editor;let position=0;editor.state.doc.descendants((node:any,at:number)=>{if(node.type.name==='paragraph'&&node.textContent==='表内') position=at+1;});act(()=>editor.commands.setTextSelection(position));
 const remove=await screen.findByRole('button',{name:'删除表格',exact:true});fireEvent.mouseDown(remove);fireEvent.click(remove);expect(root.querySelector('table')).toBeNull();expect(root.textContent).toContain('表前');expect(root.textContent).toContain('表后');expect(change.mock.calls.at(-1)![1].blocks.some((b:any)=>b.type==='table')).toBe(false);act(()=>editor.commands.undo());expect(root.querySelector('table')).not.toBeNull();
});
it('keeps the selected text inside the converted heading when changing paragraph style',async()=>{
 const {act,waitFor}=await import('@testing-library/react');const view={id:'format-selection',projectId:'p',version:1,title:'格式验证',payload:{formatVersion:1 as const,blocks:[{id:'format',type:'paragraph',content:'abcdef'}]},canEdit:true,savedAt:'2026-10-24T00:00:00Z',deletedAt:null};render(<MemoryRouter><DocumentEditor view={view} onChange={()=>{}} onComposition={()=>{}} renderDrawing={()=>null}/></MemoryRouter>);const root=await screen.findByRole('textbox',{name:'文档正文'}),editor=(root as any).editor;act(()=>editor.commands.setTextSelection({from:3,to:5}));fireEvent.keyDown(screen.getByRole('combobox',{name:'段落样式'}),{key:'ArrowDown'});fireEvent.click(await screen.findByRole('option',{name:'三级标题',exact:true}));await waitFor(()=>expect(root.querySelector('h3')?.textContent).toBe('abcdef'));expect(editor.state.selection.$from.parent.type.name).toBe('heading');expect(editor.state.doc.textBetween(editor.state.selection.from,editor.state.selection.to)).toBe('bc');
});
it('inserts a drawing after the active table without putting unsupported blocks inside its cells',async()=>{
 const {act,waitFor}=await import('@testing-library/react');const change=vi.fn(),chooseDrawing=vi.fn(async()=>({blockId:'inserted-drawing',drawingId:'drawing-id',mode:'latest' as const}));const table={id:'table',type:'table',content:{type:'tableContent',headerRows:1,rows:[{cells:[[{type:'text',text:'保留表头',styles:{}}]]},{cells:[[{type:'text',text:'保留单元格',styles:{}}]]}]}};const view={id:'insert-after-table',projectId:'p',version:1,title:'表格与绘图',payload:{formatVersion:1 as const,blocks:[table]},canEdit:true,savedAt:'2026-10-24T00:00:00Z',deletedAt:null};
 render(<MemoryRouter><DocumentEditor view={view} onChange={change} onComposition={()=>{}} renderDrawing={()=>null} chooseDrawing={chooseDrawing}/></MemoryRouter>);const root=await screen.findByRole('textbox',{name:'文档正文'}),editor=(root as any).editor;let position=0;editor.state.doc.descendants((node:any,at:number)=>{if(node.type.name==='paragraph'&&node.textContent==='保留单元格') position=at+1;});act(()=>editor.commands.setTextSelection(position));fireEvent.click(screen.getByRole('button',{name:'插入绘图',exact:true}));
 await waitFor(()=>expect(change).toHaveBeenCalled());const body=change.mock.calls.at(-1)![1];expect(body.blocks.map((block:any)=>block.type)).toEqual(['table','drawing','paragraph']);expect(body.blocks[0].content).toEqual(table.content);expect(root.querySelector('table [data-id="inserted-drawing"]')).toBeNull();expect(screen.queryByRole('alert')).toBeNull();
});
