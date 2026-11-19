import type {BlockJSON,DocumentBody} from './contracts';
export interface MarkdownDrawing {blockId:string;drawingId:string;version:number;title:string;status:'ready'|'deleted';}
export function assetExportPath(asset:{id:string;mimeType:string;originalName:string}):string {
 const extensions:Record<string,string>={'image/png':'png','image/jpeg':'jpg','image/gif':'gif','image/webp':'webp','application/pdf':'pdf'};
 const suffix=extensions[asset.mimeType]||asset.originalName.match(/\.([a-zA-Z0-9]{1,10})$/)?.[1].toLowerCase()||'bin';return `assets/${asset.id}.${suffix}`;
}
const escape=(text:string)=>text.replace(/([\\`*_[\]<>|])/g,'\\$1');
function inline(content:any):string {
 if(typeof content==='string') return escape(content);
 if(Array.isArray(content)) return content.map(inline).join('');if(!content||typeof content!=='object') return '';
 if(content.type==='link') {const text=inline(content.content),href=String(content.href||'');try {if(['http:','https:','mailto:','tel:'].includes(new URL(href,'https://flowcraft.invalid').protocol)) return `[${text}](${href.replace(/[()\s]/g,c=>encodeURIComponent(c))})`;}catch {}return text;}
 if(typeof content.text==='string') {let text=escape(content.text),styles=content.styles||{};if(styles.code) return '`'+content.text.replace(/`/g,'\\`')+'`';if(styles.bold) text=`**${text}**`;if(styles.italic) text=`*${text}*`;if(styles.strike) text=`~~${text}~~`;return text;}
 return inline(content.content);
}
function plain(content:any):string {if(typeof content==='string') return content;if(Array.isArray(content)) return content.map(plain).join('');if(!content||typeof content!=='object') return '';return typeof content.text==='string'?content.text:plain(content.content);}
export function documentMarkdown(title:string,body:DocumentBody,assetPaths:Map<string,string>,drawings:MarkdownDrawing[],bodyOnly=false):string {
 const refs=new Map(drawings.map(ref=>[ref.blockId,ref]));
 function render(block:BlockJSON,depth=0):string {
  const text=inline(block.content),props=block.props||{},indent='    '.repeat(depth);let result='';
  switch(block.type) {
   case 'heading':result='#'.repeat(Math.min(3,Math.max(1,props.level||1)))+' '+text;break;
   case 'bulletListItem':result='- '+text;break;
   case 'numberedListItem':result='1. '+text;break;
   case 'checkListItem':result=`- [${props.checked?'x':' '}] ${text}`;break;
   case 'quote':result=text.split('\n').map(line=>'> '+line).join('\n');break;
   case 'callout':result='> 💡 '+text;break;
   case 'divider':result='---';break;
   case 'codeBlock':{const source=plain(block.content),runs=source.match(/`+/g)||[],fence='`'.repeat(Math.max(3,...runs.map(run=>run.length+1)));result=fence+String(props.language||'').replace(/[^a-zA-Z0-9_-]/g,'')+'\n'+source+'\n'+fence;break;}
   case 'table':{const rows=(block.content?.rows||[]).map((row:any)=>row.cells.map((cell:any)=>inline(Array.isArray(cell)?cell:cell.content).replace(/\n/g,'<br>')));if(rows.length) {const width=Math.max(...rows.map((row:string[])=>row.length));result=rows.map((row:string[],index:number)=>'| '+Array.from({length:width},(_,i)=>row[i]||'').join(' | ')+' |'+(index===0?'\n| '+Array(width).fill('---').join(' | ')+' |':'')).join('\n');}break;}
   case 'image':case 'file':{const path=props.assetId?assetPaths.get(props.assetId):props.url;const name=escape(props.caption||props.name||(block.type==='image'?'图片':'附件'));result=bodyOnly?`[${name}（资源未包含）]`:path?`${block.type==='image'?'!':''}[${name}](${String(path).replace(/[()\s]/g,c=>encodeURIComponent(c))})`:`[${name}：资源缺失]`;break;}
   case 'drawing':{const ref=refs.get(block.id);if(!ref||ref.status==='deleted') result='> 图已移入回收站';else if(bodyOnly) result=`[绘图：${escape(ref.title)} v${ref.version}（预览和源图未包含）]`;else {const stem=`drawings/${ref.drawingId}-v${ref.version}`;result=`![${escape(props.caption||ref.title)}](${stem}.svg)\n\n[可编辑源图 v${ref.version}](${stem}.excalidraw)`;}break;}
   case 'documentLink':result=`[关联文档](/flowcraft/documents/${encodeURIComponent(props.documentId||'')})`;break;
   default:result=text;
  }
  return result.split('\n').map(line=>indent+line).join('\n')+(block.children?.length?'\n\n'+block.children.map(child=>render(child,depth+1)).join('\n\n'):'');
 }
 return '# '+escape(title)+'\n\n'+(bodyOnly?'> 仅导出正文；图片、附件和绘图文件未包含。\n\n':'')+body.blocks.map(block=>render(block)).join('\n\n')+'\n';
}
