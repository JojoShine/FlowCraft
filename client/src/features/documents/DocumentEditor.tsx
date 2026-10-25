import {useEffect,useMemo,useRef,useState,type ReactNode} from 'react';
import {EditorContent,useEditor,useEditorState} from '@tiptap/react';
import type {Editor,JSONContent} from '@tiptap/core';
import {TextSelection} from '@tiptap/pm/state';
import {Button} from '../../components/ui/Button';
import {Select} from '../../components/ui/Select';
import {safeLinkUrl} from './linkSafety';
import {inlineText} from './DocumentOutline';
import {documentFromTiptap,documentToTiptap} from './tiptapDocumentAdapter';
import {createDocumentExtensions,selectedFlowBlock,type DocumentNodeServices} from './tiptapDocumentExtensions';
import type {AssetDto,BlockJSON,ContentView,DocumentBody,DrawingReference} from '../content/types';
import './documentEditor.css';
interface Props {view:ContentView<DocumentBody>;onChange:(title:string,payload:DocumentBody)=>void;onComposition:(value:boolean)=>void;renderDrawing:(reference:DrawingReference)=>ReactNode;renderDocumentLink?:(documentId:string)=>ReactNode;chooseDrawing?:()=>Promise<DrawingReference|null>;chooseDocument?:()=>Promise<string|null>;upload?:(file:File,blockId:string)=>Promise<AssetDto>;resolveAsset?:(assetId:string)=>Promise<string>;resolvePending?:(id:string)=>Promise<Blob>}
const textKinds=['paragraph','heading','bulletListItem','numberedListItem','checkListItem','quote','callout','codeBlock'];
function walk(blocks:BlockJSON[],fn:(block:BlockJSON)=>void){for(const block of blocks){fn(block);walk(block.children||[],fn);}}
function blankBody():DocumentBody{return {formatVersion:1,blocks:[{id:crypto.randomUUID(),type:'paragraph',content:[]}]};}
export function DocumentEditor(props:Props) {
 const [invalid,setInvalid]=useState('');
 const initial=useMemo(()=>{try{return documentToTiptap(props.view.payload.blocks.length?props.view.payload:blankBody());}catch(e:any){return {error:e.message};}},[props.view.id]);
 if('error' in initial) return <section className="document-editor"><h1>{props.view.title}</h1><p role="alert">{initial.error}</p></section>;
 return <TiptapDocument key={props.view.id} {...props} initial={initial} onInvalid={setInvalid} invalid={invalid}/>;
}
function TiptapDocument(props:Props&{initial:JSONContent;invalid:string;onInvalid:(message:string)=>void}) {
 const current=useRef(props);current.current=props;
 const [error,setError]=useState(''),[zoom,setZoom]=useState<string|null>(null),[slash,setSlash]=useState<{from:number;to:number;query:string}|null>(null),[slashIndex,setSlashIndex]=useState(0);
 const previews=useRef(new Map<string,string>()),uploaded=useRef(new Map<string,AssetDto>()),alive=useRef(true),fileInput=useRef<HTMLInputElement>(null),slashMenu=useRef<HTMLDivElement>(null),lastOutput=useRef(''),composition=useRef(false);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;for(const url of previews.current.values()) URL.revokeObjectURL(url);previews.current.clear();};},[]);
 async function resolveMedia(id:string,file:Record<string,any>) {
  const pendingId=file.url?.startsWith('pending:')?file.url.slice(8):id;const cached=previews.current.get(id)||previews.current.get(pendingId);if(cached){previews.current.set(id,cached);return cached;}
  if(file.assetId){const url=await current.current.resolveAsset?.(file.assetId);if(!url) throw new Error('资源无法读取');return url;}
  if(file.url?.startsWith('pending:')) {const blob=await current.current.resolvePending?.(pendingId);if(!blob) throw new Error('请恢复草稿并重试文件上传');const url=URL.createObjectURL(blob);if(!alive.current){URL.revokeObjectURL(url);throw new DOMException('编辑会话已结束','AbortError');}previews.current.set(id,url);return url;}
  if(file.url&&safeLinkUrl(file.url)&&/^https?:/i.test(new URL(file.url,location.origin).protocol)) return file.url;
  throw new Error('资源链接不可用');
 }
 const services=useRef<DocumentNodeServices>({renderDrawing:props.renderDrawing,renderDocumentLink:props.renderDocumentLink,resolveMedia,onError:setError});services.current={renderDrawing:props.renderDrawing,renderDocumentLink:props.renderDocumentLink,resolveMedia,onError:setError};
 const extensions=useMemo(()=>createDocumentExtensions(services),[props.view.id]);
 function repairUploaded(editor:Editor) {
  const tr=editor.state.tr;editor.state.doc.descendants((node,pos)=>{if(!['flowImage','flowFile'].includes(node.type.name)) return;const asset=uploaded.current.get(node.attrs.blockId)||(node.attrs.props.url?.startsWith('pending:')?uploaded.current.get(node.attrs.props.url.slice(8)):undefined);if(asset&&!node.attrs.props.assetId) tr.setNodeMarkup(pos,undefined,{...node.attrs,props:{...node.attrs.props,assetId:asset.id,url:`asset:${asset.id}`}});});
  if(!tr.docChanged) return false;editor.view.dispatch(tr.setMeta('addToHistory',false));return true;
 }
 function emit(editor:Editor) {
  if(!current.current.view.canEdit||current.current.invalid||repairUploaded(editor)) return;
  try{const payload=documentFromTiptap(editor.getJSON());lastOutput.current=JSON.stringify(payload);current.current.onChange(current.current.view.title,payload);}catch(e:any){current.current.onInvalid(e.message);}
 }
 function updateSlash(editor:Editor) {if(!current.current.view.canEdit||composition.current||!editor.isFocused||!editor.state.selection.empty||editor.isActive('codeBlock')){setSlash(null);return;}const {$from}=editor.state.selection;if(!$from.parent.isTextblock){setSlash(null);return;}const match=$from.parent.textBetween(0,$from.parentOffset,'\n').match(/(?:^|\s)\/([^\s/]{0,20})$/);if(match){setSlash({from:$from.pos-match[1].length-1,to:$from.pos,query:match[1]});setSlashIndex(0);}else setSlash(null);}
 const editor=useEditor({extensions,content:props.initial,editable:props.view.canEdit,
  editorProps:{attributes:{role:'textbox','aria-label':'文档正文','aria-multiline':'true',class:'flow-document-content'},handlePaste:(_view,event)=>{const files=Array.from(event.clipboardData?.files||[]);if(!files.length) return false;if(current.current.view.canEdit&&editor) insertFiles(editor,files);return true;},handleDOMEvents:{compositionstart:()=>{composition.current=true;current.current.onComposition(true);return false;},compositionend:()=>{composition.current=false;current.current.onComposition(false);return false;}},handleKeyDown:(_view,event)=>{if(!slashRef.current||event.isComposing) return false;const options=slashOptionsRef.current;if(!options.length) return false;if(event.key==='Escape'){setSlash(null);return true;}if(event.key==='ArrowDown'||event.key==='ArrowUp'){setSlashIndex(index=>(index+(event.key==='ArrowDown'?1:-1)+options.length)%Math.max(1,options.length));return true;}if(event.key==='Enter'&&options.length){runSlash(options[slashIndexRef.current%options.length].run);return true;}return false;}},
  onUpdate:({editor})=>{emit(editor);updateSlash(editor);},onSelectionUpdate:({editor})=>updateSlash(editor),onFocus:({editor})=>updateSlash(editor),onBlur:()=>setSlash(null),
 });
 const formatting=useEditorState({editor,selector:({editor})=>{if(!editor) return null;const block=selectedFlowBlock(editor),first=block?.node.firstChild,kind=first?.type.name==='heading'?`heading-${first.attrs.level}`:first?.type.name==='paragraph'?block?.node.attrs.source?.type||'paragraph':first?.type.name==='flowCallout'?'callout':first?.type.name==='blockquote'?'quote':first?.type.name||'paragraph';return {kind,bold:editor.isActive('bold'),italic:editor.isActive('italic'),table:editor.isActive('table')};}});
 useEffect(()=>{editor?.setEditable(props.view.canEdit&&!props.invalid,false);},[editor,props.view.canEdit,props.invalid]);
 useEffect(()=>{
  let hasPending=false;walk(props.view.payload.blocks,block=>{if(block.props?.url?.startsWith('pending:')) hasPending=true;if(['image','file'].includes(block.type)&&block.props?.assetId) uploaded.current.set(block.id,{id:block.props.assetId,mimeType:'',bytes:0,state:'complete'});});
  if(!hasPending) setError('');
  if(!editor||JSON.stringify(props.view.payload)===lastOutput.current) return;
  try {const next=documentToTiptap(props.view.payload.blocks.length?props.view.payload:blankBody());if(JSON.stringify(documentFromTiptap(editor.getJSON()))!==JSON.stringify(props.view.payload)) editor.chain().setMeta('addToHistory',false).setContent(next,{emitUpdate:false}).run();current.current.onInvalid('');}catch(e:any){current.current.onInvalid(e.message);}
 },[editor,props.view.payload]);
 function insertBlock(block:BlockJSON){if(!editor||!current.current.view.canEdit) return;const content=documentToTiptap({formatVersion:1,blocks:[block,{id:crypto.randomUUID(),type:'paragraph',content:[]}]}).content!;const table=editor.isActive('table')?selectedFlowBlock(editor):null;if(table) editor.chain().focus().insertContentAt(table.pos+table.node.nodeSize,content).run();else editor.chain().focus().insertContent(content).run();}
 function insertFiles(activeEditor:Editor,files:File[]) {
  if(!current.current.upload){setError('当前无法上传文件');return;}
  for(const file of files){if(file.type.startsWith('image/')&&(!['image/png','image/jpeg','image/gif','image/webp'].includes(file.type)||file.size>10*1024*1024)){setError('请粘贴 10 MB 以内的 PNG、JPEG、GIF 或 WebP 图片');continue;}
   const id=crypto.randomUUID(),image=file.type.startsWith('image/');if(image) previews.current.set(id,URL.createObjectURL(file));
   insertBlock({id,type:image?'image':'file',props:{url:`pending:${id}`,name:file.name}});
   void current.current.upload(file,id).then(asset=>{if(activeEditor.isDestroyed||!alive.current) return;uploaded.current.set(id,asset);repairUploaded(activeEditor);}).catch(e=>{if(alive.current) setError(e.message);});
  }
 }
 function style(value:string){if(!editor) return;const selected=selectedFlowBlock(editor);if(!selected) return;const old=documentFromTiptap({type:'doc',content:[selected.node.toJSON()]}).blocks[0];if(!textKinds.includes(old.type)) return;const [type,level]=value.split('-');const block={...old,type,props:{...old.props,...(type==='heading'?{level:Number(level)}:{}),...(type==='checkListItem'?{checked:false}:{})}};if(type==='codeBlock') block.content=inlineText(old.content);else if(typeof old.content==='string') block.content=[{type:'text',text:old.content,styles:{}}];const replacement=editor.schema.nodeFromJSON(documentToTiptap({formatVersion:1,blocks:[block]}).content![0]);const selection=editor.state.selection,tr=editor.state.tr.replaceWith(selected.pos,selected.pos+selected.node.nodeSize,replacement);let textStart:number|undefined,textSize=0;
  replacement.descendants((node,pos)=>{if(textStart===undefined&&node.isTextblock){textStart=selected.pos+pos+2;textSize=node.content.size;}return textStart===undefined;});
  if(textStart!==undefined){const from=textStart+Math.min(selection.$from.parentOffset,textSize),to=selection.$from.sameParent(selection.$to)?textStart+Math.min(selection.$to.parentOffset,textSize):from;tr.setSelection(TextSelection.create(tr.doc,from,to));}
  editor.view.dispatch(tr);editor.commands.focus();}
 async function insertDrawing(){try{const ref=await current.current.chooseDrawing?.();if(ref) insertBlock({id:ref.blockId,type:'drawing',props:{drawingId:ref.drawingId,mode:ref.mode,revision:ref.revision||0}});}catch(e:any){setError(e.message);}}
 async function insertDocument(){try{const id=await current.current.chooseDocument?.();if(id) insertBlock({id:crypto.randomUUID(),type:'documentLink',props:{documentId:id}});}catch(e:any){setError(e.message);}}
 function insertTable(){insertBlock({id:crypto.randomUUID(),type:'table',content:{type:'tableContent',headerRows:1,rows:Array.from({length:3},()=>({cells:Array.from({length:3},()=>[])}))}});}
 const slashOptions=[{label:'正文',aliases:'paragraph',run:()=>style('paragraph')},{label:'一级标题',aliases:'h1 heading',run:()=>style('heading-1')},{label:'二级标题',aliases:'h2',run:()=>style('heading-2')},{label:'三级标题',aliases:'h3',run:()=>style('heading-3')},{label:'无序列表',aliases:'bullet',run:()=>style('bulletListItem')},{label:'有序列表',aliases:'numbered',run:()=>style('numberedListItem')},{label:'待办事项',aliases:'todo check',run:()=>style('checkListItem')},{label:'引用',aliases:'quote',run:()=>style('quote')},{label:'提示块',aliases:'callout',run:()=>style('callout')},{label:'代码块',aliases:'code',run:()=>style('codeBlock')},{label:'分割线',aliases:'divider horizontal rule separator ---',run:()=>insertBlock({id:crypto.randomUUID(),type:'divider'})},{label:'表格',aliases:'table',run:insertTable},{label:'图片或附件',aliases:'image file',run:()=>fileInput.current?.click()},{label:'绘图',aliases:'drawing excalidraw',run:()=>void insertDrawing()},{label:'文档链接',aliases:'document',run:()=>void insertDocument()}].filter(option=>!slash||`${option.label} ${option.aliases}`.toLowerCase().includes(slash.query.toLowerCase()));
 const slashRef=useRef(slash),slashOptionsRef=useRef(slashOptions),slashIndexRef=useRef(slashIndex);slashRef.current=slash;slashOptionsRef.current=slashOptions;slashIndexRef.current=slashIndex;
 useEffect(()=>{
  const menu=slashMenu.current,selected=menu?.querySelector<HTMLElement>('[aria-selected="true"]');if(!menu||!selected) return;
  if(slashIndex===0) menu.scrollTop=0;
  else if(selected.offsetTop<menu.scrollTop) menu.scrollTop=selected.offsetTop;
  else if(selected.offsetTop+selected.offsetHeight>menu.scrollTop+menu.clientHeight) menu.scrollTop=selected.offsetTop+selected.offsetHeight-menu.clientHeight;
 },[slash,slashIndex]);
 function runSlash(run:()=>void){const match=slashRef.current;if(!editor||!match) return;editor.chain().focus().deleteRange({from:match.from,to:match.to}).run();setSlash(null);run();}
 return <section className="document-editor tiptap-document" data-read-only={!props.view.canEdit} onClick={event=>{if(!props.view.canEdit&&event.target instanceof HTMLImageElement) setZoom(event.target.src);}}>
  {props.view.canEdit?<input className="document-title" aria-label="文档标题" value={props.view.title} maxLength={300} onChange={event=>props.onChange(event.target.value,props.view.payload)}/>:<h1>{props.view.title}</h1>}
  {(error||props.invalid)&&<p className="content-warning" role="alert">{props.invalid||error}</p>}
  {props.view.canEdit&&!props.invalid&&<div className="document-formatbar" aria-label="正文格式"><div className="document-style-select"><Select aria-label="段落样式" value={formatting?.kind||'paragraph'} disabled={!textKinds.includes((formatting?.kind||'paragraph').split('-')[0])} options={[{value:'paragraph',label:'正文'},{value:'heading-1',label:'一级标题'},{value:'heading-2',label:'二级标题'},{value:'heading-3',label:'三级标题'},{value:'bulletListItem',label:'无序列表'},{value:'numberedListItem',label:'有序列表'},{value:'checkListItem',label:'待办事项'},{value:'quote',label:'引用'},{value:'callout',label:'提示块'},{value:'codeBlock',label:'代码块'}]} onValueChange={style}/></div><Button variant="ghost" aria-label="粗体" aria-pressed={formatting?.bold} onMouseDown={event=>event.preventDefault()} onClick={()=>editor?.chain().focus().toggleBold().run()}><strong>B</strong></Button><Button variant="ghost" aria-label="斜体" aria-pressed={formatting?.italic} onMouseDown={event=>event.preventDefault()} onClick={()=>editor?.chain().focus().toggleItalic().run()}><em>I</em></Button>{props.upload&&<Button variant="secondary" onClick={()=>fileInput.current?.click()}>插入图片或附件</Button>}<Button variant="secondary" onClick={insertTable}>插入表格</Button>{props.chooseDrawing&&<Button variant="secondary" onClick={()=>void insertDrawing()}>插入绘图</Button>}{props.chooseDocument&&<Button variant="secondary" onClick={()=>void insertDocument()}>链接文档</Button>}{formatting?.table&&<><Button variant="ghost" onClick={()=>editor?.chain().focus().addRowAfter().run()}>添加行</Button><Button variant="ghost" onClick={()=>editor?.chain().focus().addColumnAfter().run()}>添加列</Button><Button variant="ghost" onMouseDown={event=>event.preventDefault()} onClick={()=>editor?.chain().focus().deleteTable().run()}>删除表格</Button></>}<input hidden ref={fileInput} type="file" multiple onChange={event=>{if(editor) insertFiles(editor,Array.from(event.target.files||[]));event.target.value='';}}/><span className="document-format-hint">输入 / 插入内容 · 截图直接粘贴</span></div>}
  {slash&&slashOptions.length>0&&props.view.canEdit&&<div ref={slashMenu} className="document-slash-menu" role="listbox" aria-label="插入内容">{slashOptions.map((option,index)=><button key={option.label} role="option" aria-selected={slashIndex%slashOptions.length===index} onMouseDown={event=>event.preventDefault()} onClick={()=>runSlash(option.run)}>{option.label}</button>)}</div>}
  <EditorContent editor={editor}/>
  {zoom&&<div className="content-modal-backdrop" role="dialog" aria-label="查看图片" onClick={()=>setZoom(null)}><Button className="document-close-image" onClick={()=>setZoom(null)}>关闭图片</Button><img className="document-zoom" src={zoom} alt="放大的文档图片"/></div>}
 </section>;
}
