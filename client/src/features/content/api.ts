import {api} from '../../services/api';
import type {ContentKind,DocumentBody,DrawingScene,ContentView,ContentListQuery,ContentSummary,Page,SaveEnvelope,SaveAck,RestoreInput,RevisionPage,CreateContentInput,DocumentRevisionDto,DrawingRevisionDto,ResolvedEmbed,DocumentReferenceDto,AssetDto,ContentContext,PreferencePatch,PreferenceDto} from './types';
function resource<T,R>(path:string) {
 return {
  list:async(params:ContentListQuery={},signal?:AbortSignal):Promise<Page<ContentSummary>>=>(await api.get(path,{params,signal})).data,
  get:async(id:string,signal?:AbortSignal):Promise<ContentView<T>>=>(await api.get(`${path}/${id}`,{signal})).data,
  create:async(input:CreateContentInput<T>):Promise<ContentView<T>>=>(await api.post(path,input)).data,
  save:async(id:string,input:SaveEnvelope<T>,signal?:AbortSignal):Promise<SaveAck>=>(await api.patch(`${path}/${id}`,input,{signal})).data,
  history:async(id:string,page=1):Promise<RevisionPage>=>(await api.get(`${path}/${id}/revisions`,{params:{page}})).data,
  revision:async(id:string,version:number,signal?:AbortSignal):Promise<R>=>(await api.get(`${path}/${id}/revisions/${version}`,{signal})).data,
  restore:async(id:string,input:RestoreInput):Promise<SaveAck>=>(await api.post(`${path}/${id}/restore`,input)).data,
  trash:async(id:string):Promise<void>=>{await api.delete(`${path}/${id}`);},
  trashList:async(params:ContentListQuery={}):Promise<Page<ContentSummary>>=>(await api.get(`${path}/trash`,{params})).data,
  undelete:async(id:string):Promise<{id:string}>=>(await api.post(`${path}/${id}/undelete`)).data,
 };
}
export const documentsApi={...resource<DocumentBody,DocumentRevisionDto>('/documents'),
 exportManifest:async(id:string,version?:number,signal?:AbortSignal):Promise<{snapshotToken:string;documentVersion:number;resourceBytes:number;missingPreviews:{drawingId:string;version:number}[]}>=>(await api.post(`/documents/${id}/export-manifest`,{version},{signal})).data,
 exportZip:async(id:string,snapshotToken:string,signal?:AbortSignal):Promise<Blob>=>(await api.post(`/documents/${id}/export`,{snapshotToken},{responseType:'blob',signal})).data,
 exportMarkdown:async(id:string,version?:number,signal?:AbortSignal):Promise<Blob>=>(await api.get(`/documents/${id}/export-markdown`,{params:{version},responseType:'blob',signal})).data,
 duplicate:async(id:string,drawingMode:'reference'|'duplicate'='reference'):Promise<ContentView<DocumentBody>>=>(await api.post(`/documents/${id}/duplicate`,{drawingMode})).data,
 resolveEmbed:async(id:string,blockId:string,documentVersion?:number):Promise<ResolvedEmbed>=>(await api.get(`/documents/${id}/embeds/${blockId}`,{params:{documentVersion}})).data,
};
export const drawingsApi={...resource<DrawingScene,DrawingRevisionDto>('/drawings'),
 exportNative:async(id:string,version?:number,signal?:AbortSignal):Promise<Blob>=>(await api.get(`/drawings/${id}/export`,{params:{version},responseType:'blob',signal})).data,
 putPreview:async(id:string,version:number,digest:string,svg:Blob,signal?:AbortSignal):Promise<AssetDto>=>(await api.put(`/drawings/${id}/revisions/${version}/preview`,svg,{headers:{'Content-Type':'image/svg+xml','X-Content-Digest':digest},signal})).data,
 duplicate:async(id:string,revision?:number):Promise<ContentView<DrawingScene>>=>(await api.post(`/drawings/${id}/duplicate`,{revision})).data,
 references:async(id:string):Promise<DocumentReferenceDto[]>=>(await api.get(`/drawings/${id}/references`)).data,
};
export const contentAssetsApi={
 upload:async(file:File,projectId:string,category:'image'|'attachment',signal?:AbortSignal):Promise<AssetDto>=>{const form=new FormData();form.append('projectId',projectId);form.append('category',category);form.append('file',file);return (await api.post('/content-assets',form,{signal})).data;},
 read:async(assetId:string,context:ContentContext,signal?:AbortSignal):Promise<Blob>=>(await api.get(`/content-assets/${assetId}`,{params:{context:JSON.stringify(context)},responseType:'blob',signal})).data,
};
export const contentPreferencesApi={
 list:async(kind:ContentKind,projectId?:string):Promise<PreferenceDto[]>=>(await api.get(`/content-preferences/${kind}`,{params:{projectId}})).data,
 set:async(kind:ContentKind,id:string,patch:PreferencePatch):Promise<PreferenceDto>=>(await api.put(`/content-preferences/${kind}/${id}`,patch)).data,
};
