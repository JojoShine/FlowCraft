import {BlockNoteEditor} from '@blocknote/core';
import DOMPurify from 'dompurify';
import {createDocumentTemplate,documentTemplateOptions,type DocumentTemplateKind} from './DocumentTemplates';
import {documentToTiptap} from './tiptapDocumentAdapter';
import {parseMarkdown,safeLinkUrl} from './markdown';
import type {BlockJSON,DocumentBody} from '../content/types';
import type {Template} from '../../types';
export const builtinTemplates=documentTemplateOptions.filter(option=>option.value!=='blank').map(option=>({id:`builtin:${option.value}`,name:option.label,category:'预制模板',description:'包含章节结构、填写说明和业务表格',fileType:'builtin',content:option.value}));
export type CatalogTemplate=Pick<Template,'id'|'name'|'category'|'description'|'fileType'|'content'>;
export function cloneTemplateBody(body:DocumentBody):DocumentBody {
 const copy=structuredClone(body);function clone(blocks:BlockJSON[]):BlockJSON[]{return blocks.map(block=>{block.id=crypto.randomUUID();if(['image','file','drawing','documentLink'].includes(block.type)){return {id:block.id,type:'paragraph',content:[{type:'text',text:`待插入${block.type==='drawing'?'绘图':block.type==='documentLink'?'关联文档':block.type==='image'?'图片':'附件'}${block.props?.name?`：${block.props.name}`:''}`,styles:{}}],children:clone(block.children||[])};}block.children=clone(block.children||[]);return block;});}copy.blocks=clone(copy.blocks);return copy;
}
export function encodeTemplate(body:DocumentBody,instructions:string){return JSON.stringify({formatVersion:1,body:cloneTemplateBody(body),instructions});}
export async function decodeTemplate(template:Pick<CatalogTemplate,'content'|'fileType'>):Promise<{body:DocumentBody;instructions:string;warnings:string[]}> {
 if(template.fileType==='builtin') return {body:createDocumentTemplate(template.content as DocumentTemplateKind),instructions:'保留章节和编号，根据材料将填写说明扩写为具体内容；缺少的信息标明待补充。',warnings:[]};
 if(template.fileType==='flowcraft') {const saved=JSON.parse(template.content);if(saved.formatVersion!==1||typeof saved.instructions!=='string') throw new Error('模板格式暂不支持，原模板已保留');documentToTiptap(saved.body);return {body:cloneTemplateBody(saved.body),instructions:saved.instructions,warnings:[]};}
 if(template.fileType==='markdown') {const result=await parseMarkdown(template.content);return {...result,instructions:('description' in template?String(template.description||''):'')};}
 if(!['html','word'].includes(template.fileType)) throw new Error('此模板格式暂不能转换为文档，原模板已保留');
 if(new TextEncoder().encode(template.content).byteLength>2*1024*1024) throw new Error('模板超过 2 MiB');
 const editor=BlockNoteEditor.create({links:{isValidLink:safeLinkUrl}});
 try{const blocks=await editor.tryParseHTMLToBlocks(DOMPurify.sanitize(template.content));const body:DocumentBody={formatVersion:1,blocks:blocks as unknown as BlockJSON[]};documentToTiptap(body);return {body:cloneTemplateBody(body),instructions:'',warnings:['已转换为可编辑正文；原 HTML / Word 模板及其版式保持保留。']};}finally{editor._tiptapEditor.destroy();}
}
