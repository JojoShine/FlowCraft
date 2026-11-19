import {useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import {documentsApi} from '../content/api';
export function DocumentLinkBlock({documentId}:{documentId:string}) {
 const [title,setTitle]=useState('读取文档…'),[available,setAvailable]=useState(false);
 useEffect(()=>{let active=true;setAvailable(false);documentsApi.get(documentId).then(doc=>{if(active) {setTitle(doc.title);setAvailable(true);}}).catch(()=>{if(active) setTitle('文档已移入回收站或不可访问');});return ()=>{active=false;};},[documentId]);
 return <div className="document-link-block" contentEditable={false}>{available?<Link to={`/documents/${documentId}`}>▤ {title}</Link>:<span>{title}</span>}</div>;
}
