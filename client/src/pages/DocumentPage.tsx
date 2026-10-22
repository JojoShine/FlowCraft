import {useEffect,useRef,useState} from 'react';
import {Link,useLocation,useNavigate,useParams} from 'react-router-dom';
import {useAuth} from '../contexts/AuthContext';
import {useProjectContext} from '../contexts/ProjectContext';
import {useConfirm} from '../components/ui/ConfirmDialog';
import {documentsApi} from '../features/content/api';
import {useContentEditor} from '../features/content/useContentEditor';
import {SaveStatus} from '../features/content/SaveStatus';
import {LogoutGuard} from '../features/content/LogoutGuard';
import {ConflictDialog} from '../features/content/ConflictDialog';
import {DraftRecoveryDialog} from '../features/content/DraftRecoveryDialog';
import {HistoryPanel} from '../features/content/HistoryPanel';
import {useDocumentExport} from '../features/documents/useDocumentExport';
import {DocumentEditor} from '../features/documents/DocumentEditor';
import {DocumentOutline} from '../features/documents/DocumentOutline';
import {DocumentPicker} from '../features/documents/DocumentPicker';
import {DrawingPicker} from '../features/drawings/DrawingPicker';
import {DrawingEmbedBlock} from '../features/drawings/DrawingEmbedBlock';
import type {BlockJSON,ContentView,DocumentBody,DrawingReference} from '../features/content/types';
import '../features/content/content.css';
export function DocumentPage() {
 const {id=''}=useParams(),{user}=useAuth();const key=`${user!.id}:${id}`;const [loaded,setLoaded]=useState<{key:string;view:ContentView<DocumentBody>}>(),[error,setError]=useState('');
 useEffect(()=>{const controller=new AbortController();setError('');documentsApi.get(id,controller.signal).then(view=>{if(!controller.signal.aborted) setLoaded({key,view});}).catch(e=>{if(!controller.signal.aborted) setError(e.message);});return ()=>controller.abort();},[key]);
 if(error) return <section className="content-error"><p role="alert">文档无法打开：{error}</p><Link to="/documents">返回文档中心</Link></section>;
 if(loaded?.key!==key) return <p role="status">正在读取文档…</p>;
 if(loaded.view.payload.formatVersion!==1) return <section className="content-error"><p>暂不支持此文档格式，已保持只读，原内容不会被覆盖。</p><Link to="/documents">返回文档中心</Link></section>;
 return <DocumentWorkspace key={key} initial={loaded.view}/>;
}
function DocumentWorkspace({initial}:{initial:ContentView<DocumentBody>}) {
 const navigate=useNavigate(),location=useLocation(),confirm=useConfirm(),{projects}=useProjectContext();const session=useContentEditor('document',initial),{view,queue,state}=session;
 const exporter=useDocumentExport(view.id,{title:view.title,beforeExport:session.drain});
 const [readMode,setReadMode]=useState(new URLSearchParams(location.search).get('mode')==='read'),[history,setHistory]=useState(false),[picker,setPicker]=useState<'drawing'|'document'|null>(null),[copied,setCopied]=useState(false),[copyMode,setCopyMode]=useState<'reference'|'duplicate'|null>(null);
 const drawingResolve=useRef<((ref:DrawingReference|null)=>void)|null>(null),documentResolve=useRef<((id:string|null)=>void)|null>(null);
 useEffect(()=>{if(state.lastAck) window.dispatchEvent(new CustomEvent('flowcraft:document-saved',{detail:{id:view.id,version:state.lastAck.version}}));},[state.lastAck]);
 const canEdit=view.canEdit&&!readMode&&!history&&!['auth-paused','deleted'].includes(state.phase),warnings=((location.state as any)?.importWarnings||[]) as string[];
 function chooseDrawing() {setPicker('drawing');return new Promise<DrawingReference|null>(resolve=>{drawingResolve.current=resolve;});}
 function chooseDocument() {setPicker('document');return new Promise<string|null>(resolve=>{documentResolve.current=resolve;});}
 function referenceChange(ref:DrawingReference&{caption?:string;height?:number}) {const payload=structuredClone(view.payload);function patch(blocks:BlockJSON[]) {for(const block of blocks) {if(block.id===ref.blockId) block.props={...block.props,drawingId:ref.drawingId,mode:ref.mode,revision:ref.revision||0,caption:ref.caption||'',height:ref.height||320};patch(block.children||[]);}}patch(payload.blocks);session.update(view.title,payload);}
 async function trash() {if(!await session.drain()) {session.setError('请先完成保存，或导出恢复草稿');return;}if(await confirm({title:'移入回收站',description:'只删除这篇文档，正文、历史和附件会保留。',variant:'danger'})) {await documentsApi.trash(view.id);navigate('/documents');}}
 async function duplicate() {if(!copyMode) return;if(!await session.drain()) {session.setError('请先完成保存，或导出恢复草稿');return;}try {const copy=await documentsApi.duplicate(view.id,copyMode);setCopyMode(null);navigate(`/documents/${copy.id}`);}catch(e:any){session.setError(e.message);}}
 return <section className="content-workspace"><LogoutGuard queue={queue}/><div className="content-breadcrumb"><Link to="/documents">文档中心</Link><span>/</span><span>{projects.find(p=>p.id===view.projectId)?.name||'所属项目'}</span><span>/</span><span>{view.title}</span></div><header className="content-editor-header"><SaveStatus state={state} onRetry={()=>void queue.flush()} onExport={()=>void session.exportRecovery()}/><div className="content-editor-tools"><button disabled={exporter.busy} onClick={()=>void exporter.exportZip()}>打包导出 ZIP</button><button disabled={exporter.busy} onClick={()=>void exporter.exportMarkdown()}>导出 Markdown</button><button onClick={()=>{void navigator.clipboard.writeText(`${window.location.origin}${import.meta.env.BASE_URL}documents/${view.id}`).then(()=>setCopied(true)).catch(e=>session.setError(e.message));}}>{copied?'链接已复制':'复制链接'}</button>{view.canEdit&&<><button onClick={()=>void (async()=>{if(!readMode&&!await session.drain()) {session.setError('请先处理未保存内容');return;}setReadMode(!readMode);})()}>{readMode?'编辑文档':'阅读模式'}</button><button onClick={()=>setHistory(true)}>历史版本</button><button onClick={()=>setCopyMode('reference')}>创建副本</button><button onClick={()=>void trash().catch(e=>session.setError(e.message))}>移入回收站</button></>}</div></header>
  {warnings?.length>0&&<div className="content-notice">导入提示：<ul>{warnings.map((warning,index)=><li key={index}>{warning}</li>)}</ul></div>}{exporter.error&&<p className="content-warning" role="alert">{exporter.error}</p>}{session.error&&<p className="content-warning" role="alert">{session.error}</p>}{session.recoveryError&&<p role="alert">本地恢复不可用：{session.recoveryError}</p>}{session.newVersion&&<div className="content-notice">服务器已有新版本。{state.phase==='saved'?<button onClick={()=>void session.reload()}>读取新版本</button>:<span>当前草稿会保留，保存时将检查版本冲突。</span>}</div>}{session.pendingFiles.length>0&&<div className="content-notice">还有 {session.pendingFiles.length} 个文件尚未保存。<button onClick={()=>void session.retryUploads()}>重试文件上传</button><button onClick={()=>void session.exportRecovery()}>导出恢复草稿</button></div>}
  <div className="content-editor-body"><DocumentEditor view={{...view,canEdit}} onChange={session.update} onComposition={queue.setComposing} chooseDrawing={chooseDrawing} chooseDocument={chooseDocument} upload={session.upload} resolveAsset={session.readAssetUrl} renderDrawing={ref=>{let props:Record<string,any>={};const find=(blocks:BlockJSON[])=>{for(const block of blocks) {if(block.id===ref.blockId) props=block.props||{};find(block.children||[]);}};find(view.payload.blocks);return <DrawingEmbedBlock documentId={view.id} projectId={view.projectId} reference={{...ref,caption:props.caption,height:props.height}} canEdit={canEdit} onReferenceChange={referenceChange}/>;}}/><DocumentOutline blocks={view.payload.blocks}/></div>
  {!readMode&&view.canEdit&&<DraftRecoveryDialog draft={session.drafts[0]} serverVersion={state.version} onRestore={session.restoreDraft} onDiscard={session.discardDraft}/>}
  <ConflictDialog open={state.phase==='conflict'} onServer={async()=>{window.open(`${import.meta.env.BASE_URL}documents/${view.id}?mode=read`,'_blank','noopener,noreferrer');}} onDuplicate={async()=>{const copy=await session.localCopy();navigate(`/documents/${copy.id}`);}} onOverwrite={session.overwrite}/>
  {history&&<HistoryPanel kind="document" id={view.id} beforeRestore={session.drain} onRestored={async()=>{await session.reload();setHistory(false);}} onClose={()=>setHistory(false)}/>}
  {picker==='drawing'&&<DrawingPicker projectId={view.projectId} onPick={ref=>{drawingResolve.current?.(ref);setPicker(null);}} onClose={()=>{drawingResolve.current?.(null);setPicker(null);}}/>}{picker==='document'&&<DocumentPicker projectId={view.projectId} onPick={id=>{documentResolve.current?.(id);setPicker(null);}} onClose={()=>{documentResolve.current?.(null);setPicker(null);}}/>}
  {copyMode&&<div className="content-modal-backdrop"><section className="content-modal" role="dialog" aria-label="创建文档副本" aria-modal="true"><h2>创建文档副本</h2><label><input type="radio" checked={copyMode==='reference'} onChange={()=>setCopyMode('reference')}/> 继续引用原图</label><p>副本文档中的图继续与原文档共享。</p><label><input type="radio" checked={copyMode==='duplicate'} onChange={()=>setCopyMode('duplicate')}/> 复制图后独立维护</label><p>为每个可见图版本创建独立副本，只影响新文档。</p><button onClick={()=>setCopyMode(null)}>取消</button><button onClick={()=>void duplicate()}>创建副本</button></section></div>}
 </section>;
}
