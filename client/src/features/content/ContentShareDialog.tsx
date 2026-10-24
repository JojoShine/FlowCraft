import {useEffect,useState} from 'react';
import {X} from 'lucide-react';
import {Button} from '../../components/ui/Button';
import {sharingApi,shareUrl} from './sharingApi';
import type {ContentKind} from './types';
export function ContentShareDialog({kind,id,onClose}:{kind:ContentKind;id:string;onClose:()=>void}) {
 const [token,setToken]=useState<string|null>(),[busy,setBusy]=useState(false),[error,setError]=useState(''),[copied,setCopied]=useState(false),[retry,setRetry]=useState(0);
 useEffect(()=>{const controller=new AbortController();setError('');setToken(undefined);sharingApi.status(kind,id,controller.signal).then(value=>{if(!controller.signal.aborted)setToken(value.shareToken);}).catch(e=>{if(!controller.signal.aborted)setError(e.message);});return()=>controller.abort();},[kind,id,retry]);
 async function toggle() {setBusy(true);setError('');try {if(token){await sharingApi.disable(kind,id);setToken(null);}else setToken((await sharingApi.enable(kind,id)).shareToken);setCopied(false);}catch(e:any){setError(e.message);}finally{setBusy(false);}}
 const url=token?shareUrl(kind,token):'';
 return <div className="content-modal-backdrop"><section className="content-modal content-share-dialog" role="dialog" aria-modal="true" aria-labelledby="content-share-title" onKeyDown={event=>{if(event.key==='Escape')onClose();}}><header><h2 id="content-share-title">分享{kind==='document'?'文档':'绘图'}</h2><Button variant="ghost" aria-label="关闭分享设置" style={{width:32,height:32,minHeight:32,padding:0,flexShrink:0}} onClick={onClose} autoFocus><X size={16}/></Button></header><p className="content-share-description">获得链接的人无需登录即可只读查看最新保存的内容，包括其中的图片、附件和内嵌绘图。</p>
  {token===undefined?!error&&<p role="status">正在读取分享设置…</p>:token?<><label className="content-field">分享链接<div className="content-share-link"><input aria-label="分享链接" value={url} readOnly onClick={event=>event.currentTarget.select()}/><Button disabled={busy} onClick={()=>void navigator.clipboard.writeText(url).then(()=>setCopied(true)).catch(()=>setError('复制失败，请选中链接手动复制'))}>{copied?'已复制':'复制链接'}</Button></div></label><p className="content-muted">关闭分享后，此链接及其附件访问立即失效。</p></>:<p className="content-muted">当前未开启分享。</p>}
  {error&&<p className="content-warning" role="alert">{error}</p>}<footer className="content-modal-actions">{token===undefined?error&&<Button variant="secondary" onClick={()=>setRetry(value=>value+1)}>重新读取</Button>:<Button variant={token?'danger':'primary'} disabled={busy} onClick={()=>void toggle()}>{busy?'正在处理…':token?'关闭分享':'开启分享'}</Button>}</footer>
 </section></div>;
}
