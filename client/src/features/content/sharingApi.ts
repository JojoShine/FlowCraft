import {api} from '../../services/api';
import type {ContentKind,ContentView,DocumentBody,DrawingScene,ResolvedEmbed} from './types';
const root=(kind:ContentKind,id:string)=>`/${kind}s/${encodeURIComponent(id)}/share`;
export const sharingApi={
 status:async(kind:ContentKind,id:string,signal?:AbortSignal):Promise<{shareToken:string|null}>=>(await api.get(root(kind,id),{signal})).data,
 enable:async(kind:ContentKind,id:string):Promise<{shareToken:string}>=>(await api.post(root(kind,id))).data,
 disable:async(kind:ContentKind,id:string):Promise<void>=>{await api.delete(root(kind,id));},
};
export const shareUrl=(kind:ContentKind,token:string)=>`${window.location.origin}${import.meta.env.BASE_URL}share/${kind}/${encodeURIComponent(token)}`;
const publicRoot=(kind:ContentKind,token:string)=>`${import.meta.env.VITE_API_BASE_URL||'/api/v1'}/public/content/${kind}/${encodeURIComponent(token)}`;
async function publicResponse(url:string,signal?:AbortSignal) {
 const response=await fetch(url,{signal,credentials:'omit',cache:'no-store',referrerPolicy:'no-referrer'});
 if(!response.ok) throw new Error(response.status===404?'分享已关闭或内容不存在':'分享暂时无法读取，请稍后重试');return response;
}
export const publicSharingApi={
 read:async(kind:ContentKind,token:string,signal?:AbortSignal):Promise<ContentView<DocumentBody|DrawingScene>>=>(await (await publicResponse(publicRoot(kind,token),signal)).json()).data,
 embed:async(token:string,blockId:string,signal?:AbortSignal):Promise<ResolvedEmbed>=>(await (await publicResponse(`${publicRoot('document',token)}/embeds/${encodeURIComponent(blockId)}`,signal)).json()).data,
 asset:async(kind:ContentKind,token:string,assetId:string,signal?:AbortSignal,blockId?:string):Promise<Blob>=>{
  const prefix=blockId?`/embeds/${encodeURIComponent(blockId)}`:'';
  return (await publicResponse(`${publicRoot(kind,token)}${prefix}/assets/${encodeURIComponent(assetId)}`,signal)).blob();
 },
};
