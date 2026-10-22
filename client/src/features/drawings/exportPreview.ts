import {contentAssetsApi,drawingsApi} from '../content/api';
import {exportDrawing,hydrateScene} from './sceneAdapter';
import type {DrawingScene} from '../content/types';
export async function exportPreview(scene:DrawingScene,readAsset:(id:string)=>Promise<Blob>):Promise<Blob> {return exportDrawing(await hydrateScene(scene,readAsset),'svg');}

export async function ensureDrawingPreview(id:string,version:number,signal:AbortSignal) {
 signal.throwIfAborted();const revision=await drawingsApi.revision(id,version,signal);const svg=await exportPreview(revision.payload,assetId=>contentAssetsApi.read(assetId,{kind:'drawing',id,revision:version},signal));signal.throwIfAborted();return drawingsApi.putPreview(id,version,revision.digest,svg,signal);
}
