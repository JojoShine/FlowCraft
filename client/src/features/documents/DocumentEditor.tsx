import {useContentTheme} from '../content/useContentTheme';
import {useEffect,useMemo,useRef,useState,type ReactNode} from 'react';
import {BlockNoteSchema,defaultBlockSpecs,createCodeBlockSpec,insertOrUpdateBlockForSlashMenu} from '@blocknote/core';
import {zh} from '@blocknote/core/locales';
import {useCreateBlockNote,createReactBlockSpec,ReactImageBlock,FileBlockWrapper,SuggestionMenuController,getDefaultReactSlashMenuItems} from '@blocknote/react';
import {BlockNoteView} from '@blocknote/ariakit';
import type {AssetDto,BlockJSON,ContentView,DocumentBody,DrawingReference} from '../content/types';
import {DocumentLinkBlock} from './DocumentLinkBlock';
import {safeLinkUrl} from './markdown';
import {inlineText} from './DocumentOutline';
import '@blocknote/core/style.css';
import '@blocknote/ariakit/style.css';
import './documentEditor.css';
interface Props {view:ContentView<DocumentBody>;onChange:(title:string,payload:DocumentBody)=>void;onComposition:(value:boolean)=>void;renderDrawing:(reference:DrawingReference)=>ReactNode;chooseDrawing?:()=>Promise<DrawingReference|null>;chooseDocument?:()=>Promise<string|null>;upload?:(file:File,blockId:string)=>Promise<AssetDto>;resolveAsset?:(assetId:string)=>Promise<string>}
export function DocumentEditor(props:Props) {
 const theme=useContentTheme();
 const current=useRef(props);current.current=props;
 const [zoom,setZoom]=useState<string|null>(null),[message,setMessage]=useState('');
 const schema=useMemo(()=>{
  const callout=createReactBlockSpec({type:'callout',propSchema:{},content:'inline'},{render:({contentRef})=><aside className="document-callout"><span contentEditable={false}>💡</span><div ref={contentRef}/></aside>})();
  const drawing=createReactBlockSpec({type:'drawing',propSchema:{drawingId:{default:''},mode:{default:'latest',values:['latest','pinned'] as const},revision:{default:0},caption:{default:''},height:{default:320}},content:'none'},{render:({block})=><div contentEditable={false}>{current.current.renderDrawing({blockId:block.id,drawingId:block.props.drawingId,mode:block.props.mode,revision:block.props.revision||null})}</div>})();
  const documentLink=createReactBlockSpec({type:'documentLink',propSchema:{documentId:{default:''}},content:'none'},{render:({block})=><DocumentLinkBlock documentId={block.props.documentId}/>})();
  const imageBase=ReactImageBlock();
  const image={...imageBase,config:{...imageBase.config,propSchema:{...imageBase.config.propSchema,assetId:{default:''}}}};
  const file=createReactBlockSpec({type:'file',propSchema:{...defaultBlockSpecs.file.config.propSchema,assetId:{default:''}},content:'none'},{meta:{fileBlockAccept:['*/*']},render:({block,editor})=><FileBlockWrapper block={block as any} editor={editor as any}>{block.props.url&&<button className="document-download" onClick={()=>void (async()=>{try {const url=block.props.assetId?await current.current.resolveAsset?.(block.props.assetId):block.props.url;if(!url) throw new Error('文件无法下载');const a=document.createElement('a');a.href=url;a.download=block.props.name||'附件';a.click();}catch(error:any){setMessage(error.message);}})()}>↓ {block.props.name||'下载附件'}</button>}</FileBlockWrapper>})();
  const code=createCodeBlockSpec({supportedLanguages:{text:{name:'纯文本'},bash:{name:'Shell',aliases:['sh']},javascript:{name:'JavaScript',aliases:['js']},typescript:{name:'TypeScript',aliases:['ts']},json:{name:'JSON'},yaml:{name:'YAML',aliases:['yml']},sql:{name:'SQL'},python:{name:'Python',aliases:['py']},html:{name:'HTML'},css:{name:'CSS'},markdown:{name:'Markdown',aliases:['md']}}});
  const codeBlock={...code,implementation:{...code.implementation,render:function(this:any,block:any,editor:any){const rendered=code.implementation.render!.call(this,block,editor);const button=document.createElement('button');button.type='button';button.className='document-copy-code';button.textContent='复制代码';button.contentEditable='false';button.onclick=()=>{void navigator.clipboard.writeText(inlineText(block.content)).then(()=>{button.textContent='已复制';},()=>{button.textContent='复制失败';});};rendered.dom.appendChild(button);return rendered;}}};
  const {audio,video,toggleListItem,...base}=defaultBlockSpecs;
  return BlockNoteSchema.create({blockSpecs:{...base,heading:defaultBlockSpecs.heading,image,file,codeBlock,callout,drawing,documentLink} as any});
 },[props.view.id]);
 const replacing=useRef(false),lastInput=useRef(JSON.stringify(props.view.payload)),lastOutput=useRef('');
 const editor=useCreateBlockNote({schema,dictionary:zh,initialContent:(props.view.payload.blocks.length?props.view.payload.blocks:undefined) as any,links:{isValidLink:safeLinkUrl,HTMLAttributes:{rel:'noopener noreferrer'}},uploadFile:async(file,blockId)=>{const upload=current.current.upload;if(!upload) throw new Error('当前无法上传文件');const asset=await upload(file,blockId||crypto.randomUUID());return {url:`asset:${asset.id}`,assetId:asset.id,name:file.name};},resolveFileUrl:async url=>{if(url.startsWith('asset:')) {const resolved=await current.current.resolveAsset?.(url.slice(6));if(!resolved) throw new Error('文件无法读取');return resolved;}if(!safeLinkUrl(url)) throw new Error('资源链接不安全');return url;}},[props.view.id]);
 useEffect(()=>{
  const serialized=JSON.stringify(props.view.payload);if(serialized!==lastInput.current&&serialized!==lastOutput.current) {replacing.current=true;try {editor.replaceBlocks(editor.document,(props.view.payload.blocks.length?props.view.payload.blocks:[{type:'paragraph'}]) as any);}finally {replacing.current=false;}}lastInput.current=serialized;
 },[props.view.payload,editor]);
 async function insertDrawing() {const ref=await current.current.chooseDrawing?.();if(ref) insertOrUpdateBlockForSlashMenu(editor,{type:'drawing',props:{drawingId:ref.drawingId,mode:ref.mode,revision:ref.revision||0}});}
 async function insertDocument() {const id=await current.current.chooseDocument?.();if(id) insertOrUpdateBlockForSlashMenu(editor,{type:'documentLink',props:{documentId:id}});}
 return <section className="document-editor" data-read-only={!props.view.canEdit} onCompositionStart={()=>props.onComposition(true)} onCompositionEnd={()=>props.onComposition(false)} onClick={event=>{if(!props.view.canEdit&&event.target instanceof HTMLImageElement) setZoom(event.target.src);}}>
  {props.view.canEdit?<input className="document-title" aria-label="文档标题" value={props.view.title} onChange={event=>props.onChange(event.target.value,{formatVersion:1,blocks:editor.document as unknown as BlockJSON[]})}/>:<h1>{props.view.title}</h1>}
  {message&&<p role="alert">{message}</p>}
  {props.view.canEdit&&<div className="document-insert-tools"><button onClick={()=>void insertDrawing()}>插入绘图</button><button onClick={()=>void insertDocument()}>链接文档</button><span>输入 / 插入内容</span></div>}
  <BlockNoteView editor={editor} editable={props.view.canEdit} theme={theme} slashMenu={false} onChange={()=>{if(!current.current.view.canEdit||replacing.current) return;const payload:DocumentBody={formatVersion:1,blocks:editor.document as unknown as BlockJSON[]};lastOutput.current=JSON.stringify(payload);current.current.onChange(current.current.view.title,payload);}}>
   {props.view.canEdit&&<SuggestionMenuController triggerCharacter="/" getItems={async query=>{const items=[...getDefaultReactSlashMenuItems(editor),{title:'绘图',aliases:['drawing','excalidraw','图'],group:'项目资料',onItemClick:()=>{void insertDrawing();}},{title:'文档链接',aliases:['document','文档'],group:'项目资料',onItemClick:()=>{void insertDocument();}},{title:'提示块',aliases:['callout','提示'],group:'基础块',onItemClick:()=>insertOrUpdateBlockForSlashMenu(editor,{type:'callout'})}];return items.filter(item=>[item.title,...(item.aliases||[])].some(text=>text.toLowerCase().includes(query.toLowerCase())));}}/>}
  </BlockNoteView>
  {zoom&&<div className="content-modal-backdrop" role="dialog" aria-label="查看图片" onClick={()=>setZoom(null)}><button className="document-close-image" onClick={()=>setZoom(null)}>关闭图片</button><img className="document-zoom" src={zoom} alt="放大的文档图片"/></div>}
 </section>;
}
