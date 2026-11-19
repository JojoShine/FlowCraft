import {useEffect,useRef,useState} from 'react';
import {useAuth} from '../../contexts/AuthContext';
import {drawingsApi} from '../content/api';
import {downloadBlob} from '../content/download';
import {exportDrawing,hydrateScene} from './sceneAdapter';
import type {DrawingScene} from '../content/types';
export function useDrawingExport(id:string,options:{version?:number;title?:string;beforeExport?:()=>Promise<boolean>;scene?:DrawingScene;readAsset?:(id:string)=>Promise<Blob>}={}) {
 const {user}=useAuth(),[busy,setBusy]=useState(false),[error,setError]=useState<string|null>(null),active=useRef<AbortController|null>(null);
 useEffect(()=>()=>active.current?.abort(),[id,user?.id]);
 async function exportFormat(format:'excalidraw'|'png'|'svg') {
  active.current?.abort();const controller=new AbortController();active.current=controller;setBusy(true);setError(null);
  try {
   if(options.beforeExport&&!await options.beforeExport()) throw new Error('请先完成保存或处理未保存的草稿');
   let blob:Blob;
   if(options.scene) {const hydrated=await hydrateScene(options.scene,assetId=>options.readAsset?options.readAsset(assetId):Promise.reject(new Error('图片无法读取')));controller.signal.throwIfAborted();blob=await exportDrawing(hydrated,format);}
   else {const native=await drawingsApi.exportNative(id,options.version,controller.signal);controller.signal.throwIfAborted();if(format==='excalidraw') blob=native;else {const scene=JSON.parse(await native.text());blob=await exportDrawing({elements:scene.elements,appState:scene.appState,files:scene.files},format);}}
   controller.signal.throwIfAborted();downloadBlob(blob,`${options.title||'绘图'}${options.version?`-v${options.version}`:''}.${format}`);
  }catch(e:any){if(!controller.signal.aborted) setError(e.message||'绘图导出失败，请重试');}finally {if(active.current===controller) setBusy(false);}
 }
 return {exportFormat,busy,error};
}
