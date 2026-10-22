import type {DrawingScene} from '../content/types';
export async function createDrawingTemplate(kind:'blank'|'deployment'|'flow'):Promise<DrawingScene> {
 if(kind==='blank') return {formatVersion:1,elements:[],appState:{viewBackgroundColor:'#ffffff'},files:{}};
 const {convertToExcalidrawElements}=await import('@excalidraw/excalidraw');
 const nodes=kind==='deployment'?[{type:'rectangle',x:40,y:100,width:130,height:90,label:{text:'网关'}},{type:'rectangle',x:260,y:100,width:150,height:90,label:{text:'应用服务器'}},{type:'rectangle',x:500,y:40,width:130,height:90,label:{text:'数据库'}},{type:'rectangle',x:500,y:200,width:130,height:90,label:{text:'存储'}},{type:'arrow',x:170,y:145,width:90,height:0,points:[[0,0],[90,0]]},{type:'arrow',x:410,y:145,width:90,height:-60,points:[[0,0],[90,-60]]},{type:'arrow',x:410,y:145,width:90,height:100,points:[[0,0],[90,100]]}]:[{type:'ellipse',x:40,y:80,width:110,height:70,label:{text:'开始'}},{type:'rectangle',x:250,y:80,width:140,height:70,label:{text:'处理'}},{type:'diamond',x:490,y:70,width:130,height:90,label:{text:'验证'}},{type:'arrow',x:150,y:115,width:100,height:0,points:[[0,0],[100,0]]},{type:'arrow',x:390,y:115,width:100,height:0,points:[[0,0],[100,0]]}];
 return {formatVersion:1,elements:convertToExcalidrawElements(nodes as any).map(e=>({...e})),appState:{viewBackgroundColor:'#ffffff'},files:{}};
}
export async function drawingStencils() {
 const {convertToExcalidrawElements}=await import('@excalidraw/excalidraw');
 return ['服务器','网关','数据库','存储'].map(text=>({id:crypto.randomUUID(),status:'unpublished' as const,created:Date.now(),elements:convertToExcalidrawElements([{type:'rectangle',x:0,y:0,width:150,height:90,label:{text}}])}));
}
