import type {Editor} from '@tiptap/core';
import {Fragment,type Node as ProseMirrorNode,type ResolvedPos} from '@tiptap/pm/model';
import {TextSelection,type Transaction} from '@tiptap/pm/state';
const listKinds=['bulletListItem','numberedListItem','checkListItem'];
function isListItem(node:ProseMirrorNode) {return node.type.name==='flowBlock'&&node.firstChild?.type.name==='paragraph'&&listKinds.includes(node.attrs.source?.type);}
function selectionPoint(position:ResolvedPos) {
 for(let depth=position.depth;depth>0;depth--) if(position.node(depth).type.name==='flowBlock') return {id:position.node(depth).attrs.id,offset:position.pos-position.before(depth)};
 return null;
}
function appendChildren(editor:Editor,node:ProseMirrorNode,children:Fragment) {
 const existing=node.childCount>1?node.lastChild!.content:Fragment.empty;
 return node.copy(Fragment.from(node.firstChild!).append(Fragment.from(editor.schema.nodes.flowChildren.create(null,existing.append(children)))));
}
// Move existing blocks, rather than recreating their text or resource references.
export function changeListIndent(editor:Editor,outdent:boolean,tr:Transaction=editor.state.tr):boolean {
 if(!editor.isEditable||!(tr.selection instanceof TextSelection)) return false;
 const {$from,$to,$anchor,$head}=tr.selection,range=$from.blockRange($to,node=>node.type.name==='doc'||node.type.name==='flowChildren');
 if(!range) return false;
 const items:ProseMirrorNode[]=[];for(let index=range.startIndex;index<range.endIndex;index++) items.push(range.parent.child(index));
 if(!items.length||items.some(node=>!isListItem(node))) return false;
 const anchor=selectionPoint($anchor),head=selectionPoint($head);if(!anchor||!head) return false;
 if(!outdent) {
  if(range.startIndex===0) return true;
  const previous=range.parent.child(range.startIndex-1);if(!isListItem(previous)) return true;
  tr.replaceWith(range.start-previous.nodeSize,range.end,appendChildren(editor,previous,Fragment.fromArray(items)));
 }else if(range.parent.type.name==='flowChildren') {
  const parent=$from.node(range.depth-1),parentPos=$from.before(range.depth-1),contentStart=$from.start(range.depth),before=range.parent.content.cut(0,range.start-contentStart),after=range.parent.content.cut(range.end-contentStart);
  if(after.size) items[items.length-1]=appendChildren(editor,items[items.length-1],after);
  const remaining=parent.copy(Fragment.from(parent.firstChild!).append(before.size?Fragment.from(editor.schema.nodes.flowChildren.create(null,before)):Fragment.empty));
  tr.replaceWith(parentPos,parentPos+parent.nodeSize,[remaining,...items]);
 }else {
  let position=range.start;
  for(const item of items) {tr.setNodeMarkup(position,undefined,{...item.attrs,source:{...item.attrs.source,type:'paragraph'}});position+=item.nodeSize;}
 }
 const positions=new Map<string,number>();tr.doc.descendants((node,position)=>{if(node.type.name==='flowBlock') positions.set(node.attrs.id,position);});
 tr.setSelection(TextSelection.create(tr.doc,positions.get(anchor.id)!+anchor.offset,positions.get(head.id)!+head.offset));
 editor.view.dispatch(tr.scrollIntoView());return true;
}
