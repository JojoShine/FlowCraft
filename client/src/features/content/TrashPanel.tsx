import {useEffect,useState} from 'react';
import {documentsApi,drawingsApi} from './api';
import type {ContentKind,ContentSummary} from './types';
export function TrashPanel({kind,projectId,onRestored,onClose}:{kind:ContentKind;projectId?:string|null;onRestored:()=>void;onClose:()=>void}) {
 const [items,setItems]=useState<ContentSummary[]>([]),[page,setPage]=useState(1),[total,setTotal]=useState(0),[error,setError]=useState('');const api=kind==='document'?documentsApi:drawingsApi;
 useEffect(()=>{let active=true;api.trashList({projectId:projectId||undefined,page}).then(result=>{if(active) {setItems(result.items);setTotal(result.total);}}).catch(e=>{if(active) setError(e.message);});return ()=>{active=false;};},[kind,projectId,page]);
 return <div className="content-modal-backdrop"><section className="content-modal" role="dialog" aria-label="回收站" aria-modal="true"><header className="content-toolbar"><h2>回收站</h2><button onClick={onClose}>关闭回收站</button></header><p>内容与历史将一直保留，恢复后使用原来的链接。</p>{error&&<p role="alert">{error}</p>}{items.length?<ul className="content-trash-list">{items.map(item=><li key={item.id}><span>{item.title}</span><button onClick={()=>void api.undelete(item.id).then(()=>{setItems(rows=>rows.filter(r=>r.id!==item.id));onRestored();}).catch(e=>setError(e.message))}>恢复</button></li>)}</ul>:<p>回收站为空</p>}<div className="content-toolbar"><button disabled={page===1} onClick={()=>setPage(page-1)}>上一页</button><span>第 {page} 页</span><button disabled={page*50>=total} onClick={()=>setPage(page+1)}>下一页</button></div></section></div>;
}
