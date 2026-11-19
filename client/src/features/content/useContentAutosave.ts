import {useEffect,useMemo,useRef,useState,useSyncExternalStore} from 'react';
import {createSaveQueue} from './saveQueue';
import {draftStore} from './draftStore';
import type {ContentView,DraftKey,LocalDraft,SaveAck,SaveEnvelope} from './types';
export function contentDraftIdentity(userId:string,projectId:string,kind:DraftKey['kind'],id:string):DraftKey {
 return {userId,projectId,kind,id,sessionId:crypto.randomUUID()};
}
export function useContentAutosave<T>(identity:DraftKey,view:ContentView<T>,save:(input:SaveEnvelope<T>,signal:AbortSignal)=>Promise<SaveAck>) {
 const identityKey=JSON.stringify(identity),saveRef=useRef(save);saveRef.current=save;
 const queue=useMemo(()=>createSaveQueue({identity,initialVersion:view.version,initialTitle:view.title,initialPayload:view.payload,save:(input,signal)=>saveRef.current(input,signal),draftStore}),[identityKey]);
 const state=useSyncExternalStore(queue.subscribe,queue.getSnapshot);
 const [drafts,setDrafts]=useState<LocalDraft<T>[]>([]),[recoveryError,setRecoveryError]=useState<string>();
 const recovered=useRef<DraftKey|null>(null);
 useEffect(()=>{
  let active=true;draftStore.list<T>(identity.userId).then(rows=>{if(active) setDrafts(rows.filter(d=>d.key.projectId===identity.projectId&&d.key.kind===identity.kind&&d.key.id===identity.id));}).catch(error=>{if(active) setRecoveryError(error.message);});
  const auth=()=>queue.pause('auth'),online=()=>{if(view.canEdit) void queue.flush();};window.addEventListener('auth:logout',auth);window.addEventListener('online',online);
  return ()=>{active=false;window.removeEventListener('auth:logout',auth);window.removeEventListener('online',online);queue.dispose();};
 },[queue]);
 useEffect(()=>{if(state.phase==='saved'&&state.lastAck&&recovered.current) {void draftStore.remove(recovered.current);recovered.current=null;}},[state.phase,state.lastAck]);
 return {queue,state,drafts,recoveryError,
  update:(title:string,payload:T,pendingFiles=queue.getDraft()?.pendingFiles||[])=>{if(view.canEdit) queue.update(title,payload,pendingFiles);},
  restoreDraft:(draft:LocalDraft<T>)=>{recovered.current=draft.key;queue.restoreDraft(draft);setDrafts([]);},
  discardDraft:async(draft:LocalDraft<T>)=>{await draftStore.remove(draft.key);setDrafts(rows=>rows.filter(d=>JSON.stringify(d.key)!==JSON.stringify(draft.key)));},
 };
}
