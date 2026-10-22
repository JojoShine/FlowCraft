import {lazy,Suspense,useEffect,useState} from 'react';
import {Link,useLocation,useNavigate,useParams} from 'react-router-dom';
import {useAuth} from '../contexts/AuthContext';
import {useProjectContext} from '../contexts/ProjectContext';
import {useConfirm} from '../components/ui/ConfirmDialog';
import {drawingsApi} from '../features/content/api';
import {useContentEditor} from '../features/content/useContentEditor';
import {SaveStatus} from '../features/content/SaveStatus';
import {LogoutGuard} from '../features/content/LogoutGuard';
import {DraftRecoveryDialog} from '../features/content/DraftRecoveryDialog';
import {ConflictDialog} from '../features/content/ConflictDialog';
import {HistoryPanel} from '../features/content/HistoryPanel';
import {useDrawingPreview} from '../features/drawings/useDrawingPreview';
import type {ContentView,DrawingScene,DocumentReferenceDto} from '../features/content/types';
import '../features/content/content.css';
const ExcalidrawEditor=lazy(()=>import('../features/drawings/ExcalidrawEditor').then(m=>({default:m.ExcalidrawEditor})));
export function DrawingPage() {const {id=''}=useParams();return <DrawingWorkspace id={id}/>;}
export function DrawingWorkspace({id,onClose}:{id:string;onClose?:()=>void}) {
 const {user}=useAuth();const key=`${user!.id}:${id}`;const [loaded,setLoaded]=useState<{key:string;view:ContentView<DrawingScene>}>(),[error,setError]=useState('');
 useEffect(()=>{const controller=new AbortController();setError('');drawingsApi.get(id,controller.signal).then(view=>{if(!controller.signal.aborted) setLoaded({key,view});}).catch(e=>{if(!controller.signal.aborted) setError(e.message);});return ()=>controller.abort();},[key]);
 if(error) return <section className="content-error"><p role="alert">绘图无法打开：{error}</p>{onClose?<button onClick={onClose}>关闭绘图</button>:<Link to="/drawings">返回绘图中心</Link>}</section>;
 if(loaded?.key!==key) return <p role="status">正在读取绘图…</p>;
 if(loaded.view.payload.formatVersion!==1) return <section className="content-error"><p>暂不支持此画布格式，已保持只读，原内容不会被覆盖。</p>{onClose&&<button onClick={onClose}>关闭绘图</button>}</section>;
 return <LoadedDrawing key={key} initial={loaded.view} onClose={onClose}/>;
}
function LoadedDrawing({initial,onClose}:{initial:ContentView<DrawingScene>;onClose?:()=>void}) {
 const navigate=useNavigate(),location=useLocation(),confirm=useConfirm(),{projects}=useProjectContext();const session=useContentEditor('drawing',initial),{view,queue,state}=session;
 const [history,setHistory]=useState(false),[references,setReferences]=useState<DocumentReferenceDto[]>([]),[showReferences,setShowReferences]=useState(false),[copied,setCopied]=useState(false);
 const readMode=new URLSearchParams(location.search).get('mode')==='read';const preview=useDrawingPreview({id:view.id,lastAck:state.lastAck,canEdit:view.canEdit&&!readMode});
 useEffect(()=>{drawingsApi.references(view.id).then(setReferences).catch(()=>{});},[view.id]);
 useEffect(()=>{if(view.canEdit&&!readMode) void preview.regenerate(initial.version).catch(()=>{});},[initial.id]);
 useEffect(()=>{if(state.lastAck) window.dispatchEvent(new CustomEvent('flowcraft:drawing-saved',{detail:{id:view.id,version:state.lastAck.version}}));},[state.lastAck,preview.status]);
 const canEdit=view.canEdit&&!readMode&&!history&&!['auth-paused','deleted'].includes(state.phase);
 async function close() {if(await session.drain()) {onClose?.();return;}await queue.persist();if(queue.getSnapshot().draftPersisted&&await confirm({title:'保留草稿后关闭？',description:'尚未保存到服务器的内容将保留在当前浏览器，重新打开时可恢复。'})) onClose?.();else session.setError('请先重试保存或导出恢复草稿');}
 async function trash() {if(!await session.drain()) {session.setError('请先完成保存或导出恢复草稿');return;}if(await confirm({title:'将原图移入回收站？',description:`当前有 ${references.length} 处文档引用。移入回收站后会显示占位，历史和图片保留。`,variant:'danger'})) {await drawingsApi.trash(view.id);if(onClose) onClose();else navigate('/drawings');}}
 async function duplicate() {if(!await session.drain()) {session.setError('请先完成保存或导出恢复草稿');return;}const copy=await drawingsApi.duplicate(view.id);if(onClose) onClose();navigate(`/drawings/${copy.id}`);}
 return <section className="content-workspace"><LogoutGuard queue={queue}/><div className="content-breadcrumb">{onClose?<span>正在编辑共享原图</span>:<Link to="/drawings">绘图中心</Link>}<span>/</span><span>{projects.find(p=>p.id===view.projectId)?.name||'所属项目'}</span><span>/</span><span>v{state.version}</span></div><header className="content-editor-header"><div>{canEdit?<input className="drawing-title" aria-label="绘图标题" value={view.title} maxLength={300} onChange={event=>session.update(event.target.value,view.payload)} onBlur={()=>{if(!view.title.trim()) session.update('未命名绘图',view.payload);}}/>:<h1 style={{fontSize:21}}>{view.title}</h1>}<SaveStatus state={state} onRetry={()=>void queue.flush()} onExport={()=>void session.exportRecovery()}/></div><div className="content-editor-tools"><button onClick={()=>{void navigator.clipboard.writeText(`${window.location.origin}${import.meta.env.BASE_URL}drawings/${view.id}`).then(()=>setCopied(true)).catch(e=>session.setError(e.message));}}>{copied?'链接已复制':'复制链接'}</button><button onClick={()=>setShowReferences(!showReferences)}>引用位置 ({references.length})</button>{view.canEdit&&!readMode&&<><button onClick={()=>setHistory(true)}>历史版本</button><button onClick={()=>void duplicate().catch(e=>session.setError(e.message))}>创建副本</button><button onClick={()=>void trash().catch(e=>session.setError(e.message))}>移入回收站</button></>}{onClose&&<button className="content-primary" onClick={()=>void close()}>关闭绘图</button>}</div></header>
  {onClose&&<p className="content-notice">正在修改原图，将影响 {references.length} 处引用中跟随最新版本的内容；固定版本引用保持原样。</p>}{showReferences&&<div className="content-notice">{references.length?<ul>{references.map((ref,index)=><li key={index}><Link to={`/documents/${ref.documentId}#${ref.blockId}`}>{ref.title}</Link></li>)}</ul>:<p>尚未被文档引用</p>}</div>}{session.error&&<p className="content-warning" role="alert">{session.error}</p>}{session.newVersion&&<div className="content-notice">服务器已有新版本。{state.phase==='saved'?<button onClick={()=>void session.reload()}>读取新版本</button>:<span>保存时将检查版本冲突，当前草稿已保留。</span>}</div>}{session.pendingFiles.length>0&&<div className="content-notice">还有 {session.pendingFiles.length} 张图片尚未保存。<button onClick={()=>void session.retryUploads()}>重试图片上传</button><button onClick={()=>void session.exportRecovery()}>导出恢复草稿</button></div>}
  {view.canEdit&&!readMode&&preview.status!=='ready'&&<div className="content-muted">{preview.status==='error'?'预览生成失败，源图已保留。':'预览待更新。'}<button onClick={()=>void preview.regenerate(state.version).catch(e=>session.setError(e.message))}>重新生成预览</button></div>}
  <div style={{height:onClose?'calc(85vh - 210px)':'calc(100vh - 270px)',minHeight:500}}><Suspense fallback={<p>正在加载绘图工具…</p>}><ExcalidrawEditor view={{...view,canEdit}} readAsset={session.readAsset} upload={session.upload} onChange={session.update} onComposition={queue.setComposing}/></Suspense></div>
  {!readMode&&view.canEdit&&<DraftRecoveryDialog draft={session.drafts[0]} serverVersion={state.version} onRestore={session.restoreDraft} onDiscard={session.discardDraft}/>}
  <ConflictDialog open={state.phase==='conflict'} onServer={async()=>{window.open(`${import.meta.env.BASE_URL}drawings/${view.id}?mode=read`,'_blank','noopener,noreferrer');}} onDuplicate={async()=>{const copy=await session.localCopy();if(onClose) onClose();navigate(`/drawings/${copy.id}`);}} onOverwrite={session.overwrite}/>
  {history&&<HistoryPanel kind="drawing" id={view.id} beforeRestore={session.drain} onRestored={async()=>{await session.reload();setHistory(false);void preview.regenerate(queue.getSnapshot().version).catch(()=>{});}} onClose={()=>setHistory(false)}/>}
 </section>;
}
