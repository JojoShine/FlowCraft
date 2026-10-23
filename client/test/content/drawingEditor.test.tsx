import {it,expect,vi} from 'vitest';
import {render,screen,waitFor,act} from '@testing-library/react';
import {useEffect} from 'react';
const shared=vi.hoisted(()=>({props:null as any}));
vi.mock('@excalidraw/excalidraw',()=>({restoreLibraryItems:(items:any[])=>items.map((item,index)=>Array.isArray(item)?{id:String(index),elements:item,status:'published',created:1}:item),Excalidraw:(props:any)=>{shared.props=props;useEffect(()=>{props.onChange(props.initialData.elements,props.initialData.appState,props.initialData.files);},[]);return <div data-testid="canvas"/>;}}));
import {ExcalidrawEditor} from '../../src/features/drawings/ExcalidrawEditor';
const payload={formatVersion:1 as const,elements:[{id:'server',type:'rectangle',x:1.23456,y:2}],appState:{viewBackgroundColor:'#fff'},files:{}};
const view={id:'d',projectId:'p',version:1,title:'图',payload,canEdit:true,savedAt:'2026-10-22T00:00:00Z',deletedAt:null};
it('view-only changes do not save and edits preserve unrelated elements',async()=>{
 const change=vi.fn();render(<ExcalidrawEditor view={view} onChange={change} onComposition={()=>{}}/>);await screen.findByTestId('canvas');
 act(()=>shared.props.onChange(payload.elements,{...payload.appState,scrollX:10,zoom:{value:2}},{}));expect(change).not.toHaveBeenCalled();
 act(()=>shared.props.onChange([...payload.elements,{id:'new',type:'ellipse',x:200,y:2}],payload.appState,{}));await waitFor(()=>expect(change).toHaveBeenCalledTimes(1));expect(change.mock.calls[0][1].elements[0]).toEqual(payload.elements[0]);
});
it('viewer canvas is read-only and web embeds are disabled',async()=>{
 render(<ExcalidrawEditor view={{...view,canEdit:false}} onChange={()=>{throw new Error('viewer write');}} onComposition={()=>{}}/>);await screen.findByTestId('canvas');expect(shared.props.viewModeEnabled).toBe(true);expect(shared.props.validateEmbeddable('https://example.com')).toBe(false);
});
it('loads useful defaults and remembers library changes independently of the drawing',async()=>{
 const change=vi.fn(),scope='library-owner';localStorage.removeItem(`flowcraft:drawing-library:${scope}`);
 render(<ExcalidrawEditor libraryScope={scope} view={view} onChange={change} onComposition={()=>{}}/>);await screen.findByTestId('canvas');
 const items=await shared.props.initialData.libraryItems;expect(items.length).toBeGreaterThanOrEqual(17);expect(new Set(items.map((item:any)=>item.id)).size).toBe(items.length);
 act(()=>shared.props.onLibraryChange([items[0]]));expect(JSON.parse(localStorage.getItem(`flowcraft:drawing-library:${scope}`)!)).toHaveLength(1);expect(change).not.toHaveBeenCalled();
});
it('keeps custom libraries and removals per account after reopening',async()=>{
 const {loadDrawingLibrary,saveDrawingLibrary}=await import('../../src/features/drawings/DrawingLibrary');
 saveDrawingLibrary('alice',[]);expect(loadDrawingLibrary('alice')).toEqual([]);expect(loadDrawingLibrary('bob').length).toBe(17);
 const first=loadDrawingLibrary('bob')[0];saveDrawingLibrary('bob',[first]);expect(loadDrawingLibrary('bob')).toEqual([first]);
});
