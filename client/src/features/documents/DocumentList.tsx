import './documentEditor.css';
import type {ContentSummary} from '../content/types';
export function DocumentList({items,onSelect,favorites,onFavorite,projectNames}:{items:ContentSummary[];onSelect:(id:string)=>void;favorites?:Set<string>;onFavorite?:(id:string)=>void;projectNames?:Record<string,string>}) {
 return <ul className="document-list" aria-label="文档列表">{items.map(item=><li key={item.id}><button className="document-list-open" onClick={()=>onSelect(item.id)}><span aria-hidden="true">▤</span><span>{item.title}<small>{projectNames?.[item.projectId]}</small></span><time dateTime={item.updatedAt}>{new Date(item.updatedAt).toLocaleDateString()}</time></button>{onFavorite&&<button className="document-list-star" aria-label={`${favorites?.has(item.id)?'取消收藏':'收藏'} ${item.title}`} onClick={()=>onFavorite(item.id)}>{favorites?.has(item.id)?'★':'☆'}</button>}</li>)}</ul>;
}
