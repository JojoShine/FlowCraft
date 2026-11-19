import {useState} from 'react';
import type {LibraryItems} from '@excalidraw/excalidraw/types';
import {drawingLibraryPacks,loadDrawingPack} from './DrawingLibrary';
export function DrawingLibraryPicker({onLoad,onClose}:{onLoad:(items:LibraryItems)=>Promise<void>;onClose:()=>void}) {
 const [query,setQuery]=useState(''),[busy,setBusy]=useState(''),[error,setError]=useState('');
 const packs=drawingLibraryPacks.filter(pack=>`${pack.label} ${pack.id} ${pack.category}`.toLowerCase().includes(query.toLowerCase()));
 async function load(id:string) {if(busy) return;setBusy(id);setError('');try{const items=id==='all'?(await Promise.all(drawingLibraryPacks.map(pack=>loadDrawingPack(pack.id)))).flat():await loadDrawingPack(id);await onLoad(items);onClose();}catch(e:any){setError(e.message);}finally{setBusy('');}}
 return <div className="content-modal-backdrop"><section className="content-modal drawing-library-picker" role="dialog" aria-label="常用素材库" aria-modal="true"><header className="content-toolbar"><h2>常用素材库</h2><button disabled={!!busy} onClick={onClose}>关闭</button></header><p>17 套完整素材库，共 676 项。按类别加载整套素材，已有个人素材会保留。</p><input aria-label="搜索素材库" placeholder="搜索素材库名称或分类…" value={query} onChange={event=>setQuery(event.target.value)}/>{error&&<p role="alert">{error}</p>}<ul className="drawing-library-packs">{packs.map(pack=><li key={pack.id}><div><strong>{pack.label}</strong><small>{pack.category} · 完整 {pack.count} 项</small></div><button disabled={!!busy} onClick={()=>void load(pack.id)}>{busy===pack.id?'正在加载…':'加载整套'}</button></li>)}</ul>{!packs.length&&<p>没有匹配的素材库</p>}<footer className="content-modal-actions"><button className="content-primary" disabled={!!busy} onClick={()=>void load('all')}>{busy==='all'?'正在加载…':'加载全部常用库（676 项）'}</button></footer></section></div>;
}
