import {describe,it,expect} from 'vitest';
import {Editor} from '@tiptap/core';
import {TextSelection} from '@tiptap/pm/state';
import {DOMParser as ProseMirrorDOMParser} from '@tiptap/pm/model';
import {createDocumentExtensions} from '../../src/features/documents/tiptapDocumentExtensions';
import {documentToTiptap,documentFromTiptap} from '../../src/features/documents/tiptapDocumentAdapter';
const text=(value:string)=>[{type:'text',text:value,styles:{}}];
describe('formal Tiptap document compatibility',()=>{
 it('round trips every existing block, props, nested children, links, and table cell metadata',()=>{
  const body={formatVersion:1 as const,blocks:[
   {id:'h',type:'heading',props:{level:2,textColor:'blue',textAlignment:'center'},content:[{type:'text',text:'部署',styles:{bold:true,textColor:'red'}},{type:'link',href:'https://example.com',content:text('链接')}],children:[]},
   ...['paragraph','bulletListItem','numberedListItem','checkListItem','quote','callout','codeBlock'].map(type=>({id:type,type,props:{checked:true,language:'bash',backgroundColor:'yellow'},content:type==='codeBlock'?'echo hello':text('正文'),children:[{id:`${type}-child`,type:'paragraph',content:text('子段落')}]})),
   {id:'table',type:'table',content:{type:'tableContent',columnWidths:[120,240],headerRows:1,rows:[{cells:[text('名称'),text('地址')]},{cells:[{type:'tableCell',props:{textAlignment:'right'},content:text('应用')},text('10.0.0.1')]}]}},
   {id:'image',type:'image',props:{url:'https://example.com/image.png',caption:'部署截图',previewWidth:500,name:'图片'}},
   {id:'file',type:'file',props:{assetId:'file-1',url:'asset:file-1',name:'部署.pdf'}},
   {id:'drawing',type:'drawing',props:{drawingId:'drawing-1',mode:'pinned',revision:2,caption:'拓扑',height:320}},
   {id:'link',type:'documentLink',props:{documentId:'doc-2'}},{id:'divider',type:'divider'},
  ]};
  expect(documentFromTiptap(documentToTiptap(body))).toEqual(body);
  const editor=new Editor({extensions:createDocumentExtensions({current:{renderDrawing:()=>null,resolveMedia:async()=>'',onError:()=>{}}}),content:documentToTiptap(body)});
  try{expect(documentFromTiptap(editor.getJSON())).toEqual(body);}finally{editor.destroy();}
 });
 it('preserves internal clipboard HTML for checked items, files, images and nested metadata',()=>{
  const body={formatVersion:1 as const,blocks:[{id:'check',type:'checkListItem',props:{checked:true},content:text('部署检查'),children:[{id:'nested-image',type:'image',props:{assetId:'image-1',url:'asset:image-1',name:'截图.png'}}]},{id:'file',type:'file',props:{assetId:'file-1',url:'asset:file-1',name:'配置.txt'}}]};
  const editor=new Editor({extensions:createDocumentExtensions({current:{renderDrawing:()=>null,resolveMedia:async()=>'',onError:()=>{}}}),content:documentToTiptap(body)});
  try{const container=document.createElement('div');container.innerHTML=editor.getHTML();expect(documentFromTiptap(ProseMirrorDOMParser.fromSchema(editor.schema).parse(container).toJSON())).toEqual(body);}finally{editor.destroy();}
 });
 it('replaces selected text when Enter splits a paragraph',()=>{
  const editor=new Editor({extensions:createDocumentExtensions({current:{renderDrawing:()=>null,resolveMedia:async()=>'',onError:()=>{}}}),content:documentToTiptap({formatVersion:1,blocks:[{id:'p',type:'paragraph',content:text('ABCDEF')}]})});
  try{editor.view.dispatch(editor.state.tr.setSelection(TextSelection.create(editor.state.doc,4,6)));editor.view.someProp('handleKeyDown',handler=>handler(editor.view,new KeyboardEvent('keydown',{key:'Enter'})));expect(documentFromTiptap(editor.getJSON()).blocks.map(block=>block.content.map((part:any)=>part.text).join(''))).toEqual(['AB','EF']);}finally{editor.destroy();}
 });
 it.each([
  ['# ', 'heading', {level:1}], ['## ', 'heading', {level:2}], ['### ', 'heading', {level:3}],
  ['- ', 'bulletListItem', {}], ['* ', 'bulletListItem', {}], ['1. ', 'numberedListItem', {}],
  ['[ ] ', 'checkListItem', {checked:false}], ['- [x] ', 'checkListItem', {checked:true}],
  ['> ', 'quote', {}], ['```bash ', 'codeBlock', {language:'bash'}], ['--- ', 'divider', {}],
 ])('converts typed %s into %s while preserving the block identity', (marker,type,props)=>{
  const editor=new Editor({extensions:createDocumentExtensions({current:{renderDrawing:()=>null,resolveMedia:async()=>'',onError:()=>{}}}),content:documentToTiptap({formatVersion:1,blocks:[{id:'typed',type:'paragraph',props:{textColor:'blue'},content:[]}]})});
  try{
   for(const char of marker){const {from,to}=editor.state.selection;const handled=editor.view.someProp('handleTextInput',handler=>handler(editor.view,from,to,char,()=>editor.state.tr.insertText(char,from,to)));if(!handled) editor.view.dispatch(editor.state.tr.insertText(char,from,to));}
   const block=documentFromTiptap(editor.getJSON()).blocks[0];expect(block).toMatchObject({id:'typed',type,props:{textColor:'blue',...props}});
   expect(editor.state.doc.firstChild!.firstChild!.textContent).toBe('');
  }finally{editor.destroy();}
 });
 it('keeps existing text and marks after a divider typed at the start of a paragraph',()=>{
  const editor=new Editor({extensions:createDocumentExtensions({current:{renderDrawing:()=>null,resolveMedia:async()=>'',onError:()=>{}}}),content:documentToTiptap({formatVersion:1,blocks:[{id:'existing',type:'paragraph',content:[{type:'text',text:'important text',styles:{bold:true}}]}]})});
  try{editor.view.dispatch(editor.state.tr.setSelection(TextSelection.create(editor.state.doc,2)));for(const char of '___ '){const {from,to}=editor.state.selection;const handled=editor.view.someProp('handleTextInput',handler=>handler(editor.view,from,to,char,()=>editor.state.tr.insertText(char,from,to)));if(!handled) editor.view.dispatch(editor.state.tr.insertText(char,from,to));}
   const body=documentFromTiptap(editor.getJSON());expect(body.blocks[0].type).toBe('divider');expect(body.blocks[1].content).toEqual([{type:'text',text:'important text',styles:{bold:true}}]);editor.state.doc.check();
  }finally{editor.destroy();}
 });
 it('never persists temporary image URLs and keeps pending identity',()=>{
  const body={formatVersion:1 as const,blocks:[{id:'paste',type:'image',props:{url:'pending:paste',name:'截图.png'}}]};
  const json=documentToTiptap(body);const image=json.content![0].content![0];image.attrs!.props={...image.attrs!.props,assetId:'asset-1',url:'blob:preview'};
  expect(documentFromTiptap(json).blocks[0].props).toEqual({assetId:'asset-1',url:'asset:asset-1',name:'截图.png'});
 });
 it('rejects unknown blocks and inline objects instead of dropping them',()=>{
  expect(()=>documentToTiptap({formatVersion:1,blocks:[{id:'future',type:'unknown'}]})).toThrow('不支持');
  expect(()=>documentToTiptap({formatVersion:1,blocks:[{id:'a',type:'paragraph',content:[{type:'unknown'}]}]})).toThrow('不支持');
 });
});
