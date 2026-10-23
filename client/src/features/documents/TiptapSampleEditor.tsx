import {useEffect,useRef} from 'react';
import {Extension,type Editor} from '@tiptap/core';
import {Plugin} from '@tiptap/pm/state';
import {EditorContent,NodeViewWrapper,ReactNodeViewRenderer,useEditor,useEditorState,type NodeViewProps} from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import {Button} from '../../components/ui/Button';
import {Select} from '../../components/ui/Select';
import {fromTiptap,toTiptap} from './tiptapSampleAdapter';
import type {DocumentBody,AssetDto} from '../content/types';
const IDs=Extension.create({
 name:'sampleBlockIds',
 addGlobalAttributes(){return [{types:['paragraph','heading','image'],attributes:{id:{default:null,parseHTML:()=>null,renderHTML:attrs=>({'data-id':attrs.id})}}}];},
 addProseMirrorPlugins(){return [new Plugin({appendTransaction(transactions,_,state){
  if(!transactions.some(tr=>tr.docChanged)) return null;
  const seen=new Set<string>(),tr=state.tr;state.doc.descendants((node,pos)=>{if(['paragraph','heading','image'].includes(node.type.name)){const id=node.attrs.id;if(!id||seen.has(id)) {const fresh=crypto.randomUUID();tr.setNodeMarkup(pos,undefined,{...node.attrs,id:fresh});seen.add(fresh);}else seen.add(id);}});return tr.docChanged?tr:null;
 }})];},
});
interface Props {body:DocumentBody;editable:boolean;onChange:(body:DocumentBody)=>void;onComposition:(active:boolean)=>void;upload:(file:File,id:string)=>Promise<AssetDto>;resolveImage:(id:string,assetId:string|null)=>Promise<string>;onError:(message:string)=>void;onPreview:(id:string,file:File)=>void}
export function TiptapSampleEditor(props:Props) {
 const current=useRef(props);current.current=props;
 const uploaded=useRef(new Map<string,string>());
 function restoreUploadedImages(editor:Editor) {
  const tr=editor.state.tr;editor.state.doc.descendants((node,pos)=>{const assetId=uploaded.current.get(node.attrs.id);if(node.type.name==='image'&&!node.attrs.assetId&&assetId) tr.setNodeMarkup(pos,undefined,{...node.attrs,assetId});});
  if(!tr.docChanged) return false;editor.view.dispatch(tr.setMeta('addToHistory',false));return true;
 }
 const image=useRef(Image.extend({
  addAttributes(){return {...this.parent?.(),assetId:{default:null},name:{default:'截图.png'}};},
  // Pasted files enter through the upload handler, never as external/base64 image URLs.
  parseHTML(){return [];},
  addNodeView(){return ReactNodeViewRenderer(function SampleImage({node}:NodeViewProps){
   const ref=useRef<HTMLImageElement>(null);const id=node.attrs.id,assetId=node.attrs.assetId;
   useEffect(()=>{let active=true;current.current.resolveImage(id,assetId).then(url=>{if(active&&ref.current) ref.current.src=url;}).catch(error=>{if(active) current.current.onError(`图片无法读取：${error.message}`);});return()=>{active=false;};},[id,assetId]);
   return <NodeViewWrapper className="sample-image" contentEditable={false}><img ref={ref} alt={node.attrs.name||'截图'} draggable={false}/>{!assetId&&<span>图片上传中，完成后自动保存</span>}</NodeViewWrapper>;
  });},
 })).current;
 function pasteImages(editor:Editor,files:File[]) {
  for(const file of files) {
   if(!['image/png','image/jpeg','image/gif','image/webp'].includes(file.type)||file.size>10*1024*1024){current.current.onError('请粘贴 10 MB 以内的 PNG、JPEG、GIF 或 WebP 图片');continue;}
   const id=crypto.randomUUID();current.current.onPreview(id,file);editor.chain().focus().insertContent([{type:'image',attrs:{id,name:file.name}},{type:'paragraph',attrs:{id:crypto.randomUUID()}}]).run();
   void current.current.upload(file,id).then(asset=>{
    if(editor.isDestroyed) return;uploaded.current.set(id,asset.id);editor.state.doc.descendants((node,pos)=>{if(node.type.name==='image'&&node.attrs.id===id) editor.view.dispatch(editor.state.tr.setNodeMarkup(pos,undefined,{...node.attrs,assetId:asset.id}).setMeta('addToHistory',false));});
   }).catch(()=>{});
  }
 }
 const editor=useEditor({extensions:[StarterKit.configure({heading:{levels:[1,2,3]},bulletList:false,orderedList:false,listItem:false,listKeymap:false,blockquote:false,codeBlock:false,horizontalRule:false,link:false}),IDs,image],content:toTiptap(props.body),editable:props.editable,
  editorProps:{attributes:{role:'textbox','aria-label':'文档正文','aria-multiline':'true'},handlePaste:(_view,event)=>{const files=Array.from(event.clipboardData?.files||[]).filter(file=>file.type.startsWith('image/'));if(!files.length) return false;if(current.current.editable&&editor) pasteImages(editor,files);return true;},handleDOMEvents:{compositionstart:()=>{current.current.onComposition(true);return false;},compositionend:()=>{current.current.onComposition(false);return false;}}},
  onUpdate:({editor})=>{if(current.current.editable&&!restoreUploadedImages(editor)) current.current.onChange(fromTiptap(editor.getJSON()));},
 });
 const formatting=useEditorState({editor,selector:({editor})=>({bold:editor?.isActive('bold'),italic:editor?.isActive('italic'),heading:editor?.isActive('heading')?String(editor.getAttributes('heading').level):'paragraph'})});
 useEffect(()=>{editor?.setEditable(props.editable,false);},[editor,props.editable]);
 useEffect(()=>{
  for(const block of props.body.blocks) if(block.type==='image'&&block.props?.assetId) uploaded.current.set(block.id,block.props.assetId);
  if(editor&&JSON.stringify(fromTiptap(editor.getJSON()))!==JSON.stringify(props.body)) editor.chain().setMeta('addToHistory',false).setContent(toTiptap(props.body),{emitUpdate:false}).run();
 },[editor,props.body]);
 return <><div className="sample-formatbar" aria-label="正文格式">{props.editable&&<><div className="sample-style-select"><Select aria-label="段落样式" value={formatting?.heading||'paragraph'} options={[{value:'paragraph',label:'正文'},{value:'1',label:'一级标题'},{value:'2',label:'二级标题'},{value:'3',label:'三级标题'}]} onValueChange={value=>{if(value==='paragraph') editor?.chain().focus().setParagraph().run();else editor?.chain().focus().setHeading({level:Number(value) as 1|2|3}).run();}}/></div><span className="sample-tool-separator"/><Button variant="ghost" aria-label="粗体" aria-pressed={formatting?.bold} onMouseDown={event=>event.preventDefault()} onClick={()=>editor?.chain().focus().toggleBold().run()}><strong>B</strong></Button><Button variant="ghost" aria-label="斜体" aria-pressed={formatting?.italic} onMouseDown={event=>event.preventDefault()} onClick={()=>editor?.chain().focus().toggleItalic().run()}><em>I</em></Button><span className="sample-paste-hint">截图可直接粘贴到正文</span></>}{!props.editable&&<span className="sample-paste-hint">阅读模式</span>}</div><EditorContent editor={editor}/></>;
}
