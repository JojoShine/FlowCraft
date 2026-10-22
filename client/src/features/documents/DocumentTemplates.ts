import type {BlockJSON,DocumentBody} from '../content/types';
const inline=(text:string)=>[{type:'text',text,styles:{}}];
const block=(type:string,text='',props:Record<string,unknown>={}):BlockJSON=>({id:crypto.randomUUID(),type,props,content:inline(text),children:[]});
export function createDocumentTemplate(kind:'blank'|'servers'|'operations'):DocumentBody {
 if(kind==='blank') return {formatVersion:1,blocks:[block('paragraph')]};
 if(kind==='operations') return {formatVersion:1,blocks:[block('heading','项目操作手册',{level:1}),block('heading','准备工作',{level:2}),block('paragraph','说明环境、依赖与访问要求。'),block('heading','操作步骤',{level:2}),block('numberedListItem','填写操作步骤'),block('heading','验证与回退',{level:2}),block('paragraph','记录验证方法和回退步骤。')]};
 const columns=['名称','环境','IP/域名','用途','部署服务','负责人','备注'];
 const table:BlockJSON={id:crypto.randomUUID(),type:'table',content:{type:'tableContent',headerRows:1,rows:[{cells:columns.map(name=>inline(name))},{cells:columns.map(()=>inline(''))}]},children:[]};
 return {formatVersion:1,blocks:[block('heading','服务器与部署说明',{level:1}),block('heading','用途说明',{level:2}),block('paragraph','记录项目环境、服务和部署方式。'),block('heading','服务器清单',{level:2}),table,block('heading','部署拓扑',{level:2}),block('paragraph','输入 /绘图，插入或新建本项目的部署图。'),block('heading','访问方式',{level:2}),block('paragraph','填写内部访问说明；敏感凭据请使用专用的凭据管理工具。'),block('heading','变更说明',{level:2}),block('paragraph','记录本次变更及验证结果。')]};
}
