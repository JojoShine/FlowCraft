import {useCallback,useEffect,useRef,useState} from 'react';
import {contentAssetsApi,drawingsApi} from '../content/api';
import type {SaveAck} from '../content/types';
import {exportPreview} from './exportPreview';
export function useDrawingPreview({id,lastAck,canEdit}:{id:string;lastAck:SaveAck|null;canEdit:boolean}) {
 const [status,setStatus]=useState<'ready'|'pending'|'error'>('pending'),generation=useRef(0),current=useRef({id,lastAck,canEdit});current.current={id,lastAck,canEdit};
 const regenerate=useCallback(async(version:number)=>{
  if(!current.current.canEdit) throw new Error('只有所有者可以生成预览');
  const drawingId=id,token=++generation.current;setStatus('pending');
  try {const revision=await drawingsApi.revision(drawingId,version);const svg=await exportPreview(revision.payload,assetId=>contentAssetsApi.read(assetId,{kind:'drawing',id:drawingId,revision:version}));
   if(token!==generation.current||current.current.id!==drawingId) return;
   await drawingsApi.putPreview(drawingId,version,revision.digest,svg);if(token===generation.current&&(!current.current.lastAck||current.current.lastAck.version===version)) setStatus('ready');
  }catch(error){if(token===generation.current) setStatus('error');throw error;}
 },[id]);
 useEffect(()=>{if(lastAck&&canEdit) void regenerate(lastAck.version).catch(()=>{});},[lastAck?.requestId,canEdit,regenerate]);
 useEffect(()=>()=>{generation.current++;},[id]);return {status,regenerate};
}
