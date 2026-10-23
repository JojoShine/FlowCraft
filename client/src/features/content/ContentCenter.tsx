import {useEffect,useRef,useState} from 'react';
import {Link,useNavigate} from 'react-router-dom';
import {useAuth} from '../../contexts/AuthContext';
import {useProjectContext} from '../../contexts/ProjectContext';
import {Select} from '../../components/ui/Select';
import {useConfirm} from '../../components/ui/ConfirmDialog';
import {useContentScope} from './useContentScope';
import {useContentPreferences} from './useContentPreferences';
import {documentsApi,drawingsApi,contentAssetsApi} from './api';
import type {ContentKind,ContentSummary} from './types';
import {DocumentList} from '../documents/DocumentList';
import {documentTemplateOptions} from '../documents/DocumentTemplates';
import {DrawingCard} from '../drawings/DrawingCard';
import {drawingTemplateOptions} from '../drawings/DrawingTemplates';
import {TrashPanel} from './TrashPanel';
import './content.css';
export function ContentCenter({kind}:{kind:ContentKind}) {
 const confirm=useConfirm(),navigate=useNavigate(),{user}=useAuth(),{projects,projectsLoading}=useProjectContext(),{projectId,setScope}=useContentScope();const owner=user?.role==='admin',isDocument=kind==='document',api=isDocument?documentsApi:drawingsApi;
 const [items,setItems]=useState<ContentSummary[]>([]),[q,setQ]=useState(''),[filter,setFilter]=useState('all'),[page,setPage]=useState(1),[total,setTotal]=useState(0),[loading,setLoading]=useState(true),[error,setError]=useState(''),[reload,setReload]=useState(0),[trash,setTrash]=useState(false),[grid,setGrid]=useState(true);
 const [create,setCreate]=useState(false),[targetProject,setTargetProject]=useState(''),[title,setTitle]=useState(''),[template,setTemplate]=useState('blank'),[busy,setBusy]=useState(false),[importFile,setImportFile]=useState<File|null>(null);const fileInput=useRef<HTMLInputElement>(null);
 const prefs=useContentPreferences(kind,projectId||undefined);
 const listKey=JSON.stringify([kind,projectId,q,filter,page,user?.id]),actorKey=JSON.stringify([kind,user?.id]);
 const currentList=useRef({key:listKey,actorKey,items,total,filter}),loadedKey=useRef(''),listRequest=useRef<AbortController|null>(null),pendingDeletes=useRef(new Set<string>());currentList.current={key:listKey,actorKey,items,total,filter};
 useEffect(()=>{const controller=new AbortController();listRequest.current=controller;if(loadedKey.current!==listKey) setLoading(true);const timer=setTimeout(()=>{api.list({projectId:projectId||undefined,q:q||undefined,favorite:filter==='favorite'||undefined,recent:filter==='recent'||undefined,page},controller.signal).then(result=>{if(!controller.signal.aborted){loadedKey.current=listKey;setItems(result.items);setTotal(result.total);setError('');}}).catch(e=>{if(!controller.signal.aborted) setError(e.message);}).finally(()=>{if(!controller.signal.aborted) setLoading(false);});},150);return ()=>{clearTimeout(timer);controller.abort();};},[listKey,reload]);
 function removeFromList(id:string,key:string,actor:string) {
  const current=currentList.current;if(current.actorKey!==actor) return;if(current.key!==key){setReload(n=>n+1);return;}if(!current.items.some(item=>item.id===id)) return;
  listRequest.current?.abort();const remaining=current.items.filter(item=>item.id!==id);currentList.current={...current,items:remaining,total:Math.max(0,current.total-1)};setItems(remaining);setTotal(currentList.current.total);
  if(!remaining.length&&page>1) setPage(page-1);else if(remaining.length<Math.min(50,Math.max(0,currentList.current.total-(page-1)*50))) setReload(n=>n+1);
 }
 async function toggleFavorite(id:string) {
  const key=listKey,actor=actorKey;try{const saved=await prefs.toggleFavorite(id);if(saved?.favorite===false&&currentList.current.filter==='favorite') removeFromList(id,key,actor);}catch(e:any){if(currentList.current.key===key) setError(e.message);}
 }

 const open=(id:string)=>navigate(`/${isDocument?'documents':'drawings'}/${id}`);
 function start(file:File|null=null) {setImportFile(file);setTargetProject(projectId||projects[0]?.id||'');setTitle(file?file.name.replace(/\.(md|markdown|excalidraw)$/i,''):isDocument?'未命名文档':'未命名绘图');setTemplate('blank');setCreate(true);setError('');}
 async function deleteContent(item:ContentSummary) {
  const key=listKey,actor=actorKey,operation=`${actor}:${item.id}`;if(pendingDeletes.current.has(operation)) return;pendingDeletes.current.add(operation);
  try {if(!await confirm({title:isDocument?'删除文档？':'删除绘图？',description:`“${item.title}”将移入回收站，可随时恢复。正文、历史和附件会保留。`,confirmText:isDocument?'删除文档':'删除绘图',variant:'danger'})) return;await api.trash(item.id);removeFromList(item.id,key,actor);}catch(e:any){if(currentList.current.key===key) setError(e.message);}finally{pendingDeletes.current.delete(operation);}
 }

 async function submit() {
  if(!targetProject||!title.trim()) return;setBusy(true);setError('');
  try {
   let created:{id:string};let warnings:string[]=[];
   if(isDocument) {
    const {createDocumentTemplate}=await import('../documents/DocumentTemplates');let payload=createDocumentTemplate(template as Parameters<typeof createDocumentTemplate>[0]);
    if(importFile) {const {parseMarkdown}=await import('../documents/markdown');const result=await parseMarkdown(await importFile.text());payload=result.body;warnings=result.warnings;}
    created=await documentsApi.create({projectId:targetProject,title:title.trim(),payload});
   } else {
    const {createDrawingTemplate}=await import('../drawings/DrawingTemplates');let payload=await createDrawingTemplate(template as Parameters<typeof createDrawingTemplate>[0]);
    if(importFile) {const {importExcalidraw}=await import('../drawings/sceneAdapter');const result=await importExcalidraw(importFile);payload=result.scene;for(const file of result.pendingFiles) {const asset=await contentAssetsApi.upload(new File([file.blob],file.fileName,{type:file.mimeType}),targetProject,'image');payload.files[file.targetId]={assetId:asset.id};}}
    created=await drawingsApi.create({projectId:targetProject,title:title.trim(),payload});
   }
   setCreate(false);navigate(`/${isDocument?'documents':'drawings'}/${created.id}`,{state:{importWarnings:warnings}});
  }catch(e:any){setError(e.message);}finally {setBusy(false);}
 }
 return <section className="content-center"><header className="content-center-heading"><div><h1>{isDocument?'文档中心':'绘图中心'}</h1><p>{isDocument?'每份文档独立编辑，正文标题自动生成目录。':'持续维护项目的部署图、架构和流程。'}</p></div>{owner&&projects.length>0&&<div className="content-toolbar"><button onClick={()=>fileInput.current?.click()}>{isDocument?'导入 Markdown':'导入 Excalidraw'}</button><button className="content-primary" onClick={()=>start()}>{isDocument?'新建文档':'新建绘图'}</button><input ref={fileInput} type="file" hidden accept={isDocument?'.md,.markdown,text/markdown':'.excalidraw,application/json'} onChange={event=>{const file=event.target.files?.[0];if(file) start(file);event.target.value='';}}/></div>}</header>
  <div className="content-filterbar"><Select className="content-scope-select" aria-label="项目范围" value={projectId||'all'} onValueChange={value=>{setScope(value==='all'?null:value);setPage(1);}} options={[...(owner?[{value:'all',label:'全部项目'}]:[]),...projects.map(project=>({value:project.id,label:project.name}))]}/><input aria-label={isDocument?'搜索文档':'搜索绘图'} placeholder={isDocument?'搜索标题或正文…':'搜索绘图名称…'} value={q} onChange={event=>{setQ(event.target.value);setPage(1);}}/><Select className="content-status-select" aria-label="内容筛选" value={filter} onValueChange={value=>{setFilter(value);setPage(1);}} options={[{value:'all',label:'全部'},{value:'favorite',label:'收藏'},{value:'recent',label:'最近访问'}]}/>{!isDocument&&<button onClick={()=>setGrid(!grid)}>{grid?'列表展示':'网格展示'}</button>}{owner&&<button onClick={()=>setTrash(true)}>回收站</button>}</div>
  {error&&<p className="content-warning" role="alert">{error}</p>}
  {!projectsLoading&&projects.length===0?<div className="content-empty"><h2>暂无可访问的项目资料</h2>{owner&&<Link to="/projects">创建项目</Link>}</div>:loading?<p role="status">正在读取{isDocument?'文档':'绘图'}…</p>:items.length===0?<div className="content-empty"><h2>{q||filter!=='all'?'没有匹配的内容':isDocument?'从第一份文档开始':'从第一张图开始'}</h2><p>{isDocument?'可导入现有 Markdown，或用服务器清单模板新建文档。':'新建空白画布，或从部署拓扑模板开始。'}</p></div>:isDocument?<DocumentList items={items} onSelect={open} onDelete={owner?item=>void deleteContent(item):undefined} favorites={prefs.favorites} onFavorite={id=>void toggleFavorite(id)} projectNames={Object.fromEntries(projects.map(p=>[p.id,p.name]))}/>:<div className={grid?'drawing-grid':'drawing-list'}>{items.map(item=><DrawingCard key={item.id} item={item} projectName={projects.find(p=>p.id===item.projectId)?.name} favorite={prefs.favorites.has(item.id)} onFavorite={()=>void toggleFavorite(item.id)} onOpen={()=>open(item.id)} onDelete={owner?()=>void deleteContent(item):undefined}/>)}</div>}
  {total>50&&<footer className="content-toolbar"><button disabled={page===1} onClick={()=>setPage(page-1)}>上一页</button><span>第 {page} 页，共 {total} 项</span><button disabled={page*50>=total} onClick={()=>setPage(page+1)}>下一页</button></footer>}
  {trash&&<TrashPanel kind={kind} projectId={projectId} onClose={()=>setTrash(false)} onRestored={()=>setReload(n=>n+1)}/>}
  {create&&<div className="content-modal-backdrop"><form className="content-modal" role="dialog" aria-modal="true" aria-label={importFile?'导入新内容':'新建内容'} onSubmit={event=>{event.preventDefault();void submit();}}><header className="content-toolbar"><h2>{importFile?'导入为新':'新建'}{isDocument?'文档':'绘图'}</h2></header><div className="content-modal-form"><Select label="所属项目" value={targetProject} onValueChange={setTargetProject} options={projects.map(project=>({value:project.id,label:project.name}))}/><label className="content-field">名称<input aria-label="内容名称" required maxLength={300} value={title} onChange={event=>setTitle(event.target.value)}/></label>{importFile?<p>文件：{importFile.name}。导入会创建独立内容。</p>:<Select label="初始模板" value={template} onValueChange={setTemplate} options={isDocument?[...documentTemplateOptions]:[...drawingTemplateOptions]}/>}</div>{error&&<p role="alert">{error}</p>}<footer className="content-modal-actions"><button type="button" disabled={busy} onClick={()=>setCreate(false)}>取消</button><button type="submit" className="content-primary" disabled={busy||!targetProject||!title.trim()}>{busy?'正在创建…':importFile?'导入并打开':'创建并打开'}</button></footer></form></div>}
 </section>;
}
