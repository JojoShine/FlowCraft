import {it,expect} from 'vitest';
import {sceneToPayload,hydrateScene,importExcalidraw,exportDrawing} from '../../src/features/drawings/sceneAdapter';
const image='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aO6kAAAAASUVORK5CYII=';
const dataURL='data:image/png;base64,'+image;
const elements=[{id:'server',type:'rectangle',x:12.3456789,y:20,width:100,height:80,boundElements:[{id:'arrow',type:'arrow'}]},{id:'arrow',type:'arrow',x:120,y:60,points:[[0,0],[30,0]],startBinding:{elementId:'server',focus:0,gap:4}},{id:'screenshot',type:'image',fileId:'file',x:20,y:120,width:30,height:30}];
it('persists exact ids coordinates bindings and order, excluding view-only state',async()=>{
 const scene=sceneToPayload(elements,{scrollX:200,zoom:{value:2},viewBackgroundColor:'#fff'},{file:{id:'file',dataURL,mimeType:'image/png',created:1}},{file:'asset'});
 expect(scene.elements).toEqual(elements);expect(scene.appState).toEqual({viewBackgroundColor:'#fff'});expect(scene.files.file).toEqual({assetId:'asset'});
 const hydrated=await hydrateScene(scene,async()=>new Blob([Uint8Array.from(atob(image),c=>c.charCodeAt(0))],{type:'image/png'}));
 const exported=await exportDrawing(hydrated,'excalidraw');const json=JSON.parse(await exported.text());expect(json.files.file.dataURL).toBe(dataURL);expect(json.elements).toEqual(elements);expect(JSON.stringify(json)).not.toContain('asset:');
});
it('native import keeps binary images pending for a new drawing and rejects missing or unsafe images',async()=>{
 const source={type:'excalidraw',version:2,elements,appState:{viewBackgroundColor:'#fff'},files:{file:{id:'file',dataURL,mimeType:'image/png',created:1}}};
 const result=await importExcalidraw(new File([JSON.stringify(source)],'图.excalidraw'));expect(result.scene.elements.map(e=>e.id)).toEqual(elements.map(e=>e.id));expect(result.pendingFiles).toHaveLength(1);expect(result.pendingFiles[0].blob.size).toBeGreaterThan(0);
 await expect(importExcalidraw(new File([JSON.stringify({...source,files:{}})],'bad.excalidraw'))).rejects.toThrow(/图片/);
 await expect(importExcalidraw(new File([JSON.stringify({...source,files:{file:{dataURL:'data:image/svg+xml;base64,PHN2Zz4=',mimeType:'image/svg+xml'}}})],'bad.excalidraw'))).rejects.toThrow();
});

it('blank drawings export a usable SVG preview',async()=>{
 const blob=await exportDrawing({elements:[],appState:{viewBackgroundColor:'#ffffff'},files:{}},'svg');expect(await blob.text()).toContain('<svg');expect(blob.type).toBe('image/svg+xml');
});
