import {ExcalidrawEditor} from './ExcalidrawEditor';
import {useDrawingExport} from './useDrawingExport';
import type {ContentView,DrawingScene} from '../content/types';
export function DrawingViewer({view,readAsset}:{view:ContentView<DrawingScene>;readAsset:(id:string)=>Promise<Blob>}) {
 const exporter=useDrawingExport(view.id,{version:view.version,title:view.title,scene:view.payload,readAsset});
 return <><div className="content-toolbar"><button disabled={exporter.busy} onClick={()=>void exporter.exportFormat('excalidraw')}>导出此版本源图</button><button disabled={exporter.busy} onClick={()=>void exporter.exportFormat('png')}>PNG</button><button disabled={exporter.busy} onClick={()=>void exporter.exportFormat('svg')}>SVG</button>{exporter.error&&<p role="alert">{exporter.error}</p>}</div><ExcalidrawEditor view={{...view,canEdit:false}} readAsset={readAsset} onChange={()=>{}} onComposition={()=>{}}/></>;
}
