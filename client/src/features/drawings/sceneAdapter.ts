import type {BlobDraft,DrawingScene} from '../content/types';
export type BinaryFileMap=Record<string,{id:string;dataURL:string;mimeType:string;created:number;lastRetrieved?:number}>;
export interface HydratedScene {elements:Record<string,any>[];appState:Record<string,any>;files:BinaryFileMap}
const persistentKeys=['viewBackgroundColor','gridSize','gridStep','gridModeEnabled'];
export function sceneToPayload(elements:readonly Record<string,any>[],appState:Record<string,any>,files:BinaryFileMap,assets:Record<string,string>):DrawingScene {
 if(elements.some(e=>['embeddable','iframe'].includes(e.type))) throw new Error('暂不支持嵌入外部网页');
 const persistedFiles:DrawingScene['files']=Object.create(null);
 for(const element of elements) if(element.type==='image'&&!element.isDeleted) {const id=element.fileId;if(!id||['__proto__','constructor','prototype'].includes(id)||!Object.prototype.hasOwnProperty.call(files,id)||typeof assets[id]!=='string') throw new Error('画布图片缺失或未上传完成');persistedFiles[id]={assetId:assets[id]};}
 const persistedState=Object.fromEntries(persistentKeys.filter(k=>appState[k]!==undefined).map(k=>[k,appState[k]]));
 const scene:DrawingScene={formatVersion:1,elements:[...elements],appState:persistedState,files:persistedFiles};
 if(new TextEncoder().encode(JSON.stringify(scene)).byteLength>10*1024*1024) throw new Error('画布场景超过 10 MiB');return scene;
}
export function blobDataURL(blob:Blob):Promise<string> {return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(reader.error);reader.readAsDataURL(blob);});}
export function rasterDataBlob(dataURL:string):Blob {
 const match=/^data:(image\/(?:png|jpeg|gif|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(dataURL);if(!match) throw new Error('图片必须为 PNG、JPEG、GIF 或 WebP 数据');
 const bytes=Uint8Array.from(atob(match[2]),c=>c.charCodeAt(0));if(bytes.length>10*1024*1024) throw new Error('单张图片超过 10 MiB');
 const png=[137,80,78,71,13,10,26,10].every((n,i)=>bytes[i]===n),jpeg=bytes[0]===255&&bytes[1]===216&&bytes[2]===255,gif=new TextDecoder().decode(bytes.slice(0,3))==='GIF',webp=new TextDecoder().decode(bytes.slice(0,4))==='RIFF'&&new TextDecoder().decode(bytes.slice(8,12))==='WEBP';
 if(!(match[1]==='image/png'&&png||match[1]==='image/jpeg'&&jpeg||match[1]==='image/gif'&&gif||match[1]==='image/webp'&&webp)) throw new Error('图片数据与格式不一致');return new Blob([bytes],{type:match[1]});
}
export async function hydrateScene(scene:DrawingScene,readAsset:(id:string)=>Promise<Blob>):Promise<HydratedScene> {
 if(scene.formatVersion!==1) throw new Error('不支持此画布格式，请保留原文件');
 const files:BinaryFileMap={};
 await Promise.all(Object.entries(scene.files).map(async([id,ref])=>{const blob=await readAsset(ref.assetId);if(blob.size>10*1024*1024) throw new Error('图片超过 10 MiB');const dataURL=await blobDataURL(blob);rasterDataBlob(dataURL);files[id]={id,dataURL,mimeType:blob.type,created:Date.now()};}));
 sceneToPayload(scene.elements,scene.appState,files,Object.fromEntries(Object.entries(scene.files).map(([id,ref])=>[id,ref.assetId])));
 return {elements:scene.elements,appState:scene.appState,files};
}
export async function importExcalidraw(file:File):Promise<{scene:DrawingScene;pendingFiles:BlobDraft[]}> {
 let source:any;try {source=JSON.parse(await file.text());}catch {throw new Error('无法读取 Excalidraw 文件');}
 if(source.type!=='excalidraw'||source.version!==2||!Array.isArray(source.elements)||!source.appState||!source.files||typeof source.files!=='object') throw new Error('不支持此 Excalidraw 文件格式');
 const pendingFiles:BlobDraft[]=[],assets:Record<string,string>={};
 for(const element of source.elements) if(element.type==='image'&&!element.isDeleted&&!assets[element.fileId]) {const binary=source.files[element.fileId];if(!binary?.dataURL) throw new Error('导入文件缺少图片数据');const blob=rasterDataBlob(binary.dataURL);const localId=crypto.randomUUID();assets[element.fileId]=`pending:${localId}`;pendingFiles.push({localId,targetId:element.fileId,fileName:`${element.fileId}.${blob.type.split('/')[1]}`,mimeType:blob.type,blob});}
 return {scene:sceneToPayload(source.elements,source.appState,source.files,assets),pendingFiles};
}
export async function exportDrawing(scene:HydratedScene,format:'excalidraw'|'png'|'svg'):Promise<Blob> {
 if(format==='excalidraw') return new Blob([JSON.stringify({type:'excalidraw',version:2,source:'FlowCraft',elements:scene.elements,appState:scene.appState,files:scene.files},null,2)],{type:'application/json'});
 if(!scene.elements.some(element=>!element.isDeleted)&&format==='svg') {
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('xmlns','http://www.w3.org/2000/svg');svg.setAttribute('width','1000');svg.setAttribute('height','600');
  const rect=document.createElementNS('http://www.w3.org/2000/svg','rect');rect.setAttribute('width','1000');rect.setAttribute('height','600');rect.setAttribute('fill',scene.appState.viewBackgroundColor||'#ffffff');svg.appendChild(rect);return new Blob([svg.outerHTML],{type:'image/svg+xml'});
 }
 const {exportToBlob,exportToSvg}=await import('@excalidraw/excalidraw');
 const options={elements:scene.elements as any,appState:{...scene.appState,exportBackground:true,exportEmbedScene:false},files:scene.files as any};
 if(format==='png') return exportToBlob({...options,mimeType:'image/png'});
 const svg=await exportToSvg({...options,skipInliningFonts:true});return new Blob([svg.outerHTML],{type:'image/svg+xml'});
}
