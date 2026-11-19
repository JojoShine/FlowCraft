import {useEffect,useState} from 'react';
import {documentsApi} from '../content/api';
import type {ContentSummary} from '../content/types';
export function DocumentPicker({projectId,onPick,onClose}:{projectId:string;onPick:(id:string)=>void;onClose:()=>void}) {
 const [items,setItems]=useState<ContentSummary[]>([]),[q,setQ]=useState(''),[error,setError]=useState('');
 useEffect(()=>{let active=true;documentsApi.list({projectId,q}).then(result=>{if(active) setItems(result.items);}).catch(e=>{if(active) setError(e.message);});return ()=>{active=false;};},[projectId,q]);
 return <div className="content-modal-backdrop"><section className="content-modal" role="dialog" aria-modal="true" aria-label="链接文档"><header className="content-toolbar"><h2>链接本项目文档</h2><button onClick={onClose}>取消链接</button></header><input aria-label="搜索文档链接" value={q} onChange={event=>setQ(event.target.value)} placeholder="搜索文档"/>{error&&<p role="alert">{error}</p>}<ul className="content-picker-list">{items.map(item=><li key={item.id}><button onClick={()=>onPick(item.id)}>{item.title}</button></li>)}</ul></section></div>;
}
