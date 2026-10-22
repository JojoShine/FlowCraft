import {Readable} from 'stream';
import type {DrawingScene} from './contracts';
export interface ExportAsset {id:string;objectKey:string;mimeType:string;bytes:number;originalName:string}
export type AssetReader=(asset:ExportAsset)=>AsyncIterable<Buffer>;
export function nativeSceneStream(scene:DrawingScene,assets:Map<string,ExportAsset>,read:AssetReader):Readable {
 return Readable.from((async function*(){
  yield `{"type":"excalidraw","version":2,"source":"FlowCraft","elements":${JSON.stringify(scene.elements)},"appState":${JSON.stringify(scene.appState)},"files":{`;
  let first=true;
  for(const [id,ref] of Object.entries(scene.files)) {
   const asset=assets.get(ref.assetId);if(!asset) throw new Error('源图图片缺失');
   if(!first) yield ',';first=false;
   yield JSON.stringify(id)+':{"id":'+JSON.stringify(id)+',"mimeType":'+JSON.stringify(asset.mimeType)+',"created":0,"dataURL":'+JSON.stringify(`data:${asset.mimeType};base64,`).slice(0,-1);
   let tail=Buffer.alloc(0);
   for await(const chunk of read(asset)) {const data=tail.length?Buffer.concat([tail,chunk]):chunk;const end=data.length-data.length%3;if(end) yield data.subarray(0,end).toString('base64');tail=Buffer.from(data.subarray(end));}
   if(tail.length) yield tail.toString('base64');yield '"}';
  }
  yield '}}';
 })(),{objectMode:false});
}
