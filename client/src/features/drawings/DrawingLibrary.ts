import {restoreLibraryItems} from '@excalidraw/excalidraw';
import type {LibraryItems} from '@excalidraw/excalidraw/types';
import architecture from './libraries/software-architecture.json';
import network from './libraries/network-topology.json';
const key=(scope:string)=>`flowcraft:drawing-library:${scope}`;
export function loadDrawingLibrary(scope?:string):LibraryItems {
 if(scope) {try {const saved=JSON.parse(localStorage.getItem(key(scope))||'null');if(Array.isArray(saved)) return restoreLibraryItems(saved,'unpublished');}catch {}}
 return [...restoreLibraryItems(architecture.library as any,'published').map((item,index)=>({...item,id:`flowcraft-architecture-${index}`})),...restoreLibraryItems(network.libraryItems as any,'published').map((item,index)=>({...item,id:`flowcraft-network-${index}`}))];
}
export function saveDrawingLibrary(scope:string|undefined,items:LibraryItems) {
 if(!scope) return;
 try {localStorage.setItem(key(scope),JSON.stringify(items));}catch {throw new Error('素材库无法保留在当前浏览器，请导出素材库备份。');}
}
