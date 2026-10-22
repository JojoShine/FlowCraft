import {useState} from 'react';
export function ConflictDialog({open,onServer,onDuplicate,onOverwrite}:{open:boolean;onServer:()=>Promise<void>;onDuplicate:()=>Promise<void>;onOverwrite:()=>Promise<void>}) {
 const [confirm,setConfirm]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 if(!open) return null;
 async function action(fn:()=>Promise<void>) {setBusy(true);setError('');try {await fn();setConfirm(false);}catch(e:any){setError(e.message);}finally {setBusy(false);}}
 return <div className="content-modal-backdrop"><section className="content-modal" role="dialog" aria-modal="true" aria-label="发现其他位置的更新"><h2>发现其他位置的更新</h2><p>本地更改已保留。请选择如何处理，系统不会自动覆盖。</p>{error&&<p role="alert">{error}</p>}<button disabled={busy} onClick={()=>void action(onServer)}>查看服务器版本</button><button disabled={busy} onClick={()=>void action(onDuplicate)}>保留本地为副本</button>{confirm?<><p>确认用本地内容更新？提交前会再次检查服务器版本；若又有更新，将继续提示冲突。</p><button disabled={busy} onClick={()=>void action(onOverwrite)}>确认更新</button><button onClick={()=>setConfirm(false)}>返回</button></>:<button disabled={busy} onClick={()=>setConfirm(true)}>用本地内容更新</button>}</section></div>;
}
