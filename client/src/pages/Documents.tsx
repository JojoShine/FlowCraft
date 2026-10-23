import {Link,useSearchParams} from 'react-router-dom';
import {ContentCenter} from '../features/content/ContentCenter';
import {TemplateCenter} from '../features/documents/TemplateCenter';
import '../features/documents/documentTemplates.css';
export function Documents(){const [params]=useSearchParams(),templates=params.get('tab')==='templates';return <><nav className="document-tabs" role="tablist" aria-label="文档中心"><Link role="tab" aria-selected={!templates} to="/documents">文档</Link><Link role="tab" aria-selected={templates} to="/documents?tab=templates">模板</Link></nav>{templates?<TemplateCenter/>:<ContentCenter kind="document"/>}</>;}
