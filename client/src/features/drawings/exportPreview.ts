import {exportDrawing,hydrateScene} from './sceneAdapter';
import type {DrawingScene} from '../content/types';
export async function exportPreview(scene:DrawingScene,readAsset:(id:string)=>Promise<Blob>):Promise<Blob> {return exportDrawing(await hydrateScene(scene,readAsset),'svg');}
