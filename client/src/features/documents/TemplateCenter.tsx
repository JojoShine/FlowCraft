import {useEffect,useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {useAuth} from '../../contexts/AuthContext';
import {useConfirm} from '../../components/ui/ConfirmDialog';
import {templatesApi} from '../../services/api';
import {TemplateDrawer} from '../../pages/Templates';
import {TemplateEditor} from './TemplateEditor';
import {builtinTemplates,decodeTemplate,type CatalogTemplate} from './documentTemplateCatalog';
import type {DocumentBody} from '../content/types';
import type {Template} from '../../types';
import './documentTemplates.css';
export function TemplateCenter(){
 const {user}=useAuth(),owner=user?.role==='admin',navigate=useNavigate(),confirm=useConfirm();const [templates,setTemplates]=useState<Template[]>([]),[loading,setLoading]=useState(true),[query,setQuery]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[legacy,setLegacy]=useState<Template|null>(null),[editing,setEditing]=useState<{templateId?:string;name?:string;category?:string;body?:DocumentBody;instructions?:string}|null>(null);
 useEffect(()=>{let active=true;setLoading(true);templatesApi.list().then(result=>{if(active)setTemplates(result.data);}).catch(e=>{if(active)setError(e.message);}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[user?.id]);
 async function open(template:CatalogTemplate){setError('');if(!['builtin','flowcraft'].includes(template.fileType)){setLegacy(template as Template);return;}try{const decoded=await decodeTemplate(template);setEditing({templateId:template.fileType==='flowcraft'?template.id:undefined,name:template.name+(template.fileType==='builtin'?' 副本':''),category:template.fileType==='builtin'?'文档':template.category,body:decoded.body,instructions:decoded.instructions});}catch(e:any){setError(e.message);}}
 async function remove(template:Template){if(busy||!await confirm({title:'删除模板？',description:`删除“${template.name}”不会影响已经创建的文档。`,confirmText:'删除模板',variant:'danger'})) return;setBusy(true);try{await templatesApi.delete(template.id);setTemplates(items=>items.filter(item=>item.id!==template.id));}catch(e:any){setError(e.message);}finally{setBusy(false);}}
 function saved(template:Template){setTemplates(items=>[template,...items.filter(item=>item.id!==template.id)]);setEditing(null);setLegacy(null);}
 const items=[...builtinTemplates,...templates].filter(template=>`${template.name} ${template.category}`.toLowerCase().includes(query.toLowerCase()));
 return <section className="content-center"><header className="content-center-heading"><div><h1>文档模板</h1><p>选择结构和写作要求，新建文档后可在右侧助手中扩写。</p></div>{owner&&<button className="content-primary" onClick={()=>setEditing({})}>新建模板</button>}</header><div className="content-filterbar"><input aria-label="搜索模板" placeholder="搜索模板名称或分类…" value={query} onChange={event=>setQuery(event.target.value)}/></div>{error&&<p role="alert" className="content-warning">{error}</p>}{loading?<p role="status">正在读取模板…</p>:<div className="template-grid">{items.map(template=><article className="template-card" key={template.id}><small>{template.category} · {template.fileType==='builtin'?'预制':template.fileType==='flowcraft'?'文档模板':template.fileType==='word'?'Word 原模板':`${template.fileType.toUpperCase()} 原模板`}</small><h2>{template.name}</h2><p>{template.description||'可复用的文档结构与填写说明'}</p><div className="template-card-actions">{owner&&<button className="content-primary" onClick={()=>navigate('/documents',{state:{templateId:template.id,templateName:template.name}})}>使用模板</button>}<button onClick={()=>void open(template)}>{template.fileType==='builtin'?(owner?'创建副本':'查看'):owner?'编辑':'查看'}</button>{owner&&template.fileType!=='builtin'&&<button disabled={busy} aria-label={`删除模板 ${template.name}`} onClick={()=>void remove(template as Template)}>删除</button>}</div></article>)}</div>}
 {editing&&<TemplateEditor {...editing} readOnly={!owner} onSaved={saved} onClose={()=>setEditing(null)}/>}{legacy&&<TemplateDrawer isOpen mode={owner?'edit':'view'} template={legacy} isViewer={!owner} onClose={()=>setLegacy(null)} onSwitchToEdit={()=>{}} onSave={async data=>{try{saved((await templatesApi.update(legacy.id,data)).data);}catch(e:any){setError(e.message);}}}/>}
 </section>;
}
