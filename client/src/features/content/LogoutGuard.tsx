import {useEffect,useRef,useState} from 'react';
import {useAuth} from '../../contexts/AuthContext';
import type {SaveQueue} from './saveQueue';
export async function exportRecoveryDraft<T>(queue:SaveQueue<T>) {
 const draft=queue.getDraft();if(!draft) return;
 const pendingFiles=await Promise.all(draft.pendingFiles.map(async file=>({...file,blob:undefined,dataURL:await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(reader.error);reader.readAsDataURL(file.blob);})})));
 const blob=new Blob([JSON.stringify({type:'flowcraft-recovery-draft',formatVersion:1,...draft,pendingFiles},null,2)],{type:'application/json'});
 const url=URL.createObjectURL(blob),anchor=document.createElement('a');anchor.href=url;anchor.download=`${draft.title||'文档'}-恢复草稿.json`;anchor.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export function LogoutGuard<T>({queue}:{queue:SaveQueue<T>}) {
 const {registerLogoutGuard}=useAuth();const [mode,setMode]=useState<'logout'|'navigate'|null>(null),[error,setError]=useState('');
 const resolver=useRef<((allowed:boolean)=>void)|null>(null);
 useEffect(()=>{
  async function guard(reason:'logout'|'navigate'):Promise<boolean> {
   while(queue.getSnapshot().phase!=='saved') {const ack=await queue.flush();if(!ack) break;}
   if(queue.getSnapshot().phase==='saved') return true;
   await queue.persist();setMode(reason);return new Promise(resolve=>{resolver.current=resolve;});
  }
  const unregister=registerLogoutGuard(()=>guard('logout'));
  const unload=(event:BeforeUnloadEvent)=>{if(queue.getSnapshot().localSequence!==queue.getSnapshot().ackedSequence) {void queue.persist();event.preventDefault();event.returnValue='';}};
  let allowedAnchor:HTMLAnchorElement|null=null;
  const click=(event:MouseEvent)=>{
   const anchor=(event.target as Element)?.closest?.('a[href]') as HTMLAnchorElement|null;
   if(!anchor||anchor===allowedAnchor||event.ctrlKey||event.metaKey||event.shiftKey||anchor.target==='_blank'||anchor.download) {if(anchor===allowedAnchor) allowedAnchor=null;return;}
   const url=new URL(anchor.href);if(url.origin!==location.origin||url.pathname===location.pathname||queue.getSnapshot().phase==='saved') return;
   event.preventDefault();event.stopImmediatePropagation();void guard('navigate').then(allowed=>{if(allowed) {allowedAnchor=anchor;anchor.click();}});
  };
  window.addEventListener('beforeunload',unload);document.addEventListener('click',click,true);
  return ()=>{unregister();window.removeEventListener('beforeunload',unload);document.removeEventListener('click',click,true);resolver.current?.(false);};
 },[queue,registerLogoutGuard]);
 const answer=(allowed:boolean)=>{setMode(null);resolver.current?.(allowed);resolver.current=null;};
 if(!mode) return null;
 return <div className="content-modal-backdrop"><section className="content-modal" role="dialog" aria-modal="true" aria-label="还有未保存更改"><h2>还有未保存更改</h2><p>请先同步或导出恢复草稿，再{mode==='logout'?'退出登录':'离开页面'}。草稿包含尚未上传的文件。</p>{error&&<p role="alert">{error}</p>}<button onClick={()=>answer(false)}>返回继续编辑</button><button onClick={()=>void (async()=>{try {await exportRecoveryDraft(queue);if(mode==='logout') await queue.discardDraft();answer(true);}catch(e:any){setError(e.message);}})()}>导出恢复草稿并{mode==='logout'?'退出':'离开'}</button>{mode==='navigate'&&queue.getSnapshot().draftPersisted&&<button onClick={()=>answer(true)}>保留本地草稿并离开</button>}</section></div>;
}
