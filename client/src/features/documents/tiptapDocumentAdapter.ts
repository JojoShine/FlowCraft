import type {JSONContent} from '@tiptap/core';
import type {BlockJSON,DocumentBody} from '../content/types';
const textTypes=['paragraph','heading','bulletListItem','numberedListItem','checkListItem','quote','callout','codeBlock'];
const atomTypes:Record<string,string>={image:'flowImage',file:'flowFile',drawing:'flowDrawing',documentLink:'flowDocumentLink',divider:'horizontalRule'};
const standardMarks=new Set(['bold','italic','strike','underline','code']);
const unsupported=()=>new Error('文档包含暂不支持的内容，已阻止编辑以保护原文。');
export function inlineToTiptap(content:any):JSONContent[] {
 if(typeof content==='string') content=[{type:'text',text:content,styles:{}}];
 if(!Array.isArray(content)) {if(content==null) return [];throw unsupported();}
 return content.flatMap((item:any):JSONContent[]=>{
  if(item.type==='link') return inlineToTiptap(item.content).map(node=>({...node,marks:[...(node.marks||[]),{type:'link',attrs:{href:item.href,flowLink:Object.fromEntries(Object.entries(item).filter(([key])=>!['type','href','content'].includes(key)))}}]}));
  if(item.type!=='text'||typeof item.text!=='string') throw unsupported();
  const styles=item.styles||{},marks=Object.entries(styles).filter(([name,value])=>standardMarks.has(name)&&value===true).map(([type])=>({type}));
  const extraStyles=Object.fromEntries(Object.entries(styles).filter(([name,value])=>!standardMarks.has(name)||value!==true));
  const extra=Object.fromEntries(Object.entries(item).filter(([key])=>!['type','text','styles'].includes(key)));
  if(Object.keys(extraStyles).length||Object.keys(extra).length) marks.push({type:'flowStyle',attrs:{styles:extraStyles,extra}} as any);
  return item.text.split('\n').flatMap((text:string,index:number)=>[...(index?[{type:'hardBreak',marks}]:[]),...(text?[{type:'text',text,marks}]:[])]);
 });
}
export function inlineFromTiptap(nodes:JSONContent[]=[]):any[] {
 const result:any[]=[];
 for(const node of nodes) {
  if(node.type!=='text'&&node.type!=='hardBreak') throw unsupported();
  const styles:Record<string,any>={},extra:Record<string,any>={};let link:JSONContent|undefined;
  for(const mark of node.marks||[]) {if(standardMarks.has(mark.type)) styles[mark.type]=true;else if(mark.type==='flowStyle') {Object.assign(styles,mark.attrs?.styles);Object.assign(extra,mark.attrs?.extra);}else if(mark.type==='link') link=mark;else throw unsupported();}
  const text={...extra,type:'text',text:node.type==='hardBreak'?'\n':node.text||'',styles};
  if(link) {const last=result[result.length-1];if(last?.type==='link'&&last.href===link.attrs?.href&&JSON.stringify(Object.fromEntries(Object.entries(last).filter(([key])=>!['type','href','content'].includes(key))))===JSON.stringify(link.attrs?.flowLink||{})) last.content.push(text);else result.push({...link.attrs?.flowLink,type:'link',href:link.attrs?.href,content:[text]});}
  else {const last=result[result.length-1];if(last?.type==='text'&&JSON.stringify({...last,text:''})===JSON.stringify({...text,text:''})) last.text+=text.text;else result.push(text);}
 }
 return result;
}
function plain(content:any):string {if(typeof content==='string') return content;return (content||[]).map((part:any)=>part.type==='link'?plain(part.content):part.text||'').join('');}
function tableToTiptap(content:any):JSONContent {
 if(content?.type!=='tableContent'||!Array.isArray(content.rows)) throw unsupported();
 const {rows,...meta}=content;
 return {type:'table',attrs:{flowTable:meta},content:rows.map((row:any,rowIndex:number)=>({type:'tableRow',attrs:{flowRow:Object.fromEntries(Object.entries(row).filter(([key])=>key!=='cells'))},content:row.cells.map((cell:any,index:number)=>({type:rowIndex<(content.headerRows||0)?'tableHeader':'tableCell',attrs:{flowCell:Array.isArray(cell)?null:Object.fromEntries(Object.entries(cell).filter(([key])=>key!=='content')),colwidth:content.columnWidths?.[index]?[content.columnWidths[index]]:null},content:[{type:'paragraph',content:inlineToTiptap(Array.isArray(cell)?cell:cell.content)}]}))}))};
}
function tableFromTiptap(node:JSONContent):any {
 const rows=(node.content||[]).map(row=>({...row.attrs?.flowRow,cells:(row.content||[]).map(cell=>{const content=inlineFromTiptap((cell.content||[]).flatMap((p,index)=>[...(index?[{type:'hardBreak'}]:[]),...(p.content||[])]));return cell.attrs?.flowCell?{...cell.attrs.flowCell,content}:content;})}));
 const meta={type:'tableContent',...node.attrs?.flowTable};
 const headerRows=(node.content||[]).findIndex(row=>row.content?.some(cell=>cell.type!=='tableHeader'));
 const count=headerRows===-1?(node.content||[]).length:headerRows;if(count||'headerRows' in meta) meta.headerRows=count;
 const widths=node.content?.[0]?.content?.map(cell=>cell.attrs?.colwidth?.[0]);if(widths?.some(Boolean)) meta.columnWidths=widths.map(width=>width||undefined);
 return {...meta,rows};
}
export function documentToTiptap(body:DocumentBody):JSONContent {
 if(body.formatVersion!==1) throw unsupported();
 function blockToNode(block:BlockJSON):JSONContent {
  const {content,children,...source}=block;
  const attrs={id:block.id,source,hasContent:Object.prototype.hasOwnProperty.call(block,'content'),hasChildren:Object.prototype.hasOwnProperty.call(block,'children'),contentShape:typeof content==='string'?'string':'array',originalContent:textTypes.includes(block.type)||block.type==='table'?null:content};
  let child:JSONContent;
  if(block.type==='table') child=tableToTiptap(content);
  else if(atomTypes[block.type]) child={type:atomTypes[block.type],attrs:{blockId:block.id,props:block.props||{}}};
  else if(!textTypes.includes(block.type)) throw unsupported();
  else if(block.type==='codeBlock') child={type:'codeBlock',attrs:{language:block.props?.language||null},content:plain(content)?[{type:'text',text:plain(content)}]:[]};
  else if(block.type==='quote') child={type:'blockquote',content:[{type:'paragraph',content:inlineToTiptap(content)}]};
  else child={type:block.type==='heading'?'heading':block.type==='callout'?'flowCallout':'paragraph',attrs:block.type==='heading'?{level:block.props?.level||1}:undefined,content:inlineToTiptap(content)};
  return {type:'flowBlock',attrs,content:[child,...(children?.length?[{type:'flowChildren',content:blocksToNodes(children)}]:[])]};
 }
 function blocksToNodes(blocks:BlockJSON[]):JSONContent[] {let number=0;return blocks.map(block=>{const node=blockToNode(block);node.attrs!.listNumber=block.type==='numberedListItem'?++number:(number=0);return node;});}
 return {type:'doc',content:blocksToNodes(body.blocks)};
}
export function documentFromTiptap(doc:JSONContent):DocumentBody {
 function nodeToBlock(node:JSONContent):BlockJSON {
  if(node.type!=='flowBlock'||!node.content?.[0]) throw unsupported();
  const a=node.attrs||{},source=a.source||{},child=node.content[0];let type:string=source.type||'paragraph',props={...source.props},content:any;
  if(child.type==='heading') {type='heading';if(child.attrs?.level!==1||props.level!==undefined||source.type!=='heading') props.level=child.attrs?.level||1;content=inlineFromTiptap(child.content);}
  else if(child.type==='paragraph') {if(!['paragraph','bulletListItem','numberedListItem','checkListItem'].includes(type)) type='paragraph';content=inlineFromTiptap(child.content);}
  else if(child.type==='flowCallout') {type='callout';content=inlineFromTiptap(child.content);}
  else if(child.type==='blockquote') {type='quote';content=inlineFromTiptap((child.content||[]).flatMap((p,index)=>[...(index?[{type:'hardBreak'}]:[]),...(p.content||[])]));}
  else if(child.type==='codeBlock') {type='codeBlock';if(child.attrs?.language||props.language!==undefined) props.language=child.attrs?.language||'text';content=(child.content||[]).map(part=>part.text||'').join('');}
  else if(child.type==='table') {type='table';content=tableFromTiptap(child);}
  else {type=Object.keys(atomTypes).find(key=>atomTypes[key]===child.type)||'';if(!type) throw unsupported();props={...props,...child.attrs?.props};content=a.originalContent;
   if(type==='image'||type==='file') {if(props.assetId) props.url=`asset:${props.assetId}`;else if(typeof props.url==='string'&&/^(blob:|data:)/.test(props.url)) props.url=`pending:${a.id}`;}
  }
  if(a.contentShape==='string'&&Array.isArray(content)&&content.every(item=>item.type==='text'&&!Object.keys(item.styles||{}).length)) content=plain(content);
  const children=node.content.filter(part=>part.type==='flowChildren').flatMap(part=>(part.content||[]).map(nodeToBlock));
  return {...source,id:a.id||crypto.randomUUID(),type,...(Object.keys(props).length||source.props?{props}:{}),...(content!==undefined&&(a.hasContent!==false||plain(content))?{content}:{}),...(a.hasChildren||children.length?{children}:{})};
 }
 return {formatVersion:1,blocks:(doc.content||[]).map(nodeToBlock)};
}
