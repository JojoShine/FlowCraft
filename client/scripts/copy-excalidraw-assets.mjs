import {cp,mkdir} from 'node:fs/promises';
const target=new URL('../public/excalidraw/fonts/',import.meta.url);
await mkdir(target,{recursive:true});
await cp(new URL('../node_modules/@excalidraw/excalidraw/dist/prod/fonts/',import.meta.url),target,{recursive:true,force:true});
