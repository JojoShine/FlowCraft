import {useEffect,useRef,useState} from 'react';
import {Link,useNavigate,useParams} from 'react-router-dom';
import {Button} from '../components/ui/Button';
import {Select} from '../components/ui/Select';
import {useAuth} from '../contexts/AuthContext';
import {useProjectContext} from '../contexts/ProjectContext';
import {documentsApi} from '../features/content/api';
import {useContentEditor} from '../features/content/useContentEditor';
import {LogoutGuard} from '../features/content/LogoutGuard';
import {SaveStatus} from '../features/content/SaveStatus';
import {DraftRecoveryDialog} from '../features/content/DraftRecoveryDialog';
import {ConflictDialog} from '../features/content/ConflictDialog';
import {TiptapSampleEditor} from '../features/documents/TiptapSampleEditor';
import {toTiptap} from '../features/documents/tiptapSampleAdapter';
import type {ContentView,DocumentBody} from '../features/content/types';
import '../features/content/content.css';
import '../features/documents/tiptapSample.css';
function sampleBody():DocumentBody {
 const block=(type:string,text:string,props?:Record<string,unknown>)=>({id:crypto.randomUUID(),type,props,content:[{type:'text',text,styles:{}}],children:[]});
 return {formatVersion:1,blocks:[block('heading','项目与部署说明',{level:2}),block('paragraph','在这里记录服务器用途、部署方式和访问说明。'),block('heading','部署截图',{level:2}),block('paragraph','把光标放在这里，直接粘贴截图。')]};
}
export function DocumentSample() {
 const {id}=useParams(),{user}=useAuth(),navigate=useNavigate(),{projects,selectedProjectId,projectsLoading}=useProjectContext();
 const [project,setProject]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[loaded,setLoaded]=useState<{key:string;view:ContentView<DocumentBody>}>();
 const key=`${user!.id}:${id}`;
 useEffect(()=>{if(!id) return;const controller=new AbortController();setError('');documentsApi.get(id,controller.signal).then(view=>{toTiptap(view.payload);if(!controller.signal.aborted) setLoaded({key,view});}).catch(e=>{if(!controller.signal.aborted) setError(e.message);});return()=>controller.abort();},[key]);
 async function create(){setBusy(true);setError('');try{const view=await documentsApi.create({projectId:project||selectedProjectId||projects[0]?.id,title:'项目部署说明 · 编辑样板',payload:sampleBody()});navigate(`/documents/${view.id}/sample`);}catch(e:any){setError(e.message);}finally{setBusy(false);}}
 if(id&&loaded?.key===key) return <SampleWorkspace key={key} initial={loaded.view}/>;
 return <section className="tiptap-sample"><header className="sample-page-header"><div><h1>文档编辑样板</h1><p>直接编辑正文，截图粘贴后自动保存。</p></div><Link className="sample-back-link" to="/documents">返回文档中心</Link></header>{error&&<p className="sample-error" role="alert">{error}</p>}{id&&!error?<p role="status">正在读取文档…</p>:!id&&<div className="sample-start"><h2>新建一份样板文档</h2><p>选择所属项目后开始编辑，已有文档可继续使用原编辑器。</p><Select label="所属项目" value={project||selectedProjectId||projects[0]?.id||''} options={projects.map(p=>({value:p.id,label:p.name}))} onValueChange={setProject}/><Button loading={busy} disabled={projectsLoading||!projects.length||user?.role!=='admin'} onClick={()=>void create()}>创建样板文档</Button></div>}</section>;
}
function SampleWorkspace({initial}:{initial:ContentView<DocumentBody>}) {
 const session=useContentEditor('document',initial),{view,state,queue}=session,{projects}=useProjectContext(),navigate=useNavigate();
 const previews=useRef(new Map<string,string>());
 useEffect(()=>()=>{for(const url of previews.current.values()) URL.revokeObjectURL(url);},[]);
 async function resolveImage(id:string,assetId:string|null){const existing=previews.current.get(id);if(existing) return existing;if(assetId) return session.readAssetUrl(assetId);const blob=await session.readAsset(`pending:${id}`);const url=URL.createObjectURL(blob);previews.current.set(id,url);return url;}
 const editable=view.canEdit&&!['auth-paused','deleted','conflict'].includes(state.phase);
 const headings=view.payload.blocks.filter(b=>b.type==='heading');
 return <section className="tiptap-sample"><LogoutGuard queue={queue}/><header className="sample-page-header"><div><h1>文档编辑样板</h1><p>{projects.find(p=>p.id===view.projectId)?.name||'项目文档'} · 正文内直接编辑</p></div><div className="sample-header-actions"><SaveStatus state={state} onRetry={()=>void queue.flush()} onExport={()=>void session.exportRecovery()}/><Link className="sample-back-link" to="/documents">返回文档中心</Link></div></header>
  {(session.error||state.draftError)&&<p className="sample-error" role="alert">{session.error||state.draftError}</p>}
  {session.pendingFiles.length>0&&<div className="sample-notice"><span>图片尚未保存，请等待上传完成。</span><Button variant="secondary" onClick={()=>void session.retryUploads()}>重试图片上传</Button></div>}
  {session.newVersion&&<p className="sample-notice">此文档在其他位置有更新，请先保存当前更改后重新打开。</p>}
  <div className="sample-document-layout"><article className="sample-paper"><input className="sample-document-title" aria-label="文档标题" placeholder="未命名文档" maxLength={300} value={view.title} readOnly={!editable} onChange={event=>session.update(event.target.value,view.payload)}/><TiptapSampleEditor body={view.payload} editable={editable} onChange={body=>session.update(session.current.current.title,body)} onComposition={queue.setComposing} upload={session.upload} resolveImage={resolveImage} onError={session.setError} onPreview={(id,file)=>{previews.current.set(id,URL.createObjectURL(file));}}/></article><aside className="sample-outline" aria-label="文章目录"><h2>目录</h2>{headings.map(block=><button key={block.id} style={{paddingLeft:block.props?.level===3?20:8}} onClick={()=>{const target=Array.from(document.querySelectorAll<HTMLElement>('.tiptap-sample [data-id]')).find(node=>node.dataset.id===block.id);target?.scrollIntoView({behavior:'smooth',block:'start'});}}>{(block.content||[]).map((part:any)=>part.text||'').join('')||'未命名标题'}</button>)}{!headings.length&&<p>添加标题后自动生成目录</p>}</aside></div>
  {view.canEdit&&<DraftRecoveryDialog draft={session.drafts[0]} serverVersion={state.version} onRestore={draft=>{try{toTiptap(draft.payload);session.restoreDraft(draft);}catch(e:any){session.setError(e.message);}}} onDiscard={session.discardDraft}/>}
  <ConflictDialog open={state.phase==='conflict'} onServer={async()=>{window.open(`${import.meta.env.BASE_URL}documents/${view.id}/sample`,'_blank','noopener,noreferrer');}} onDuplicate={async()=>{const copy=await session.localCopy();navigate(`/documents/${copy.id}/sample`);}} onOverwrite={session.overwrite}/>
 </section>;
}
