import {useContentTheme} from '../content/useContentTheme';
import {useEffect,useRef,useState} from 'react';
import {Excalidraw} from '@excalidraw/excalidraw';
import type {ExcalidrawImperativeAPI} from '@excalidraw/excalidraw/types';
import type {AssetDto,ContentView,DrawingScene} from '../content/types';
import {loadDrawingLibrary,saveDrawingLibrary} from './DrawingLibrary';
import {DrawingLibraryPicker} from './DrawingLibraryPicker';
import {hydrateScene,sceneToPayload,rasterDataBlob,type BinaryFileMap,type HydratedScene} from './sceneAdapter';
import '@excalidraw/excalidraw/index.css';
(window as any).EXCALIDRAW_ASSET_PATH=`${import.meta.env.BASE_URL}excalidraw/`;
interface Props {libraryScope?:string;view:ContentView<DrawingScene>;onChange:(title:string,payload:DrawingScene)=>void;onComposition:(value:boolean)=>void;readAsset?:(id:string)=>Promise<Blob>;upload?:(file:File,fileId:string)=>Promise<AssetDto>}
export function ExcalidrawEditor(props:Props) {
 const theme=useContentTheme();
 const current=useRef(props);current.current=props;
 const [initial,setInitial]=useState<HydratedScene|null>(null),[error,setError]=useState('');
 const [libraryItems]=useState(()=>loadDrawingLibrary(props.libraryScope));const [libraryPicker,setLibraryPicker]=useState(false);
 const api=useRef<ExcalidrawImperativeAPI|null>(null),mounted=useRef(true),hydrating=useRef(true),initialized=useRef(false);
 const assets=useRef<Record<string,string>>({}),uploads=useRef(new Map<string,Promise<void>>()),lastPublished=useRef(''),lastInput=useRef('');
 const latest=useRef<{elements:readonly Record<string,any>[];appState:Record<string,any>;files:BinaryFileMap}|null>(null);
 useEffect(()=>{mounted.current=true;return ()=>{mounted.current=false;};},[]);
 useEffect(()=>{
  const serialized=JSON.stringify(props.view.payload);if(serialized===lastPublished.current||serialized===lastInput.current) return;lastInput.current=serialized;
  let active=true;hydrating.current=true;
  for(const [id,ref] of Object.entries(props.view.payload.files)) if(!ref.assetId.startsWith('pending:')) assets.current[id]=ref.assetId;
  hydrateScene(props.view.payload,id=>current.current.readAsset?current.current.readAsset(id):Promise.reject(new Error('图片无法读取'))).then(scene=>{
   if(!active) return;latest.current=scene;lastPublished.current=JSON.stringify(props.view.payload);
   if(api.current) {initialized.current=false;api.current.addFiles(Object.values(scene.files) as any);api.current.updateScene({elements:scene.elements as any,appState:scene.appState as any});}else setInitial(scene);
   hydrating.current=false;
  }).catch(e=>{if(active) {setError(e.message);hydrating.current=false;}});
  return ()=>{active=false;};
 },[props.view.payload]);
 function publish() {
  const data=latest.current;if(!data||!current.current.view.canEdit||hydrating.current) return;
  try {const mapping={...assets.current};for(const element of data.elements) if(element.type==='image'&&!element.isDeleted&&!mapping[element.fileId]) mapping[element.fileId]=`pending:${element.fileId}`;
   const payload=sceneToPayload(data.elements,data.appState,data.files,mapping),serialized=JSON.stringify(payload);
   if(serialized!==lastPublished.current) {lastPublished.current=serialized;current.current.onChange(current.current.view.title,payload);}
  }catch(e:any){setError(e.message);}
 }
 function change(elements:readonly Record<string,any>[],appState:Record<string,any>,files:BinaryFileMap) {
  latest.current={elements,appState,files};if(!initialized.current) {initialized.current=true;try {lastPublished.current=JSON.stringify(sceneToPayload(elements,appState,files,assets.current));}catch {}return;}
  if(!current.current.view.canEdit||hydrating.current) return;
  for(const element of elements) if(element.type==='image'&&!element.isDeleted&&!assets.current[element.fileId]&&!uploads.current.has(element.fileId)) {
   const fileId=element.fileId,binary=files[fileId];
   const task=(async()=>{try {
    if(!binary) throw new Error('画布缺少图片');const blob=rasterDataBlob(binary.dataURL);const uploader=current.current.upload;if(!uploader) throw new Error('当前无法上传图片');
    const asset=await uploader(new File([blob],`${fileId}.${blob.type.split('/')[1]}`,{type:blob.type}),fileId);
    if(!mounted.current) return;assets.current[fileId]=asset.id;publish();
   }catch(e:any){if(mounted.current) setError(`图片尚未保存：${e.message}`);}finally {uploads.current.delete(fileId);}})();uploads.current.set(fileId,task);
  }
  publish();
 }
 return <div className="flowcraft-drawing-editor" style={{height:'100%',minHeight:500,position:'relative'}} onCompositionStart={()=>props.onComposition(true)} onCompositionEnd={()=>props.onComposition(false)}>
  {error&&<p className="content-warning" role="alert">{error}</p>}
  {initial?<Excalidraw initialData={{...initial,libraryItems} as any} excalidrawAPI={value=>{api.current=value;}} onLibraryChange={items=>{try {saveDrawingLibrary(current.current.libraryScope,items);}catch(e:any){setError(e.message);}}} renderTopRightUI={()=>props.view.canEdit?<button className="drawing-library-trigger" onClick={()=>setLibraryPicker(true)}>常用素材库</button>:null} onChange={change as any} langCode="zh-CN" theme={theme} viewModeEnabled={!props.view.canEdit} validateEmbeddable={()=>false} UIOptions={{canvasActions:{loadScene:false,saveToActiveFile:false,export:false,saveAsImage:false,toggleTheme:false}}}/>:<p role="status">正在读取画布和图片…</p>}
  {libraryPicker&&<DrawingLibraryPicker onClose={()=>setLibraryPicker(false)} onLoad={async items=>{if(!api.current) throw new Error('画布尚未加载');await api.current.updateLibrary({libraryItems:items,merge:true});api.current.updateScene({appState:{openSidebar:{name:'default',tab:'library'}}});}}/>}
 </div>;
}
