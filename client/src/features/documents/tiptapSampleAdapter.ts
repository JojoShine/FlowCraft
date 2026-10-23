import type {JSONContent} from '@tiptap/core';
import type {DocumentBody} from '../content/types';
const marks:Record<string,string>={bold:'bold',italic:'italic',strike:'strike',underline:'underline',code:'code'};
const unsupported=()=>new Error('此文档包含样板尚未支持的内容，请使用现有编辑器打开。');
export function toTiptap(body:DocumentBody):JSONContent {
 if(body.formatVersion!==1) throw unsupported();
 return {type:'doc',content:body.blocks.map(block=>{
  const allowed=block.type==='image'?['assetId','url','name']:block.type==='heading'?['level']:[];
  if(Object.keys(block.props||{}).some(key=>!allowed.includes(key))) throw unsupported();
  if(block.children?.length) throw unsupported();
  if(block.type==='image'&&(!block.props?.assetId&&block.props?.url!==`pending:${block.id}`||block.props?.assetId&&block.props?.url&&block.props.url!==`asset:${block.props.assetId}`)) throw unsupported();
  if(block.type==='image') return {type:'image',attrs:{id:block.id,assetId:block.props?.assetId||null,name:block.props?.name||'截图.png'}};
  if(!['paragraph','heading'].includes(block.type)) throw unsupported();
  const content:JSONContent[]=[];
  for(const item of block.content||[]) {
   if(item.type!=='text'||Object.keys(item.styles||{}).some(style=>!marks[style])) throw unsupported();
   const active=Object.entries(item.styles||{}).filter(([,enabled])=>enabled).map(([style])=>({type:marks[style]}));
   String(item.text).split('\n').forEach((text,index)=>{if(index) content.push({type:'hardBreak'});if(text) content.push({type:'text',text,marks:active});});
  }
  return {type:block.type,attrs:{id:block.id,...(block.type==='heading'?{level:block.props?.level||1}:{})},content};
 })};
}
export function fromTiptap(doc:JSONContent):DocumentBody {
 return {formatVersion:1,blocks:(doc.content||[]).map(node=>{
  const id=node.attrs?.id||crypto.randomUUID();
  if(node.type==='image') {const assetId=node.attrs?.assetId;return {id,type:'image',props:{...(assetId?{assetId}:{}),url:assetId?`asset:${assetId}`:`pending:${id}`,name:node.attrs?.name||'截图.png'},children:[]};}
  if(!['paragraph','heading'].includes(node.type||'')) throw unsupported();
  return {id,type:node.type!,...(node.type==='heading'?{props:{level:node.attrs?.level||1}}:{}),content:(node.content||[]).map(item=>{
   if(item.type!=='text'&&item.type!=='hardBreak') throw unsupported();
   return {type:'text',text:item.type==='hardBreak'?'\n':item.text||'',styles:Object.fromEntries((item.marks||[]).map(mark=>{if(!marks[mark.type]) throw unsupported();return [mark.type,true];}))};
  }),children:[]};
 })};
}
