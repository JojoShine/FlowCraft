import {lazy,Suspense,useEffect,useMemo,useState} from 'react';
import {Link,useLocation,useParams} from 'react-router-dom';
import {useAuth} from '../contexts/AuthContext';
import {DocumentEditor} from '../features/documents/DocumentEditor';
import {DocumentOutline} from '../features/documents/DocumentOutline';
import {publicSharingApi} from '../features/content/sharingApi';
import {documentsApi,drawingsApi} from '../features/content/api';
import type {ContentView,DocumentBody,DrawingScene,DrawingReference,ResolvedEmbed} from '../features/content/types';
import '../features/content/content.css';
const ExcalidrawEditor=lazy(()=>import('../features/drawings/ExcalidrawEditor').then(m=>({default:m.ExcalidrawEditor})));
function SharedDrawing({view,token,blockId}:{view:ContentView<DrawingScene>;token:string;blockId?:string}) {
 return <div className={blockId?'shared-content-embed-canvas':'shared-content-canvas'}><Suspense fallback={<p role="status">正在加载绘图…</p>}><ExcalidrawEditor view={{...view,canEdit:false}} readAsset={id=>publicSharingApi.asset(blockId?'document':'drawing',token,id,undefined,blockId)} onChange={()=>{}} onComposition={()=>{}}/></Suspense></div>;
}
function SharedEmbed({token,reference}:{token:string;reference:DrawingReference}) {
 const [value,setValue]=useState<ResolvedEmbed>(),[error,setError]=useState('');
 useEffect(()=>{const controller=new AbortController();const load=()=>publicSharingApi.embed(token,reference.blockId,controller.signal).then(result=>{if(!controller.signal.aborted){setValue(result);setError('');}}).catch(e=>{if(!controller.signal.aborted){setValue(undefined);setError(e.message);}});void load();window.addEventListener('focus',load);return()=>{controller.abort();window.removeEventListener('focus',load);};},[token,reference.blockId]);
 return <figure className="drawing-embed"><header><strong>{value?.title||'内嵌绘图'}</strong></header>{value?.scene?<SharedDrawing token={token} blockId={reference.blockId} view={{id:value.drawingId,projectId:'',title:value.title,version:value.revision,payload:value.scene,savedAt:'',canEdit:false,deletedAt:null}}/>:<p className="content-muted">{error||(!value?'正在读取绘图…':value.status==='deleted'?'绘图已移入回收站':'绘图暂时不可访问')}</p>}</figure>;
}
function SharedDocument({view,token}:{view:ContentView<DocumentBody>;token:string}) {
 const assets=useMemo(()=>({urls:new Map<string,string>(),controller:new AbortController()}),[token,view.version]);
 useEffect(()=>()=>{assets.controller.abort();for(const url of assets.urls.values())URL.revokeObjectURL(url);},[assets]);
 async function resolveAsset(id:string) {let url=assets.urls.get(id);if(url)return url;const blob=await publicSharingApi.asset('document',token,id,assets.controller.signal);if(assets.controller.signal.aborted)throw new DOMException('分享页面已关闭','AbortError');url=URL.createObjectURL(blob);assets.urls.set(id,url);return url;}
 return <div className="content-editor-body"><DocumentEditor view={{...view,canEdit:false}} onChange={()=>{}} onComposition={()=>{}} resolveAsset={resolveAsset} renderDocumentLink={()=> <span className="content-muted">关联文档未包含在此次分享中</span>} renderDrawing={reference=><SharedEmbed token={token} reference={reference}/>}/><DocumentOutline blocks={view.payload.blocks}/></div>;
}
export function SharedContent() {
 const {kind='',token=''}=useParams(),[view,setView]=useState<ContentView<DocumentBody|DrawingScene>>(),[error,setError]=useState('');
 const {user,loading}=useAuth(),{pathname}=useLocation();
 const [editAccess,setEditAccess]=useState<{sharePath:string;userId:string;href:string}>();
 useEffect(()=>{
  const referrer=document.querySelector<HTMLMetaElement>('meta[name="referrer"]'),previous=referrer?.content,meta=referrer||document.createElement('meta');meta.name='referrer';meta.content='no-referrer';if(!referrer)document.head.append(meta);
  const robots=document.createElement('meta');robots.name='robots';robots.content='noindex,nofollow,noarchive';document.head.append(robots);
  return()=>{if(referrer)referrer.content=previous||'';else meta.remove();robots.remove();};
 },[]);
 useEffect(()=>{
  if(kind!=='document'&&kind!=='drawing'){setError('分享已关闭或内容不存在');return;}
  setView(undefined);setError('');setEditAccess(undefined);
  let activeRequest:AbortController|undefined;
  const load=async()=>{
   activeRequest?.abort();const request=new AbortController();activeRequest=request;
   try {
    const result=await publicSharingApi.read(kind,token,request.signal);
    if(request.signal.aborted) return;
    setView(result);setError('');
    if(!user||(user.role==='viewer'&&user.projectId!==result.projectId)) return;
    const api=kind==='document'?documentsApi:drawingsApi;
    const editable=await api.get(result.id,request.signal).then(item=>item.canEdit,()=>false);
    if(!request.signal.aborted) setEditAccess(editable?{sharePath:pathname,userId:user.id,href:`/${kind}s/${encodeURIComponent(result.id)}`}:undefined);
   }catch(e){if(!request.signal.aborted){setView(undefined);setEditAccess(undefined);setError(e instanceof Error?e.message:'分享暂时无法读取');}}
  };
  void load();window.addEventListener('focus',load);return()=>{activeRequest?.abort();window.removeEventListener('focus',load);};
 },[kind,token,pathname,user?.id,user?.role,user?.projectId]);
 const mayEdit=editAccess?.sharePath===pathname&&editAccess.userId===user?.id;
 return <main className="shared-content-page">
  <header className="shared-content-header"><strong>FlowCraft</strong><div className="shared-content-actions"><span>只读分享</span>
   {view&&mayEdit&&<Link className="content-header-action" to={editAccess.href}>{kind==='document'?'编辑文档':'编辑绘图'}</Link>}
   {view&&!user&&!loading&&<Link className="content-header-action" to="/login" state={{returnTo:pathname}}>登录后编辑</Link>}
  </div></header>
  <div className="shared-content-scroll">
   <section className="content-workspace">{error?<p className="content-warning" role="alert">{error}</p>:!view?<p role="status">正在读取分享内容…</p>:kind==='document'?<SharedDocument key={token+':'+view.version} token={token} view={view as ContentView<DocumentBody>}/>:<><h1 className="shared-content-title">{view.title}</h1><SharedDrawing key={token+':'+view.version} token={token} view={view as ContentView<DrawingScene>}/></>}</section>
  </div>
 </main>;
}
