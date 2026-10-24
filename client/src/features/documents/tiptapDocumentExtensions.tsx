import {useEffect,useState,type ReactNode,type MutableRefObject} from 'react';
import {Node,Mark,InputRule,type Editor} from '@tiptap/core';
import {Plugin,TextSelection,type Transaction} from '@tiptap/pm/state';
import {NodeViewWrapper,NodeViewContent,ReactNodeViewRenderer,type NodeViewProps} from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {Table,TableRow,TableCell,TableHeader} from '@tiptap/extension-table';
import {DocumentLinkBlock} from './DocumentLinkBlock';
import {safeLinkUrl} from './linkSafety';
import {changeListIndent} from './tiptapListEditing';
import type {DrawingReference} from '../content/types';
export interface DocumentNodeServices {renderDrawing:(ref:DrawingReference)=>ReactNode;renderDocumentLink?:(documentId:string)=>ReactNode;resolveMedia:(id:string,props:Record<string,any>)=>Promise<string>;onError:(message:string)=>void}
export function selectedFlowBlock(editor:Editor,selection=editor.state.selection) {
 const {$from}=selection;for(let depth=$from.depth;depth>0;depth--) if($from.node(depth).type.name==='flowBlock') return {node:$from.node(depth),pos:$from.before(depth),depth};return null;
}
export function flowColor(value:string|undefined,background=false) {
 if(!value||value==='default') return undefined;
 const colors:Record<string,string>={gray:'#71717a',brown:'#9a6e50',red:'#dc2626',orange:'#ea580c',yellow:'#ca8a04',green:'#16a34a',blue:'#2563eb',purple:'#9333ea',pink:'#db2777'};
 const color=colors[value]||value;return background&&colors[value]?`color-mix(in srgb, ${color} 12%, var(--surface))`:color;
}
function readJSON(element:HTMLElement,name:string,fallback:any={}) {try{const value=JSON.parse(element.getAttribute(name)||'null');return value&&typeof value==='object'&&!Array.isArray(value)?value:fallback;}catch{return fallback;}}
function jsonAttribute(name:string,fallback:any={}) {return {default:fallback,parseHTML:(element:HTMLElement)=>readJSON(element,name,fallback),renderHTML:(attrs:any)=>({[name]:JSON.stringify(attrs[name==='data-flow-table'?'flowTable':name==='data-flow-row'?'flowRow':'flowCell'])})};}
function applyMarkdownBlock(editor:Editor,tr:Transaction,from:number,to:number,kind:string,attributes:Record<string,any>) {
    const selected=selectedFlowBlock(editor,tr.selection);if(!selected||tr.selection.$from.depth!==selected.depth+1||selected.node.firstChild?.type.name!=='paragraph') return false;
    const {node,pos}=selected,props={...node.attrs.source?.props,...attributes};tr.delete(from,to);
    tr.setNodeMarkup(pos,undefined,{...node.attrs,source:{...node.attrs.source,type:kind,props}});
    if(['bulletListItem','numberedListItem','checkListItem'].includes(kind)) return true;
    const first=tr.doc.nodeAt(pos+1)!;let child;
    if(kind==='quote') child=editor.schema.nodes.blockquote.create(null,editor.schema.nodes.paragraph.create(null,first.content));
    else if(kind==='divider') child=editor.schema.nodes.horizontalRule.create();
    else child=editor.schema.nodes[kind].create(kind==='heading'?{level:props.level}:{language:props.language||null},first.content);
    tr.replaceWith(pos+1,pos+1+first.nodeSize,child);
    if(kind==='divider') {const next=editor.schema.nodes.flowBlock.create({id:crypto.randomUUID(),source:{type:'paragraph',props:node.attrs.source?.props||{}}},editor.schema.nodes.paragraph.create(null,first.content));const after=pos+tr.doc.nodeAt(pos)!.nodeSize;tr.insert(after,next);tr.setSelection(TextSelection.create(tr.doc,after+2));}
    else tr.setSelection(TextSelection.create(tr.doc,pos+(kind==='quote'?3:2)));
 return true;
}
export function createDocumentExtensions(services:MutableRefObject<DocumentNodeServices>) {
 const FlowBlock=Node.create({name:'flowBlock',priority:1000,group:'block',content:'(paragraph|heading|codeBlock|blockquote|flowCallout|table|flowImage|flowFile|flowDrawing|flowDocumentLink|horizontalRule) flowChildren?',draggable:true,defining:true,
  addAttributes(){return {id:{default:null,rendered:false},listNumber:{default:0,rendered:false},source:{default:{},rendered:false},hasContent:{default:true,rendered:false},hasChildren:{default:false,rendered:false},contentShape:{default:'array',rendered:false},originalContent:{default:null,rendered:false}};},
  parseHTML(){return [{tag:'div[data-flow-block]',contentElement:element=>element.querySelector('.flow-block-body')||element,getAttrs:element=>readJSON(element as HTMLElement,'data-flow-block')}];},renderHTML({node}){return ['div',{'data-flow-block':JSON.stringify(node.attrs),'data-id':node.attrs.id},0];},
  addNodeView(){return ReactNodeViewRenderer(function FlowBlockView({node,editor,updateAttributes}:NodeViewProps){
   const [copied,setCopied]=useState(false);const source=node.attrs.source||{},props=source.props||{},kind=source.type||'paragraph';
   return <NodeViewWrapper className="flow-block" data-flow-block={JSON.stringify(node.attrs)} data-id={node.attrs.id} data-kind={kind} data-list-number={node.attrs.listNumber} style={{color:flowColor(props.textColor),backgroundColor:flowColor(props.backgroundColor,true),textAlign:props.textAlignment||undefined}}>
    {editor.isEditable&&<span className="flow-drag-handle" data-drag-handle draggable contentEditable={false} aria-label="拖动段落">⠿</span>}
    {kind==='checkListItem'&&<input className="flow-check" type="checkbox" aria-label="完成事项" contentEditable={false} checked={!!props.checked} disabled={!editor.isEditable} onChange={event=>{if(editor.isEditable) updateAttributes({source:{...source,props:{...props,checked:event.target.checked}}});}}/>}
    <NodeViewContent className="flow-block-body"/>{node.firstChild?.type.name==='codeBlock'&&<button type="button" className="document-copy-code" contentEditable={false} onClick={()=>void navigator.clipboard.writeText(node.firstChild!.textContent).then(()=>setCopied(true)).catch(e=>services.current.onError(e.message))}>{copied?'已复制':'复制代码'}</button>}
   </NodeViewWrapper>;
  },{stopEvent:({event})=>{const target=event.target as HTMLElement;return !!target.closest?.('button,input,select,textarea');}});},
  addInputRules(){
   const transform=(find:RegExp,kind:string,attributes:(match:RegExpMatchArray)=>Record<string,any>=()=>({}))=>new InputRule({find,handler:({state,range,match})=>{if(!applyMarkdownBlock(this.editor,state.tr,range.from,range.to,kind,attributes(match))) return null;}});
   return [
    transform(/^(#{1,3}) $/,'heading',match=>({level:match[1].length})),
    transform(/^(?:[-+*] )?\[([ xX])\] $/,'checkListItem',match=>({checked:match[1].toLowerCase()==='x'})),
    transform(/^[-+*] $/,'bulletListItem'),transform(/^\d+\. $/,'numberedListItem'),transform(/^> $/,'quote'),
    transform(/^```([\w+-]*)[ \n]$/,'codeBlock',match=>({language:match[1]||'text'})),transform(/^(?:---|\*\*\*|___)[ \n]$/,'divider'),
   ];
  },
  addKeyboardShortcuts(){return {
   Tab:()=>changeListIndent(this.editor,false),
   'Shift-Tab':()=>changeListIndent(this.editor,true),
   Enter:()=>{
    const editor=this.editor,tr=editor.state.tr.deleteSelection(),selected=selectedFlowBlock(editor,tr.selection);if(!selected) return false;
    const {node,pos,depth}=selected,first=node.firstChild;
    if(first?.type.name==='paragraph'&&editor.state.selection.empty&&tr.selection.$from.parentOffset===first.content.size) {
     const fence=first.textContent.match(/^```([\w+-]*)$/),divider=/^(---|\*\*\*|___)$/.test(first.textContent);
     if((fence||divider)&&applyMarkdownBlock(editor,tr,pos+2,pos+2+first.content.size,fence?'codeBlock':'divider',fence?{language:fence[1]||'text'}:{})) {editor.view.dispatch(tr.scrollIntoView());return true;}
    }
    if(!first?.isTextblock||tr.selection.$from.depth!==depth+1||first.type.name==='codeBlock') return false;
    const source=node.attrs.source||{},kind=source.type||'paragraph';
    if(!first.textContent&&['bulletListItem','numberedListItem','checkListItem'].includes(kind)) return changeListIndent(editor,true,tr);
    const nextKind=['bulletListItem','numberedListItem','checkListItem'].includes(kind)?kind:'paragraph',attrs={id:crypto.randomUUID(),source:{type:nextKind,...(nextKind==='checkListItem'?{props:{checked:false}}:{})},hasContent:true,hasChildren:false,contentShape:'array'};
    if(node.childCount>1&&tr.selection.$from.parentOffset===first.content.size) {const next=editor.schema.nodes.flowBlock.create(attrs,editor.schema.nodes.paragraph.create());tr.insert(pos+node.nodeSize,next);tr.setSelection(TextSelection.create(tr.doc,pos+node.nodeSize+2));editor.view.dispatch(tr);return true;}
    tr.split(tr.selection.from,2,[{type:editor.schema.nodes.flowBlock,attrs},{type:editor.schema.nodes.paragraph}]);editor.view.dispatch(tr.scrollIntoView());return true;
   },
   Backspace:()=>{const editor=this.editor;if(editor.commands.undoInputRule()) return true;const selected=selectedFlowBlock(editor);if(!selected||!editor.state.selection.empty||editor.state.selection.$from.parentOffset!==0||selected.node.childCount>1) return false;if(['bulletListItem','numberedListItem','checkListItem'].includes(selected.node.attrs.source?.type)) return changeListIndent(editor,true);const $pos=editor.state.doc.resolve(selected.pos),prev=$pos.nodeBefore;if(!prev||prev.type.name!=='flowBlock'||prev.childCount>1||!['paragraph','heading'].includes(prev.firstChild!.type.name)||!['paragraph','heading'].includes(selected.node.firstChild!.type.name)) return false;const end=selected.pos-2;const tr=editor.state.tr.delete(selected.pos,selected.pos+selected.node.nodeSize).insert(end,selected.node.firstChild!.content);tr.setSelection(TextSelection.create(tr.doc,end));editor.view.dispatch(tr);return true;},
  };},
  addProseMirrorPlugins(){return [new Plugin({appendTransaction(transactions,_,state){
   if(!transactions.some(tr=>tr.docChanged)) return null;const ids=new Set<string>(),numbers=new Map<unknown,number>(),tr=state.tr;
   state.doc.descendants((node,pos,parent)=>{if(node.type.name!=='flowBlock') return;let id=node.attrs.id;if(!id||ids.has(id)) id=crypto.randomUUID();ids.add(id);const listNumber=node.attrs.source?.type==='numberedListItem'&&node.firstChild?.type.name==='paragraph'?(numbers.get(parent)||0)+1:0;numbers.set(parent,listNumber);if(id!==node.attrs.id||listNumber!==node.attrs.listNumber) tr.setNodeMarkup(pos,undefined,{...node.attrs,id,listNumber});if(node.firstChild&&['flowImage','flowFile','flowDrawing','flowDocumentLink'].includes(node.firstChild.type.name)&&node.firstChild.attrs.blockId!==id) tr.setNodeMarkup(pos+1,undefined,{...node.firstChild.attrs,blockId:id});});return tr.docChanged?tr:null;
  }})];},
 });
 const FlowChildren=Node.create({name:'flowChildren',content:'flowBlock+',parseHTML(){return [{tag:'div[data-flow-children]'}];},renderHTML(){return ['div',{'data-flow-children':'',class:'flow-children'},0];}});
 const FlowCallout=Node.create({name:'flowCallout',content:'inline*',parseHTML(){return [{tag:'aside[data-flow-callout]'}];},renderHTML(){return ['aside',{'data-flow-callout':'',class:'flow-callout'},0];}});
 const FlowStyle=Mark.create({name:'flowStyle',addGlobalAttributes(){return [{types:['link'],attributes:{flowLink:{default:{},parseHTML:element=>readJSON(element,'data-flow-link'),renderHTML:attrs=>({'data-flow-link':JSON.stringify(attrs.flowLink)})}}}];},addAttributes(){return {styles:{default:{}},extra:{default:{}}};},parseHTML(){return [{tag:'span[data-flow-style]',getAttrs:element=>readJSON(element as HTMLElement,'data-flow-style')},{tag:'span[style]',getAttrs:element=>{const el=element as HTMLElement;return {styles:{...(el.style.color?{textColor:el.style.color}:{}),...(el.style.backgroundColor?{backgroundColor:el.style.backgroundColor}:{})}};}}];},renderHTML({mark}){const styles=mark.attrs.styles;const color=flowColor(styles.textColor),background=flowColor(styles.backgroundColor,true);return ['span',{'data-flow-style':JSON.stringify(mark.attrs),style:[color&&`color:${color}`,background&&`background-color:${background}`].filter(Boolean).join(';')},0];}});
 function atom(name:string,render:(props:NodeViewProps)=>ReactNode) {return Node.create({name,group:'block',atom:true,draggable:false,addAttributes(){return {blockId:{default:null,rendered:false},props:{default:{},rendered:false}};},parseHTML(){return [{tag:`div[data-flow-atom="${name}"]`,getAttrs:element=>readJSON(element as HTMLElement,'data-flow-resource')}];},renderHTML({node}){return ['div',{'data-flow-atom':name,'data-flow-resource':JSON.stringify(node.attrs)},node.attrs.props.name||''];},addNodeView(){return ReactNodeViewRenderer(render as any);}});}
 const FlowImage=atom('flowImage',function ImageView({node}:NodeViewProps){const [url,setUrl]=useState(''),[error,setError]=useState('');const props=node.attrs.props;
  useEffect(()=>{let active=true;setError('');setUrl('');services.current.resolveMedia(node.attrs.blockId,props).then(value=>{if(active) setUrl(value);}).catch(e=>{if(active) setError(e.message);});return()=>{active=false;};},[node.attrs.blockId,props.assetId,props.url]);
  return <NodeViewWrapper className="flow-image" data-flow-atom="flowImage" data-flow-resource={JSON.stringify(node.attrs)} contentEditable={false}>{url?<img src={url} alt={props.name||props.caption||'文档图片'} style={{width:props.previewWidth||undefined,maxWidth:'100%'}}/>:<span role={error?'alert':undefined}>{error||'正在读取图片…'}</span>}{props.caption&&<figcaption>{props.caption}</figcaption>}{props.url?.startsWith('pending:')&&<small>图片上传完成后自动保存</small>}</NodeViewWrapper>;
 });
 const FlowFile=atom('flowFile',function FileView({node}:NodeViewProps){const props=node.attrs.props;return <NodeViewWrapper className="flow-file" data-flow-atom="flowFile" data-flow-resource={JSON.stringify(node.attrs)} contentEditable={false}><button type="button" className="document-download" disabled={props.url?.startsWith('pending:')} onClick={()=>void services.current.resolveMedia(node.attrs.blockId,props).then(url=>{const a=document.createElement('a');a.href=url;a.download=props.name||'附件';a.rel='noopener noreferrer';a.click();}).catch(e=>services.current.onError(e.message))}>↓ {props.name||'下载附件'}{props.url?.startsWith('pending:')?' · 上传中':''}</button>{props.caption&&<span>{props.caption}</span>}</NodeViewWrapper>;});
 const FlowDrawing=atom('flowDrawing',({node}:NodeViewProps)=><NodeViewWrapper data-flow-atom="flowDrawing" data-flow-resource={JSON.stringify(node.attrs)} contentEditable={false}>{services.current.renderDrawing({blockId:node.attrs.blockId,drawingId:node.attrs.props.drawingId,mode:node.attrs.props.mode,revision:node.attrs.props.revision||null})}</NodeViewWrapper>);
 const FlowDocumentLink=atom('flowDocumentLink',({node}:NodeViewProps)=><NodeViewWrapper data-flow-atom="flowDocumentLink" data-flow-resource={JSON.stringify(node.attrs)} contentEditable={false}>{services.current.renderDocumentLink?services.current.renderDocumentLink(node.attrs.props.documentId):<DocumentLinkBlock documentId={node.attrs.props.documentId}/>}</NodeViewWrapper>);
 const cellAttrs={flowCell:{default:null,parseHTML:(element:HTMLElement)=>readJSON(element,'data-flow-cell',null),renderHTML:(attrs:any)=>({'data-flow-cell':JSON.stringify(attrs.flowCell),style:`text-align:${attrs.flowCell?.props?.textAlignment||'left'};color:${flowColor(attrs.flowCell?.props?.textColor)||'inherit'};background-color:${flowColor(attrs.flowCell?.props?.backgroundColor,true)||'transparent'}`})}};
 return [StarterKit.configure({document:false,trailingNode:false,heading:{levels:[1,2,3]},bulletList:false,orderedList:false,listItem:false,listKeymap:false,link:{openOnClick:'whenNotEditable',isAllowedUri:safeLinkUrl}}),
  Node.create({name:'doc',topNode:true,content:'flowBlock+'}),FlowBlock,FlowChildren,FlowCallout,FlowStyle,FlowImage,FlowFile,FlowDrawing,FlowDocumentLink,
  Table.extend({addAttributes(){return {...this.parent?.(),flowTable:jsonAttribute('data-flow-table',{type:'tableContent'})};}}).configure({resizable:false,renderWrapper:true}),TableRow.extend({addAttributes(){return {...this.parent?.(),flowRow:jsonAttribute('data-flow-row')};}}),TableCell.extend({addAttributes(){return {...this.parent?.(),...cellAttrs};}}),TableHeader.extend({addAttributes(){return {...this.parent?.(),...cellAttrs};}}),
 ];
}
