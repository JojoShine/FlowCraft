import {useEffect,useMemo,useRef} from 'react';
import {contentAssetsApi} from './api';
import type {AssetDto,ContentContext,DraftKey} from './types';
export function createAssetSession(identity:string,currentIdentity:()=>string,upload=contentAssetsApi.upload) {
 let disposed=false;const controllers=new Set<AbortController>(),urls=new Set<string>();
 const check=()=>{if(disposed||currentIdentity()!==identity) throw new DOMException('账号或编辑会话已变化','AbortError');};
 return {
  async upload(file:File,projectId:string,category:'image'|'attachment'):Promise<AssetDto> {check();const controller=new AbortController();controllers.add(controller);try {const result=await upload(file,projectId,category,controller.signal);check();return result;}finally {controllers.delete(controller);}},
  async readUrl(assetId:string,context:ContentContext):Promise<string> {check();const controller=new AbortController();controllers.add(controller);try {const blob=await contentAssetsApi.read(assetId,context,controller.signal);check();const url=URL.createObjectURL(blob);urls.add(url);return url;}finally {controllers.delete(controller);}},
  revoke:(url:string)=>{URL.revokeObjectURL(url);urls.delete(url);},
  dispose:()=>{disposed=true;for(const controller of controllers) controller.abort();for(const url of urls) URL.revokeObjectURL(url);controllers.clear();urls.clear();},
 };
}
export function useContentAssets(identity:DraftKey) {
 const identityKey=JSON.stringify(identity),current=useRef(identityKey);current.current=identityKey;
 const session=useMemo(()=>createAssetSession(identityKey,()=>current.current),[identityKey]);
 useEffect(()=>()=>session.dispose(),[session]);return session;
}
