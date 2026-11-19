import {useEffect,useState} from 'react';
import * as Popover from '@radix-ui/react-popover';
import {Share2} from 'lucide-react';
import {Button} from '../../components/ui/Button';
import {sharingApi,shareUrl} from './sharingApi';
import type {ContentKind} from './types';
export function ContentSharePopover({kind,id,beforeOpen}:{kind:ContentKind;id:string;beforeOpen:()=>Promise<boolean>}) {
 const [open,setOpen]=useState(false),[token,setToken]=useState<string|null>(),[busy,setBusy]=useState(false),[error,setError]=useState(''),[copied,setCopied]=useState(false),[retry,setRetry]=useState(0);
 useEffect(()=>{if(!open)return;const controller=new AbortController();setError('');setToken(undefined);setCopied(false);sharingApi.status(kind,id,controller.signal).then(value=>{if(!controller.signal.aborted)setToken(value.shareToken);}).catch(e=>{if(!controller.signal.aborted)setError(e.message);});return()=>controller.abort();},[kind,id,retry,open]);
 async function toggle() {setBusy(true);setError('');try {if(token){await sharingApi.disable(kind,id);setToken(null);}else setToken((await sharingApi.enable(kind,id)).shareToken);setCopied(false);}catch(e:any){setError(e.message);}finally{setBusy(false);}}
 const url=token?shareUrl(kind,token):'';
 return <Popover.Root open={open} onOpenChange={next=>{if(!next)setOpen(false);else void beforeOpen().then(saved=>{if(saved)setOpen(true);});}}><Popover.Trigger asChild><button type="button" className="content-header-action"><Share2 size={12}/>分享</button></Popover.Trigger><Popover.Portal><Popover.Content className="content-share-popover" align="end" sideOffset={4} aria-label={`分享${kind==='document'?'文档':'绘图'}`}>
  {token===undefined?!error&&<p role="status">正在读取分享设置…</p>:token?<><p className="content-share-description">公开链接（任何人可通过此链接只读查看）</p><div className="content-share-link"><input aria-label="分享链接" value={url} readOnly onClick={event=>event.currentTarget.select()}/><Button size="sm" style={{height:30,fontSize:12}} disabled={busy} aria-label={copied?'已复制':'复制链接'} onClick={()=>void navigator.clipboard.writeText(url).then(()=>setCopied(true)).catch(()=>setError('复制失败，请选中链接手动复制'))}>{copied?'已复制':'复制'}</Button></div><button className="content-share-disable" disabled={busy} onClick={()=>void toggle()}>{busy?'正在处理…':'取消分享'}</button></>:<><p>当前未开启分享。</p><p className="content-share-description">开启后，任何人可通过链接只读查看。</p><Button size="sm" style={{height:30,fontSize:12}} disabled={busy} onClick={()=>void toggle()}>{busy?'正在处理…':'开启分享'}</Button></>}
  {error&&<p className="content-warning" role="alert">{error}</p>}{token===undefined&&error&&<Button size="sm" variant="secondary" onClick={()=>setRetry(value=>value+1)}>重新读取</Button>}
 </Popover.Content></Popover.Portal></Popover.Root>;
}
