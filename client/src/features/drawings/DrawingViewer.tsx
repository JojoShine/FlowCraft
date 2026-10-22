import {ExcalidrawEditor} from './ExcalidrawEditor';
import type {ContentView,DrawingScene} from '../content/types';
export function DrawingViewer({view,readAsset}:{view:ContentView<DrawingScene>;readAsset:(id:string)=>Promise<Blob>}) {return <ExcalidrawEditor view={{...view,canEdit:false}} readAsset={readAsset} onChange={()=>{}} onComposition={()=>{}}/>;}
