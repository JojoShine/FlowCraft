import {useState} from 'react';
import type {BlockJSON} from '../content/types';
export function inlineText(content:any):string {if(typeof content==='string') return content;if(Array.isArray(content)) return content.map(inlineText).join('');if(content&&typeof content==='object') return content.text||inlineText(content.content)||'';return '';}
export function documentHeadings(blocks:BlockJSON[]):{id:string;level:number;text:string}[] {return blocks.flatMap(b=>[...(b.type==='heading'?[{id:b.id,level:b.props?.level||1,text:inlineText(b.content)}]:[]),...documentHeadings(b.children||[])]);}
export function DocumentOutline({blocks,onSelect}:{blocks:BlockJSON[];onSelect?:(id:string)=>void}) {
 const headings=documentHeadings(blocks),[expanded,setExpanded]=useState(()=>window.innerWidth>900);
 function jump(id:string) {if(onSelect) onSelect(id);else document.querySelector(`[data-id="${CSS.escape(id)}"]`)?.scrollIntoView({behavior:'smooth',block:'start'});}
 return <nav className="document-outline" aria-label="文章目录"><button className="document-outline-toggle" aria-expanded={expanded} onClick={()=>setExpanded(!expanded)}>目录 {expanded?'−':'+'}</button>{expanded&&(headings.length?<ol>{headings.map(h=><li key={h.id} style={{paddingLeft:(h.level-1)*12}}><a href={`#${encodeURIComponent(h.id)}`} onClick={event=>{event.preventDefault();jump(h.id);}}>{h.text||'无标题'}</a></li>)}</ol>:<p>添加标题后显示目录</p>)}</nav>;
}
