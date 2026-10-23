import {restoreLibraryItems} from '@excalidraw/excalidraw';
import type {LibraryItems} from '@excalidraw/excalidraw/types';
import pack_architecture from './libraries/architecture.json';
import pack_network from './libraries/network.json';
import pack_home_network from './libraries/home-network.json';
import pack_system_design from './libraries/system-design.json';
import pack_flowchart from './libraries/flowchart.json';
import pack_wireframes from './libraries/wireframes.json';
import pack_forms from './libraries/forms.json';
type PackData={libraryItems?:unknown[];library?:unknown[]};
export const drawingLibraryPacks=[
 {id:'architecture',label:'软件架构',category:'架构与流程',count:7,preload:true,legacy:true,load:()=>Promise.resolve(pack_architecture)},
 {id:'network',label:'网络拓扑',category:'网络与服务器',count:10,preload:true,legacy:true,load:()=>Promise.resolve(pack_network)},
 {id:'home-network',label:'服务器与家庭网络',category:'网络与服务器',count:8,preload:true,legacy:false,load:()=>Promise.resolve(pack_home_network)},
 {id:'system-design',label:'系统设计组件',category:'架构与流程',count:24,preload:true,legacy:false,load:()=>Promise.resolve(pack_system_design)},
 {id:'devops',label:'DevOps 工具',category:'云与运维',count:29,preload:false,legacy:false,load:()=>import('./libraries/devops.json').then(module=>module.default)},
 {id:'kubernetes',label:'Kubernetes 完整图标',category:'云与运维',count:74,preload:false,legacy:false,load:()=>import('./libraries/kubernetes.json').then(module=>module.default)},
 {id:'aws',label:'AWS 完整架构图标',category:'云与运维',count:249,preload:false,legacy:false,load:()=>import('./libraries/aws.json').then(module=>module.default)},
 {id:'google',label:'Google Cloud 与 Workspace',category:'云与运维',count:139,preload:false,legacy:false,load:()=>import('./libraries/google.json').then(module=>module.default)},
 {id:'azure-network',label:'Azure 网络',category:'云与运维',count:29,preload:false,legacy:false,load:()=>import('./libraries/azure-network.json').then(module=>module.default)},
 {id:'azure-compute',label:'Azure 计算',category:'云与运维',count:17,preload:false,legacy:false,load:()=>import('./libraries/azure-compute.json').then(module=>module.default)},
 {id:'azure-storage',label:'Azure 存储',category:'云与运维',count:13,preload:false,legacy:false,load:()=>import('./libraries/azure-storage.json').then(module=>module.default)},
 {id:'azure-containers',label:'Azure 容器',category:'云与运维',count:6,preload:false,legacy:false,load:()=>import('./libraries/azure-containers.json').then(module=>module.default)},
 {id:'azure-general',label:'Azure 通用',category:'云与运维',count:19,preload:false,legacy:false,load:()=>import('./libraries/azure-general.json').then(module=>module.default)},
 {id:'azure-data',label:'Azure 数据与服务',category:'云与运维',count:19,preload:false,legacy:false,load:()=>import('./libraries/azure-data.json').then(module=>module.default)},
 {id:'flowchart',label:'流程图符号',category:'架构与流程',count:15,preload:true,legacy:false,load:()=>Promise.resolve(pack_flowchart)},
 {id:'wireframes',label:'界面线框组件',category:'界面设计',count:10,preload:true,legacy:false,load:()=>Promise.resolve(pack_wireframes)},
 {id:'forms',label:'表单输入组件',category:'界面设计',count:8,preload:true,legacy:false,load:()=>Promise.resolve(pack_forms)}
];
const key=(scope:string)=>`flowcraft:drawing-library:${scope}`;
const versionKey=(scope:string)=>`${key(scope)}:version`;
const cache=new Map<string,LibraryItems>(),builtins=new Map<string,{pack:string;item:LibraryItems[number];elements:string}>();
function restorePack(id:string,data:PackData):LibraryItems {const existing=cache.get(id);if(existing) return existing;const items=restoreLibraryItems((data.libraryItems||data.library) as any,'published').map((item,index)=>({...item,id:`flowcraft-${id}-${index}`}));cache.set(id,items);for(const item of items) builtins.set(item.id,{pack:id,item,elements:JSON.stringify(item.elements)});return items;}

const preloaded:Record<string,PackData>={
'architecture':pack_architecture,'network':pack_network,'home-network':pack_home_network,'system-design':pack_system_design,'flowchart':pack_flowchart,'wireframes':pack_wireframes,'forms':pack_forms
};
export async function loadDrawingPack(id:string):Promise<LibraryItems> {const pack=drawingLibraryPacks.find(pack=>pack.id===id);if(!pack) throw new Error('素材库不存在');return restorePack(id,await pack.load() as PackData);}
export async function loadDrawingLibrary(scope?:string):Promise<LibraryItems> {
 let saved:unknown=null;try{if(scope) saved=JSON.parse(localStorage.getItem(key(scope))||'null');}catch{}
 const defaults=drawingLibraryPacks.filter(pack=>pack.preload);
 if(saved&&typeof saved==='object'&&!Array.isArray(saved)&&(saved as any).format===3&&Array.isArray((saved as any).items)) {
  const entries=(saved as any).items as {builtin?:string;pack?:string;metadata?:Record<string,unknown>;custom?:LibraryItems[number]}[];
  await Promise.all([...new Set(entries.flatMap(entry=>entry.pack?[entry.pack]:[]))].map(loadDrawingPack));
  return entries.flatMap(entry=>{if(entry.custom) return restoreLibraryItems([entry.custom],'unpublished');const original=entry.builtin?builtins.get(entry.builtin)?.item:null;return original?[{...original,...entry.metadata,id:original.id,elements:original.elements}]:[];});
 }

 if(Array.isArray(saved)) {
  const restored=restoreLibraryItems(saved,'unpublished');
  if(!scope||!restored.length||localStorage.getItem(versionKey(scope))==='3') return restored;
  const merged=new Map(restored.map(item=>[item.id,item]));for(const pack of defaults.filter(pack=>!pack.legacy)) for(const item of restorePack(pack.id,preloaded[pack.id])) if(!merged.has(item.id)) merged.set(item.id,item);
  const upgraded=[...merged.values()];try{saveDrawingLibrary(scope,upgraded);}catch{}return upgraded;
 }
 return defaults.flatMap(pack=>restorePack(pack.id,preloaded[pack.id]));
}
export function saveDrawingLibrary(scope:string|undefined,items:LibraryItems) {
 if(!scope) return;
 try {const entries=items.map(item=>{const original=builtins.get(item.id);if(original&&JSON.stringify(item.elements)===original.elements){const {elements,...metadata}=item;return {builtin:item.id,pack:original.pack,metadata};}return {custom:item};});localStorage.setItem(key(scope),JSON.stringify({format:3,items:entries}));localStorage.setItem(versionKey(scope),'3');}catch {throw new Error('素材库无法保留在当前浏览器，请导出素材库备份。');}
}
