import {useEffect,useState} from 'react';
import DOMPurify from 'dompurify';

// Mermaid has global configuration; serialize renders so themes cannot cross diagrams.
let renderQueue:Promise<unknown>=Promise.resolve();
function renderDiagram(source:string,theme:string):Promise<string> {
 const result=renderQueue.then(async()=>{
  const {default:mermaid}=await import('mermaid');
  mermaid.initialize({startOnLoad:false,securityLevel:'strict',theme:theme==='dark'?'dark':'default',htmlLabels:false,flowchart:{htmlLabels:false},maxTextSize:50000,secure:['securityLevel','startOnLoad','maxTextSize','maxEdges','htmlLabels','flowchart','theme','themeVariables']});
  const container=document.createElement('div');container.style.cssText='position:absolute;left:-100000px;top:0';document.body.append(container);
  try {
   const {svg}=await mermaid.render('mermaid-'+crypto.randomUUID(),source,container);
   return DOMPurify.sanitize(svg,{USE_PROFILES:{svg:true,svgFilters:true},FORBID_TAGS:['foreignObject'],FORBID_ATTR:['target']});
  }finally{container.remove();}
 });
 renderQueue=result.catch(()=>{});return result;
}
export function MermaidPreview({source}:{source:string}) {
 const [theme,setTheme]=useState(()=>document.documentElement.getAttribute('data-theme')||'light');
 const [result,setResult]=useState<{source:string;theme:string;svg?:string;error?:string}>();
 useEffect(()=>{const observer=new MutationObserver(()=>setTheme(document.documentElement.getAttribute('data-theme')||'light'));observer.observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});return()=>observer.disconnect();},[]);
 useEffect(()=>{
  let active=true;
  if(!source.trim()){setResult({source,theme,error:'请先填写 Mermaid 代码。'});return;}
  if(source.length>50000){setResult({source,theme,error:'图表代码过长，请拆分为多个图表。'});return;}
  const timer=setTimeout(()=>{void renderDiagram(source,theme).then(svg=>{if(active)setResult({source,theme,svg});}).catch(()=>{if(active)setResult({source,theme,error:'Mermaid 语法有误，请修改源码后重试。'});});},200);
  return()=>{active=false;clearTimeout(timer);};
 },[source,theme]);
 const current=result?.source===source&&result.theme===theme?result:undefined;
 return <div className="document-mermaid" contentEditable={false}>
  {current?.error?<p role="alert">{current.error}</p>:current?.svg?<div role="img" aria-label="Mermaid 图表" data-theme={theme} dangerouslySetInnerHTML={{__html:current.svg}}/>:<p role="status">正在生成图表…</p>}
 </div>;
}
