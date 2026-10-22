import {createHash} from 'crypto';
import {AppError} from '../middleware/errorHandler';
import type {DocumentBody,DrawingScene,BlockJSON,DrawingReference} from './contracts';
export const DOCUMENT_LIMIT = 2*1024*1024;
export const SCENE_LIMIT = 10*1024*1024;
const blockTypes = new Set(['paragraph','heading','bulletListItem','numberedListItem','checkListItem','quote','divider','callout','codeBlock','table','image','file','documentLink','drawing']);
function object(v:any):v is Record<string,any> {return !!v && typeof v==='object' && !Array.isArray(v);}
function fail(message='内容格式无效'):never {throw AppError.badRequest(message);}
export function byteLimit(input:unknown,limit:number) {if(Buffer.byteLength(JSON.stringify(input),'utf8')>limit) throw new AppError('内容容量过大',413);}
export function normalizeDocument(input:unknown):DocumentBody {
 byteLimit(input,DOCUMENT_LIMIT);
 if(!object(input)||input.formatVersion!==1||!Array.isArray(input.blocks)) return fail('不支持的文档格式');
 const ids=new Set<string>();
 function blocks(items:any[],depth=0):BlockJSON[] {if(depth>100) return fail();return items.map(b=>{
  if(!object(b)||typeof b.id!=='string'||!b.id||ids.has(b.id)||!blockTypes.has(b.type)) return fail('不支持的内容块');ids.add(b.id);
  if(b.type==='heading' && ![1,2,3].includes(b.props?.level ?? 1)) return fail();
  if(b.type==='drawing' && (typeof b.props?.drawingId!=='string'||!['latest','pinned'].includes(b.props?.mode)||b.props.mode==='pinned'&&(!Number.isInteger(b.props.revision)||b.props.revision<1))) return fail('绘图引用无效');
  if(b.type==='documentLink'&&typeof b.props?.documentId!=='string') return fail('文档链接无效');
  return {...b,id:b.id,type:b.type,children:b.children?blocks(b.children,depth+1):[]};
 });}
 const result:DocumentBody={formatVersion:1,blocks:blocks(input.blocks)};byteLimit(result,DOCUMENT_LIMIT);return result;
}
const persistentState=['viewBackgroundColor','gridSize','gridStep','gridModeEnabled'];
export function normalizeScene(input:unknown):DrawingScene {
 byteLimit(input,SCENE_LIMIT);
 if(!object(input)||input.formatVersion!==1||!Array.isArray(input.elements)||!object(input.files)||!object(input.appState)) return fail('不支持的画布格式');
 const ids=new Set();
 for(const e of input.elements) {if(!object(e)||typeof e.id!=='string'||ids.has(e.id)||['embeddable','iframe'].includes(e.type)) return fail('画布元素无效');ids.add(e.id);}
 for(const f of Object.values(input.files)) if(!object(f)||typeof f.assetId!=='string'||Object.keys(f).some(k=>k!=='assetId')) return fail('图片必须先完成上传');
 for(const e of input.elements) if(e.type==='image'&&!e.isDeleted&&(!e.fileId||['__proto__','constructor','prototype'].includes(e.fileId)||!Object.prototype.hasOwnProperty.call(input.files,e.fileId))) return fail('画布缺少图片');
 const appState:Record<string,any>={};for(const k of persistentState) if(input.appState[k]!==undefined) appState[k]=input.appState[k];
 return {formatVersion:1,elements:input.elements,appState,files:input.files};
}
function canonical(v:any):any {if(Array.isArray(v)) return v.map(canonical);if(object(v)) return Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])]));return v;}
export function contentDigest(title:string,payload:DocumentBody|DrawingScene) {const value='elements' in payload?normalizeScene(payload):normalizeDocument(payload);return createHash('sha256').update(JSON.stringify(canonical({title,payload:value}))).digest('hex');}
export function requestDigest(input:unknown) {return createHash('sha256').update(JSON.stringify(canonical(input))).digest('hex');}
export function validateTitle(title:unknown):string {if(typeof title!=='string'||!title.trim()||title.length>300) return fail('标题必须为 1–300 字符');return title.trim();}
export function validateSave(input:any) {if(!object(input)||!Number.isInteger(input.baseVersion)||input.baseVersion<1||typeof input.requestId!=='string'||! /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.requestId)) fail('保存版本或请求标识无效');}
export function walkBlocks(blocks:BlockJSON[],fn:(b:BlockJSON)=>void) {for(const b of blocks) {fn(b);walkBlocks(b.children||[],fn);}}
export function drawingReferences(body:DocumentBody):DrawingReference[] {const refs:DrawingReference[]=[];walkBlocks(body.blocks,b=>{if(b.type==='drawing') refs.push({blockId:b.id,drawingId:b.props!.drawingId,mode:b.props!.mode,revision:b.props!.mode==='pinned'?b.props!.revision:null});});return refs;}
export function documentAssetIds(body:DocumentBody):string[] {const ids=new Set<string>();walkBlocks(body.blocks,b=>{if(['image','file'].includes(b.type)&&b.props?.assetId) ids.add(b.props.assetId);});return [...ids];}
export function documentText(body:DocumentBody):string {
 function text(content:any):string {if(typeof content==='string') return content;if(Array.isArray(content)) return content.map(text).filter(Boolean).join(' ');if(!content||typeof content!=='object') return '';if(typeof content.text==='string') return content.text;if(content.rows) return content.rows.map((row:any)=>text(row.cells)).join(' ');return text(content.content);}
 const texts:string[]=[];walkBlocks(body.blocks,b=>{const value=text(b.content);if(value) texts.push(value);});return texts.join(' ');
}
