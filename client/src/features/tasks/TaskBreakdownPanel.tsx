import {useEffect,useRef,useState} from 'react';
import {aiApi,type TaskProposal,type TaskPreview} from '../../services/api';
import {documentsApi} from '../content/api';
import {Select} from '../../components/ui/Select';
import {DatePicker} from '../../components/ui/DatePicker';
import {FileUpload} from '../../components/ui/FileUpload';
import '../content/content.css';
import './taskBreakdown.css';
const types=[['requirement','需求'],['prototype','原型设计'],['design','设计'],['development','开发实施'],['testing','测试交付'],['document','文档编写'],['review','评审'],['risk','风险处理'],['research','调研'],['deploy','部署上线']].map(([value,label])=>({value,label}));
type Row=TaskProposal&{id:string;selected:boolean};
export function TaskBreakdownPanel({projects,initialProjectId,onClose,onCreated}:{projects:{id:string;name:string}[];initialProjectId?:string;onClose:()=>void;onCreated:(count:number)=>void}) {
 const [projectId,setProjectId]=useState(initialProjectId||projects[0]?.id||''),[mode,setMode]=useState('text'),[text,setText]=useState(''),[documentId,setDocumentId]=useState(''),[query,setQuery]=useState(''),[documents,setDocuments]=useState<{id:string;title:string}[]>([]),[instructions,setInstructions]=useState('');
 const [files,setFiles]=useState<File[]>([]);
 const [preview,setPreview]=useState<TaskPreview|null>(null),[rows,setRows]=useState<Row[]>([]),[busy,setBusy]=useState<'generate'|'import'|null>(null),[error,setError]=useState(''),[locked,setLocked]=useState(false);
 const controller=useRef<AbortController|null>(null),alive=useRef(true),importRequest=useRef<{projectId:string;requestId:string;tasks:TaskProposal[]}|null>(null);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;controller.current?.abort();};},[]);
 useEffect(()=>{setDocumentId('');setDocuments([]);},[projectId]);
 useEffect(()=>{if(mode!=='document'||!projectId) return;const abort=new AbortController(),timer=setTimeout(()=>{documentsApi.list({projectId,q:query||undefined},abort.signal).then(result=>{if(!abort.signal.aborted) setDocuments(result.items);}).catch(e=>{if(!abort.signal.aborted) setError(e.message);});},200);return()=>{clearTimeout(timer);abort.abort();};},[projectId,mode,query]);
 async function generate() {
  if(busy||!projectId||!(mode==='text'?text.trim()||files.length:documentId)) return;controller.current?.abort();const abort=new AbortController();controller.current=abort;setBusy('generate');setError('');
  try{const result=await aiApi.previewTasks({projectId,...(mode==='text'?{text}:{documentId}),instructions},abort.signal,files);if(!alive.current||abort.signal.aborted) return;setPreview(result.data);setRows(result.data.tasks.map(task=>({...task,id:crypto.randomUUID(),selected:true})));}catch(e:any){if(alive.current&&!abort.signal.aborted) setError(e.message||'拆解失败，请稍后重试');}finally{if(alive.current&&!abort.signal.aborted) setBusy(null);}
 }
 function update(id:string,change:Partial<Row>){if(!locked) setRows(items=>items.map(item=>item.id===id?{...item,...change}:item));}
 const selected=rows.filter(row=>row.selected),invalid=selected.some(row=>!row.title.trim()||row.title.trim().length>200);
 async function submit() {
  if(busy||!selected.length||invalid) return;
  if(!importRequest.current) importRequest.current={projectId,requestId:crypto.randomUUID(),tasks:selected.map(({id,selected,...task})=>({...task,title:task.title.trim()}))};
  setLocked(true);setBusy('import');setError('');
  try{const response=await aiApi.importTasks(importRequest.current);if(alive.current) onCreated(response.data.count);}catch(e:any){if(!alive.current) return;if(e.response?.status===400){importRequest.current=null;setLocked(false);}setError(e.response?.data?.error?.message||e.message||'加入结果尚未确认，请重试；相同请求不会重复创建任务。');}finally{if(alive.current) setBusy(null);}
 }
 function addFiles(added:File[]){
  if(files.length+added.length>3){setError('最多添加 3 个附件');return;}
  if(added.some(file=>! /\.(md|txt|docx|pdf)$/i.test(file.name))){setError('附件支持 Markdown、TXT、Word（DOCX）和 PDF');return;}
  if(added.some(file=>file.size>5*1024*1024)){setError('每个附件不能超过 5 MB');return;}
  setFiles(current=>[...current,...added]);setError('');
 }
 function close(){if(busy==='import') return;controller.current?.abort();onClose();}
 return <section className="content-modal task-breakdown-panel" role="region" aria-label="拆任务模式"><header className="content-toolbar"><h2>拆任务</h2><button disabled={busy==='import'} onClick={close}>{busy==='generate'?'取消生成':'返回对话'}</button></header><p>添加方案、对话或附件，拆成可执行任务，确认后加入项目看板。</p>
  <Select label="目标项目" value={projectId} disabled={!!preview||!!busy} onValueChange={setProjectId} options={projects.map(project=>({value:project.id,label:project.name}))}/>
  {error&&<p className="content-warning" role="alert">{error}{locked&&' 可重试本次加入，相同请求不会重复创建任务。'}</p>}
  {!preview?<div className="task-breakdown-source"><Select label="材料来源" value={mode} disabled={!!busy} onValueChange={value=>{setMode(value);setError('');}} options={[{value:'text',label:'粘贴方案或对话'},{value:'document',label:'选择项目文档'}]}/>{mode==='text'?<label className="content-field">方案或对话<textarea aria-label="方案或对话" rows={9} maxLength={30000} value={text} disabled={!!busy} onChange={event=>setText(event.target.value)} placeholder="粘贴方案、Markdown 或聊天记录，说明目标、工作内容和约束…"/></label>:<><label className="content-field">搜索项目文档<input aria-label="搜索项目文档" value={query} disabled={!!busy} onChange={event=>setQuery(event.target.value)}/></label><Select label="方案文档" value={documentId} disabled={!!busy} placeholder="选择本项目已保存的文档" onValueChange={setDocumentId} options={documents.map(doc=>({value:doc.id,label:doc.title}))}/>{!documents.length&&<p className="content-muted">未找到文档，可调整搜索或粘贴文字。</p>}</>}<div className="task-breakdown-attachments"><FileUpload label="添加附件" multiple accept=".md,.txt,.docx,.pdf" disabled={!!busy} onSelectFiles={addFiles}/><p className="content-muted">支持 Markdown、TXT、DOCX、PDF，最多 3 个，每个 5 MB；材料合计 30000 字。</p>{files.length>0&&<ul>{files.map((file,index)=><li key={`${file.name}-${index}`}><span>{file.name}</span><button type="button" aria-label={`移除附件 ${file.name}`} disabled={!!busy} onClick={()=>setFiles(items=>items.filter((_,i)=>i!==index))}>移除</button></li>)}</ul>}</div><label className="content-field">补充要求（可选）<textarea aria-label="拆解补充要求" rows={2} maxLength={4000} value={instructions} disabled={!!busy} onChange={event=>setInstructions(event.target.value)} placeholder="例如按实施阶段拆分，注明验收标准…"/></label></div>:<><div className="task-breakdown-summary"><strong>来源：{preview.sourceTitle}</strong><p>{preview.summary||'请检查任务内容，取消勾选不需要加入的任务。'}</p></div><div className="task-breakdown-rows">{rows.map((row,index)=><article className="task-breakdown-row" key={row.id}><label className="task-breakdown-check"><input aria-label={`加入任务 ${index+1}`} type="checkbox" checked={row.selected} disabled={locked} onChange={event=>update(row.id,{selected:event.target.checked})}/>任务 {index+1}</label><input aria-label={`任务 ${index+1} 标题`} maxLength={200} value={row.title} disabled={locked} onChange={event=>update(row.id,{title:event.target.value})}/><textarea aria-label={`任务 ${index+1} 说明`} rows={3} maxLength={4000} value={row.description} disabled={locked} onChange={event=>update(row.id,{description:event.target.value})}/><fieldset disabled={locked} className="task-breakdown-fields"><Select aria-label={`任务 ${index+1} 类型`} label="类型" value={row.type} disabled={locked} onValueChange={type=>update(row.id,{type})} options={types}/><Select aria-label={`任务 ${index+1} 优先级`} label="优先级" value={row.priority} disabled={locked} onValueChange={priority=>update(row.id,{priority:priority as Row['priority']})} options={[{value:'high',label:'高'},{value:'med',label:'中'},{value:'low',label:'低'}]}/><div className="task-breakdown-date"><DatePicker label={`任务 ${index+1} 截止日期`} value={row.dueDate||''} onChange={dueDate=>update(row.id,{dueDate:dueDate||null})}/>{row.dueDate&&<button type="button" aria-label={`清除任务 ${index+1} 截止日期`} disabled={locked} onClick={()=>update(row.id,{dueDate:null})}>清除日期</button>}</div></fieldset></article>)}</div>{invalid&&<p role="alert">选中的任务需要填写标题。</p>}</>}
  <footer className="content-modal-actions">{preview?<><button disabled={!!busy||locked} onClick={()=>{setPreview(null);setRows([]);setError('');}}>返回修改材料</button><button className="content-primary" disabled={!!busy||!selected.length||invalid} onClick={()=>void submit()}>{busy==='import'?'正在加入…':locked?'重试加入看板':`加入看板（${selected.length} 项）`}</button></>:<button className="content-primary" disabled={!!busy||!projectId||!(mode==='text'?text.trim()||files.length:documentId)} onClick={()=>void generate()}>{busy==='generate'?'正在拆解…':'生成任务清单'}</button>}</footer>
 </section>;
}
