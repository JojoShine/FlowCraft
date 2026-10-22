import type {DraftKey,BlobDraft,LocalDraft,SaveAck,SaveEnvelope} from './types';
import type {DraftStore} from './draftStore';
export interface SaveState {
 phase:'saved'|'dirty'|'saving'|'offline'|'error'|'conflict'|'auth-paused'|'deleted';
 localSequence:number;ackedSequence:number;version:number;savedAt:string|null;draftPersisted:boolean;lastAck:SaveAck|null;error?:string;draftError?:string;
}
export interface SaveQueueOptions<T> {identity:DraftKey;initialVersion:number;initialTitle?:string;initialPayload?:T;save:(input:SaveEnvelope<T>,signal:AbortSignal)=>Promise<SaveAck>;draftStore:DraftStore}
export type SaveQueue<T>=ReturnType<typeof createSaveQueue<T>>;
export function createSaveQueue<T>(options:SaveQueueOptions<T>) {
 let state:SaveState={phase:'saved',localSequence:0,ackedSequence:0,version:options.initialVersion,savedAt:null,draftPersisted:false,lastAck:null};
 let latest:{title:string;payload:T;pendingFiles:BlobDraft[]}|null=options.initialPayload===undefined?null:{title:options.initialTitle||'',payload:options.initialPayload,pendingFiles:[]};
 let composing=false,disposed=false,epoch=0;
 let idle:ReturnType<typeof setTimeout>|undefined,max:ReturnType<typeof setTimeout>|undefined,local:ReturnType<typeof setTimeout>|undefined;
 let inFlight:Promise<SaveAck|null>|null=null;
 let attempt:{envelope:SaveEnvelope<T>;sequence:number;controller:AbortController}|null=null;
 let draftChain:Promise<void>=Promise.resolve();
 const listeners=new Set<()=>void>();
 const emit=(patch:Partial<SaveState>)=>{state={...state,...patch};for(const fn of listeners) fn();};
 const paused=()=>['auth-paused','conflict','deleted'].includes(state.phase);
 const stopTimers=()=>{clearTimeout(idle);clearTimeout(max);clearTimeout(local);idle=max=local=undefined;};
 function getDraft():LocalDraft<T>|null {return latest?{key:options.identity,baseVersion:state.version,localSequence:state.localSequence,...latest,updatedAt:Date.now()}:null;}
 function persist():Promise<void> {
  const draft=getDraft();if(!draft) return draftChain;
  draftChain=draftChain.catch(()=>{}).then(async()=>{try {await options.draftStore.put(draft);if(draft.localSequence===state.localSequence) emit({draftPersisted:true,draftError:undefined});}catch(error:any){emit({draftPersisted:false,draftError:error.message||'本地草稿不可用，请导出当前内容'});}});return draftChain;
 }
 function removeDraft() {draftChain=draftChain.catch(()=>{}).then(()=>options.draftStore.remove(options.identity)).catch((error:any)=>{emit({draftError:error.message});});return draftChain;}
 function schedule() {
  clearTimeout(idle);idle=setTimeout(()=>{idle=undefined;void flush('auto');},2000);
  if(!max) max=setTimeout(()=>{max=undefined;void flush('auto');},10000);
  clearTimeout(local);local=setTimeout(()=>{local=undefined;void persist();},500);
 }
 function update(title:string,payload:T,pendingFiles:BlobDraft[]=[]) {
  if(disposed) return;
  if(latest&&JSON.stringify([latest.title,latest.payload,latest.pendingFiles.map(f=>f.localId)])===JSON.stringify([title,payload,pendingFiles.map(f=>f.localId)])) return;
  latest={title,payload,pendingFiles};emit({localSequence:state.localSequence+1,draftPersisted:false,...(!paused()?{phase:inFlight?'saving':'dirty',error:undefined}:{})});schedule();
 }
 function flush(source:'auto'|'manual'='manual'):Promise<SaveAck|null> {
  if(inFlight) return inFlight;
  if(disposed||paused()||composing||!latest||state.localSequence===state.ackedSequence) return Promise.resolve(null);
  if(latest.pendingFiles.length) {emit({phase:'dirty',error:'文件尚未上传完成，可重试上传或导出草稿'});void persist();return Promise.resolve(null);}
  clearTimeout(idle);clearTimeout(max);idle=max=undefined;
  if(!attempt) attempt={envelope:{baseVersion:state.version,requestId:crypto.randomUUID(),source,title:latest.title,payload:latest.payload},sequence:state.localSequence,controller:new AbortController()};
  const request=attempt,capturedEpoch=epoch;emit({phase:'saving',error:undefined});
  inFlight=(async()=>{
   try {
    const ack=await options.save(request.envelope,request.controller.signal);
    if(disposed||capturedEpoch!==epoch) return null;
    if(ack.requestId!==request.envelope.requestId||!Number.isInteger(ack.version)||ack.version<request.envelope.baseVersion) throw new Error('服务器保存确认无效');
    attempt=null;
    emit({ackedSequence:request.sequence,version:ack.version,savedAt:ack.savedAt,lastAck:ack,phase:state.localSequence===request.sequence?'saved':'dirty'});
    if(state.localSequence===request.sequence) await removeDraft();else await persist();
    return ack;
   } catch(error:any) {
    if(disposed||capturedEpoch!==epoch) return null;
    const status=error.response?.status;
    emit({phase:status===409?'conflict':status===401?'auth-paused':status===410||status===404?'deleted':navigator.onLine?'error':'offline',error:error.message||'保存失败，请重试'});
    await persist();return null;
   } finally {inFlight=null;}
  })();return inFlight;
 }
 function pause(reason:'auth'|'conflict'|'deleted') {epoch++;stopTimers();attempt?.controller.abort();emit({phase:reason==='auth'?'auth-paused':reason});void persist();}
 return {
  update,flush,getDraft,
  getSnapshot:()=>state,
  subscribe:(fn:()=>void)=>{listeners.add(fn);return ()=>{listeners.delete(fn);};},
  setComposing:(value:boolean)=>{composing=value;if(!value&&state.localSequence!==state.ackedSequence&&!paused()) void flush('auto');},
  pause,
  persist,
  discardDraft:()=>removeDraft(),
  restoreDraft:(draft:LocalDraft<T>)=>{stopTimers();attempt=null;latest={title:draft.title,payload:draft.payload,pendingFiles:draft.pendingFiles};emit({localSequence:state.localSequence+1,draftPersisted:true,phase:draft.baseVersion===state.version?'dirty':'conflict'});},
  resume:(version:number)=>{attempt=null;emit({version,phase:'dirty',error:undefined});},
  acceptServer:(title:string,payload:T,version:number)=>{stopTimers();attempt=null;latest={title,payload,pendingFiles:[]};emit({version,localSequence:state.localSequence+1,ackedSequence:state.localSequence+1,phase:'saved',error:undefined});void removeDraft();},
  dispose:()=>{if(disposed) return;if(state.localSequence!==state.ackedSequence) void persist();disposed=true;epoch++;stopTimers();attempt?.controller.abort();listeners.clear();},
 };
}
