import './documentEditor.css';
import {ContentItemActions} from '../content/ContentItemActions';
import type {ContentSummary} from '../content/types';
export function DocumentList({items,onSelect,favorites,onFavorite,onDelete,projectNames}:{items:ContentSummary[];onSelect:(id:string)=>void;favorites?:Set<string>;onFavorite?:(id:string)=>void;onDelete?:(item:ContentSummary)=>void;projectNames?:Record<string,string>}) {
 return <ul className="document-list" aria-label="文档列表">{items.map(item=><li key={item.id}><button className="document-list-open" onClick={()=>onSelect(item.id)}><span aria-hidden="true">▤</span><span>{item.title}<small>{projectNames?.[item.projectId]}</small></span><time dateTime={item.updatedAt}>{new Date(item.updatedAt).toLocaleDateString()}</time></button>{(onFavorite||onDelete)&&<ContentItemActions kind="document" title={item.title} favorite={favorites?.has(item.id)} onFavorite={onFavorite?()=>onFavorite(item.id):undefined} onDelete={onDelete?()=>onDelete(item):undefined}/>}</li>)}</ul>;
}
