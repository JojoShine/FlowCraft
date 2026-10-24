import {blobDataURL,rasterDataBlob,type HydratedScene} from './sceneAdapter';
// Previews have a separate raster budget; editable source files retain their original bytes.
export async function preparePreviewImages(scene:HydratedScene):Promise<HydratedScene> {
 const entries=Object.entries(scene.files),budget=Math.floor(4*1024*1024/Math.max(entries.length,1));
 const files={...scene.files};
 for(const [id,file] of entries) {
  const source=rasterDataBlob(file.dataURL);if(source.size<=budget) continue;
  const image=await createImageBitmap(source);
  try {
   let ratio=Math.min(1,1600/Math.max(image.width,image.height)),blob:Blob|null=null;
   const canvas=document.createElement('canvas'),context=canvas.getContext('2d');if(!context) throw new Error('当前浏览器无法生成绘图预览');
   do {canvas.width=Math.max(1,Math.round(image.width*ratio));canvas.height=Math.max(1,Math.round(image.height*ratio));context.clearRect(0,0,canvas.width,canvas.height);context.drawImage(image,0,0,canvas.width,canvas.height);blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,'image/webp',.85));if(!blob) throw new Error('图片预览生成失败，原图已保留');ratio*=.7;} while(blob.size>budget&&Math.max(canvas.width,canvas.height)>32);
   if(blob.size>budget) throw new Error('图片预览容量过大，原图已保留');files[id]={...file,mimeType:blob.type,dataURL:await blobDataURL(blob)};
  } finally {image.close();}
 }
 return {...scene,files};
}
