import {describe,it,expect} from 'vitest';
import {Editor} from '@tiptap/core';
import {TextSelection} from '@tiptap/pm/state';
import {createDocumentExtensions} from '../../src/features/documents/tiptapDocumentExtensions';
import {documentToTiptap,documentFromTiptap} from '../../src/features/documents/tiptapDocumentAdapter';
import type {BlockJSON} from '../../src/features/content/types';
const item=(id:string,type='numberedListItem',children?:BlockJSON[]):BlockJSON=>({id,type,props:type==='checkListItem'?{checked:true}:{},content:[{type:'text',text:id,styles:{bold:true}}],...(children?{children}:{})});
function create(blocks:BlockJSON[]){return new Editor({extensions:createDocumentExtensions({current:{renderDrawing:()=>null,resolveMedia:async()=>'',onError:()=>{}}}),content:documentToTiptap({formatVersion:1,blocks})});}
function pos(editor:Editor,id:string,offset=0){let found=-1;editor.state.doc.descendants((node,at)=>{if(node.type.name==='flowBlock'&&node.attrs.id===id) found=at+2+offset;});if(found<0) throw new Error(id);return found;}
function select(editor:Editor,id:string,endId=id){editor.view.dispatch(editor.state.tr.setSelection(TextSelection.create(editor.state.doc,pos(editor,id),pos(editor,endId,endId===id?0:endId.length))));}
function key(editor:Editor,key:string,shiftKey=false){return editor.view.someProp('handleKeyDown',handler=>handler(editor.view,new KeyboardEvent('keydown',{key,shiftKey})));}
const blocks=(editor:Editor)=>documentFromTiptap(editor.getJSON()).blocks;
describe('document list keyboard editing',()=>{
 it.each(['bulletListItem','numberedListItem','checkListItem'])('indents %s with its descendants, preserves selection, and supports undo',type=>{
  const original=[item('a',type),item('b',type,[{id:'attachment',type:'file',props:{assetId:'asset-1',url:'asset:asset-1',name:'部署.pdf'}}]),item('c',type)],editor=create(original);
  try{select(editor,'b');expect(key(editor,'Tab')).toBe(true);expect(blocks(editor)).toEqual([{...original[0],children:[original[1]]},original[2]]);expect(editor.state.selection.$from.parent.textContent).toBe('b');editor.state.doc.check();editor.commands.undo();expect(blocks(editor)).toEqual(original);editor.commands.redo();expect(blocks(editor)[0].children?.[0]).toEqual(original[1]);}finally{editor.destroy();}
 });
 it('indents selected sibling items after existing children without losing their selected text',()=>{
  const editor=create([item('a','numberedListItem',[item('old')]),item('b'),item('c'),item('d')]);
  try{select(editor,'b','c');expect(key(editor,'Tab')).toBe(true);expect(blocks(editor).map(b=>b.id)).toEqual(['a','d']);expect(blocks(editor)[0].children?.map(b=>b.id)).toEqual(['old','b','c']);expect(editor.state.doc.textBetween(editor.state.selection.from,editor.state.selection.to,' ')).toContain('c');editor.state.doc.check();}finally{editor.destroy();}
 });
 it('outdents a middle child and keeps later siblings below it in reading order',()=>{
  const nested=[item('a'),item('b','numberedListItem',[item('own')]),item('c')],editor=create([item('parent','numberedListItem',nested),item('next')]);
  try{select(editor,'b');expect(key(editor,'Tab',true)).toBe(true);expect(blocks(editor).map(b=>b.id)).toEqual(['parent','b','next']);expect(blocks(editor)[0].children?.map(b=>b.id)).toEqual(['a']);expect(blocks(editor)[1].children?.map(b=>b.id)).toEqual(['own','c']);expect(key(editor,'Tab',true)).toBe(true);expect(blocks(editor)[1].type).toBe('paragraph');expect(blocks(editor)[1].children?.map(b=>b.id)).toEqual(['own','c']);editor.state.doc.check();}finally{editor.destroy();}
 });
 it('lifts an empty nested item on Enter and exits the root list on another Enter',()=>{
  const empty={...item('empty'),content:[]},editor=create([item('parent','bulletListItem',[empty])]);
  try{select(editor,'empty');expect(key(editor,'Enter')).toBe(true);expect(blocks(editor).map(b=>b.id)).toEqual(['parent','empty']);expect(blocks(editor)[1].type).toBe('numberedListItem');expect(key(editor,'Enter')).toBe(true);expect(blocks(editor)[1].type).toBe('paragraph');editor.state.doc.check();}finally{editor.destroy();}
 });
 it('numbers consecutive siblings independently at each depth and recomputes after indenting',()=>{
  const editor=create([item('a','numberedListItem',[item('inner1'),item('inner2')]),item('b'),item('break','paragraph'),item('restart')]);
  const numbers=()=>{const result:Record<string,number>={};editor.state.doc.descendants(node=>{if(node.type.name==='flowBlock') result[node.attrs.id]=node.attrs.listNumber;});return result;};
  try{expect(numbers()).toMatchObject({a:1,b:2,inner1:1,inner2:2,restart:1});select(editor,'b');key(editor,'Tab');expect(numbers()).toMatchObject({a:1,b:3,inner1:1,inner2:2,restart:1});select(editor,'inner1');key(editor,'Tab',true);expect(numbers()).toMatchObject({a:1,inner1:2,inner2:1,b:2});editor.state.doc.check();}finally{editor.destroy();}
 });
 it('keeps the first item in place on Tab and leaves normal paragraphs alone',()=>{
  const original=[item('a'),item('p','paragraph')],editor=create(original);
  try{select(editor,'a');expect(key(editor,'Tab')).toBe(true);expect(blocks(editor)).toEqual(original);select(editor,'p');expect(key(editor,'Tab')).not.toBe(true);expect(blocks(editor)).toEqual(original);}finally{editor.destroy();}
 });
});
