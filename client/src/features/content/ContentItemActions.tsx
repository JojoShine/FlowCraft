import {useState} from 'react';
import {Star,Trash2,UserRoundPen} from 'lucide-react';
export function ContentItemActions({title,kind,favorite,onFavorite,onDelete,allowCollaboratorEditing,onToggleCollaboratorEditing}:{title:string;kind:'document'|'drawing';favorite?:boolean;onFavorite?:()=>void;onDelete?:()=>void;allowCollaboratorEditing?:boolean;onToggleCollaboratorEditing?:()=>Promise<void>}) {
 const deletion=kind==='document'?'删除文档':'删除绘图';
 const [updating,setUpdating]=useState(false);
 async function toggleCollaboratorEditing() {
  setUpdating(true);
  try {await onToggleCollaboratorEditing?.();} finally {setUpdating(false);}
 }
 return <div className="content-item-actions">
  {onFavorite&&<button className="content-item-favorite" aria-label={`${favorite?'取消收藏':'收藏'} ${title}`} aria-pressed={!!favorite} title={favorite?'取消收藏':'收藏'} onClick={onFavorite}><Star size={16} aria-hidden="true" fill={favorite?'currentColor':'none'}/></button>}
  {onToggleCollaboratorEditing&&<button className="content-item-collaboration" aria-label={`允许协作者编辑 ${title}`} aria-pressed={!!allowCollaboratorEditing} title={allowCollaboratorEditing?'已允许协作者编辑，点击关闭':'允许协作者编辑'} disabled={updating} onClick={()=>void toggleCollaboratorEditing()}><UserRoundPen size={16} aria-hidden="true"/></button>}
  {onDelete&&<button className="content-item-delete" aria-label={`${deletion} ${title}`} title={deletion} onClick={onDelete}><Trash2 size={16} aria-hidden="true"/></button>}
 </div>;
}
