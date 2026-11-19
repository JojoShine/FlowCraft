import {Star,Trash2} from 'lucide-react';
export function ContentItemActions({title,kind,favorite,onFavorite,onDelete}:{title:string;kind:'document'|'drawing';favorite?:boolean;onFavorite?:()=>void;onDelete?:()=>void}) {
 const deletion=kind==='document'?'删除文档':'删除绘图';
 return <div className="content-item-actions">{onFavorite&&<button className="content-item-favorite" aria-label={`${favorite?'取消收藏':'收藏'} ${title}`} aria-pressed={!!favorite} title={favorite?'取消收藏':'收藏'} onClick={onFavorite}><Star size={16} aria-hidden="true" fill={favorite?'currentColor':'none'}/></button>}{onDelete&&<button className="content-item-delete" aria-label={`${deletion} ${title}`} title={deletion} onClick={onDelete}><Trash2 size={16} aria-hidden="true"/></button>}</div>;
}
