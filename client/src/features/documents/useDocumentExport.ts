import {useEffect,useRef,useState} from 'react';
import {useAuth} from '../../contexts/AuthContext';
import {documentsApi} from '../content/api';
import {downloadBlob} from '../content/download';
import {ensureDrawingPreview} from '../drawings/exportPreview';
export function useDocumentExport(id:string,options:{version?:number;title?:string;beforeExport?:()=>Promise<boolean>}={}) {
 const {user}=useAuth(),[busy,setBusy]=useState(false),[error,setError]=useState<string|null>(null),active=useRef<AbortController|null>(null);
 useEffect(()=>()=>active.current?.abort(),[id,user?.id]);
 async function run(format:'zip'|'markdown') {
  active.current?.abort();const controller=new AbortController();active.current=controller;setBusy(true);setError(null);
  try {
   if(options.beforeExport&&!await options.beforeExport()) throw new Error('请先完成保存或处理未保存的草稿');
   let blob:Blob,version=options.version;
   if(format==='zip') {
    const manifest=await documentsApi.exportManifest(id,options.version,controller.signal);version=manifest.documentVersion;
    if(manifest.missingPreviews.length&&user?.role!=='admin') throw new Error('绘图预览尚未就绪，请由项目所有者更新预览后重试；也可先导出 Markdown 正文');
    for(const preview of manifest.missingPreviews) await ensureDrawingPreview(preview.drawingId,preview.version,controller.signal);
    blob=await documentsApi.exportZip(id,manifest.snapshotToken,controller.signal);
   }else blob=await documentsApi.exportMarkdown(id,options.version,controller.signal);
   controller.signal.throwIfAborted();downloadBlob(blob,`${options.title||'文档'}${version?`-v${version}`:''}.${format==='zip'?'zip':'md'}`);
  }catch(e:any){if(!controller.signal.aborted) {let message=e.message||'导出失败，请重试';if(e.response?.data instanceof Blob) {try {const body=JSON.parse(await e.response.data.text());message=body.error?.message||message;}catch {}}setError(message);}}
  finally {if(active.current===controller) setBusy(false);}
 }
 return {exportZip:()=>run('zip'),exportMarkdown:()=>run('markdown'),busy,error};
}
