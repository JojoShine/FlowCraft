import {useEffect,useMemo,useState} from 'react';
import {useAuth} from '../../contexts/AuthContext';
import {contentDraftIdentity} from '../content/useContentAutosave';
import {useContentAssets} from '../content/useContentAssets';
import type {ContentSummary} from '../content/types';
export function DrawingCard({item,projectName,favorite,onFavorite,onOpen}:{item:ContentSummary;projectName?:string;favorite:boolean;onFavorite:()=>void;onOpen:()=>void}) {
 const {user}=useAuth();const identity=useMemo(()=>contentDraftIdentity(user!.id,item.projectId,'drawing',item.id),[user!.id,item.projectId,item.id]);const assets=useContentAssets(identity);const [url,setUrl]=useState<string>();
 useEffect(()=>{let active=true,loaded:string|undefined;setUrl(undefined);if(item.previewAssetId) assets.readUrl(item.previewAssetId,{kind:'drawing',id:item.id}).then(value=>{loaded=value;if(active) setUrl(value);else assets.revoke(value);}).catch(()=>{});return ()=>{active=false;if(loaded) assets.revoke(loaded);};},[item.previewAssetId,assets,item.id]);
 return <article className="drawing-card"><button className="drawing-card-preview" onClick={onOpen}>{url?<img src={url} alt={item.title}/>:<span>预览待更新</span>}</button><div className="drawing-card-meta"><button className="drawing-card-title" onClick={onOpen}>{item.title}</button><button aria-label={`${favorite?'取消收藏':'收藏'} ${item.title}`} onClick={onFavorite}>{favorite?'★':'☆'}</button><small>{projectName} · {new Date(item.updatedAt).toLocaleDateString()}</small></div></article>;
}
