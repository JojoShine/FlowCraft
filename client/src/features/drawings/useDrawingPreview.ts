import {useCallback,useEffect,useRef,useState} from 'react';
import {contentAssetsApi,drawingsApi} from '../content/api';
import type {SaveAck} from '../content/types';
import {exportPreview} from './exportPreview';
export function useDrawingPreview({id,lastAck,canEdit}:{id:string;lastAck:SaveAck|null;canEdit:boolean}) {
 const [status,setStatus]=useState<'ready'|'pending'|'error'>('pending'),generation=useRef(0),current=useRef({id,lastAck,canEdit}),active=useRef<AbortController|null>(null),images=useRef(new Map<string,Blob>());current.current={id,lastAck,canEdit};
 const regenerate=useCallback(async(version:number)=>{
  if(!current.current.canEdit) throw new Error('只有所有者可以生成预览');
  active.current?.abort();const controller=new AbortController();active.current=controller;
  const drawingId=id,token=++generation.current;setStatus('pending');
  try {
   const revision=await drawingsApi.revision(drawingId,version,controller.signal);controller.signal.throwIfAborted();
   const ids=new Set(Object.values(revision.payload.files).map(file=>file.assetId));for(const assetId of images.current.keys()) if(!ids.has(assetId)) images.current.delete(assetId);
   const svg=await exportPreview(revision.payload,async assetId=>{
    const cached=images.current.get(assetId);if(cached) return cached;
    const blob=await contentAssetsApi.read(assetId,{kind:'drawing',id:drawingId,revision:version},controller.signal);controller.signal.throwIfAborted();images.current.set(assetId,blob);return blob;
   });controller.signal.throwIfAborted();
   if(token!==generation.current||current.current.id!==drawingId) return;
   await drawingsApi.putPreview(drawingId,version,revision.digest,svg,controller.signal);if(token===generation.current&&(!current.current.lastAck||current.current.lastAck.version===version)) setStatus('ready');
  }catch(error){if(token===generation.current&&!controller.signal.aborted) setStatus('error');throw error;}
 },[id]);
 useEffect(()=>{if(lastAck&&canEdit) void regenerate(lastAck.version).catch(()=>{});},[lastAck?.requestId,canEdit,regenerate]);
 useEffect(()=>{if(!canEdit) {active.current?.abort();images.current.clear();}return ()=>{generation.current++;active.current?.abort();images.current.clear();};},[id,canEdit]);return {status,regenerate};
}
