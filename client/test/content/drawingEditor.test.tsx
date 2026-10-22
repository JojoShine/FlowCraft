import {it,expect,vi} from 'vitest';
import {render,screen,waitFor,act} from '@testing-library/react';
import {useEffect} from 'react';
const shared=vi.hoisted(()=>({props:null as any}));
vi.mock('@excalidraw/excalidraw',()=>({Excalidraw:(props:any)=>{shared.props=props;useEffect(()=>{props.onChange(props.initialData.elements,props.initialData.appState,props.initialData.files);},[]);return <div data-testid="canvas"/>;}}));
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
