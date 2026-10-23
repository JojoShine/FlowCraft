import {useEffect,useMemo,useRef,useState} from 'react';
import {useAuth} from '../../contexts/AuthContext';
import {documentsApi,drawingsApi,contentAssetsApi,contentPreferencesApi} from './api';
import {contentDraftIdentity,useContentAutosave} from './useContentAutosave';
import {useContentAssets} from './useContentAssets';
import type {BlobDraft,ContentKind,ContentView,DocumentBody,DrawingScene,LocalDraft,SaveEnvelope} from './types';
import {exportRecoveryDraft} from './LogoutGuard';
export function useContentEditor<T extends DocumentBody|DrawingScene>(kind:ContentKind,initial:ContentView<T>) {
 const {user}=useAuth();const identity=useMemo(()=>contentDraftIdentity(user!.id,initial.projectId,kind,initial.id),[user!.id,initial.projectId,kind,initial.id]);
 const [view,setView]=useState(initial),current=useRef(initial),pending=useRef<BlobDraft[]>([]),pendingArchive=useRef(new Map<string,BlobDraft>()),[error,setError]=useState(''),[newVersion,setNewVersion]=useState(false);
 const api=kind==='document'?documentsApi:drawingsApi;
 const autosave=useContentAutosave(identity,initial,(input:SaveEnvelope<T>,signal)=>kind==='document'?documentsApi.save(initial.id,input as SaveEnvelope<DocumentBody>,signal):drawingsApi.save(initial.id,input as SaveEnvelope<DrawingScene>,signal));
 const {queue,state}=autosave,assets=useContentAssets(identity);
 function update(title:string,payload:T) {if(kind==='document') {const ids=new Set<string>();function collect(blocks:DocumentBody['blocks']) {for(const block of blocks) {ids.add(block.id);if(block.props?.url?.startsWith('pending:')) ids.add(block.props.url.slice(8));collect(block.children||[]);}}collect((payload as DocumentBody).blocks);pending.current=Array.from(pendingArchive.current.values()).filter(record=>ids.has(record.targetId));if(!pending.current.length) setError('');}const next={...current.current,title,payload};current.current=next;setView(next);queue.update(title,payload,pending.current);}
 async function upload(file:File,targetId:string) {
  const record:BlobDraft={localId:crypto.randomUUID(),targetId,fileName:file.name,mimeType:file.type,blob:file};pendingArchive.current.set(record.localId,record);pending.current=[...pending.current,record];queue.update(current.current.title,current.current.payload,pending.current);
  try {const result=await assets.upload(file,initial.projectId,file.type.startsWith('image/')?'image':'attachment');pendingArchive.current.delete(record.localId);pending.current=pending.current.filter(p=>p.localId!==record.localId);queue.update(current.current.title,current.current.payload,pending.current);return result;}
  catch(e:any){setError(e.message);throw e;}
 }
 async function retryUploads() {
  setError('');try {for(const record of [...pending.current]) {
   const result=await assets.upload(new File([record.blob],record.fileName,{type:record.mimeType}),initial.projectId,record.mimeType.startsWith('image/')?'image':'attachment');
   const payload=structuredClone(current.current.payload);
   if(kind==='drawing') (payload as DrawingScene).files[record.targetId]={assetId:result.id};
   else {function patch(blocks:DocumentBody['blocks']) {for(const block of blocks) {if(block.id===record.targetId||block.props?.url===`pending:${record.targetId}`) block.props={...block.props,assetId:result.id,url:`asset:${result.id}`,name:record.fileName};patch(block.children||[]);}}patch((payload as DocumentBody).blocks);}
   pendingArchive.current.delete(record.localId);pending.current=pending.current.filter(p=>p.localId!==record.localId);update(current.current.title,payload as T);
  }}catch(e:any){setError(e.message);}
 }
 async function readAsset(id:string):Promise<Blob> {if(id.startsWith('pending:')) {const localId=id.slice(8),record=Array.from(pendingArchive.current.values()).find(p=>p.localId===localId||p.targetId===localId);if(record) return record.blob;throw new Error('本地图片草稿缺失');}return contentAssetsApi.read(id,{kind,id:initial.id});}
 async function drain():Promise<boolean> {while(queue.getSnapshot().phase!=='saved') {const ack=await queue.flush();if(!ack) return false;}return true;}
 function acceptServer(next:ContentView<T>) {pending.current=[];pendingArchive.current.clear();current.current=next;setView(next);queue.acceptServer(next.title,next.payload,next.version);setNewVersion(false);}
 async function reload() {const next=await api.get(initial.id) as ContentView<T>;acceptServer(next);}
 function restoreDraft(draft:LocalDraft<T>) {pending.current=draft.pendingFiles;pendingArchive.current=new Map(draft.pendingFiles.map(record=>[record.localId,record]));const next={...current.current,title:draft.title,payload:draft.payload};current.current=next;setView(next);autosave.restoreDraft(draft);}
 useEffect(()=>{void contentPreferencesApi.set(kind,initial.id,{lastViewedAt:new Date().toISOString()}).catch(()=>{});const key=(event:KeyboardEvent)=>{if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='s') {event.preventDefault();if(initial.canEdit) void queue.flush();}};const focus=()=>{api.get(initial.id).then(next=>{if(next.version!==queue.getSnapshot().version) setNewVersion(true);}).catch(e=>{if([404,410].includes(e.response?.status)) queue.pause('deleted');});};window.addEventListener('keydown',key);window.addEventListener('focus',focus);return ()=>{window.removeEventListener('keydown',key);window.removeEventListener('focus',focus);};},[queue]);
 return {view,current,identity,queue,state,update,upload,readAsset,readAssetUrl:(assetId:string)=>assets.readUrl(assetId,{kind,id:initial.id}),retryUploads,pendingFiles:pending.current,error,setError,newVersion,reload,acceptServer,drain,restoreDraft,drafts:autosave.drafts,discardDraft:autosave.discardDraft,recoveryError:autosave.recoveryError,
  exportRecovery:()=>exportRecoveryDraft(queue),
  overwrite:async()=>{const fresh=await api.get(initial.id);if(!fresh.canEdit) throw new Error('当前没有编辑权限');queue.resume(fresh.version);await queue.flush();},
  localCopy:async()=>{if(pending.current.length) throw new Error('请先重试文件上传，或导出恢复草稿');const input={projectId:initial.projectId,title:`${current.current.title.slice(0,290)} 副本`,payload:current.current.payload};const copy=kind==='document'?await documentsApi.create(input as any):await drawingsApi.create(input as any);await reload();return copy;},
 };
}
