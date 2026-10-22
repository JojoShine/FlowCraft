import {BlockNoteEditor} from '@blocknote/core';
import type {BlockJSON,DocumentBody} from '../content/types';
export function safeLinkUrl(href:string):boolean {
 try {const url=new URL(href,'https://flowcraft.invalid/');return ['https:','http:','mailto:','tel:'].includes(url.protocol);}catch {return false;}
}
export async function parseMarkdown(markdown:string):Promise<{body:DocumentBody;warnings:string[]}> {
 if(new TextEncoder().encode(markdown).byteLength>2*1024*1024) throw new Error('Markdown 超过 2 MiB');
 const editor=BlockNoteEditor.create({links:{isValidLink:safeLinkUrl}});
 try {
  const blocks=await editor.tryParseMarkdownToBlocks(markdown),warnings:string[]=[];
  function check(items:any[]) {for(const block of items) {if(['image','file'].includes(block.type)&&block.props?.url) {const url=block.props.url;if(!safeLinkUrl(url)) {block.props.url='';warnings.push('已移除不安全的资源链接');}else if(!/^(https?:)?\/\//i.test(url)) warnings.push(`缺少本地资源：${url}，请另行上传`);else warnings.push(`外部资源：${url}，导出时不会自动抓取`);}check(block.children||[]);}}
  check(blocks);const body:DocumentBody={formatVersion:1,blocks:blocks as unknown as BlockJSON[]};if(new TextEncoder().encode(JSON.stringify(body)).byteLength>2*1024*1024) throw new Error('导入后的文档超过 2 MiB');return {body,warnings};
 } finally {editor._tiptapEditor.destroy();}
}
