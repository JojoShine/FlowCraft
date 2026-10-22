import type {ContentSummary} from '../content/types';
export function DocumentList({items,onSelect}:{items:ContentSummary[];onSelect:(id:string)=>void}) {
 return <ul className="document-list" aria-label="文档列表">{items.map(item=><li key={item.id}><button onClick={()=>onSelect(item.id)}><span aria-hidden="true">▤</span><span>{item.title}</span><time dateTime={item.updatedAt}>{new Date(item.updatedAt).toLocaleDateString()}</time></button></li>)}</ul>;
}
