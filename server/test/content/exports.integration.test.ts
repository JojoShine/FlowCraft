import {it,expect,vi} from 'vitest';
import {Readable,Writable} from 'stream';
import {mkdtemp,writeFile,rm} from 'fs/promises';
import {tmpdir} from 'os';
import {join} from 'path';
import {execFileSync} from 'child_process';
import {withContentFixture,type ContentFixture} from '../fixtures';
import {uploadContentAsset} from '../../src/content/assetService';
import {drawingService,saveDrawingPreview} from '../../src/content/drawingService';
import {documentService} from '../../src/content/documentService';
import {createExportManifest,streamDocumentExport,streamDrawingExport} from '../../src/content/exportService';
const image=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aO6kAAAAASUVORK5CYII=','base64');
async function fixture(fx:ContentFixture,preview=true) {
 const asset=await uploadContentAsset(fx.owner,{projectId:fx.project.id,category:'image',mimeType:'image/png',originalName:'../../image.png',bytes:image.length,stream:Readable.from(image)});
 const scene={...fx.scene,elements:[...fx.scene.elements,{id:'picture',type:'image',fileId:'file',x:1,y:2,width:30,height:30}],files:{file:{assetId:asset.id}}};
 const drawing=await drawingService.create(fx.owner,{projectId:fx.project.id,title:'原图',payload:scene});const revision=await drawingService.revision(fx.owner,drawing.id,1);
 if(preview) await saveDrawingPreview(fx.owner,drawing.id,1,revision.digest,Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><rect width="40" height="30"/><script>alert(1)</script></svg>'));
 const body={formatVersion:1 as const,blocks:[{id:'image',type:'image',props:{assetId:asset.id,url:`asset:${asset.id}`,name:'截图'}},{id:'drawing',type:'drawing',props:{drawingId:drawing.id,mode:'latest',revision:0}}]};
 const doc=await documentService.create(fx.owner,{projectId:fx.project.id,title:'原说明',payload:body});return {asset,drawing,doc,revision};
}
async function collect(fn:(output:Writable)=>Promise<void>) {const chunks:Buffer[]=[];const output=new Writable({write(chunk,_encoding,done){chunks.push(Buffer.from(chunk));done();}});await fn(output);return Buffer.concat(chunks);}
async function zipFiles(bytes:Buffer) {const folder=await mkdtemp(join(tmpdir(),'flowcraft-export-test-')),path=join(folder,'content.zip');await writeFile(path,bytes);const names=execFileSync('unzip',['-Z1',path],{encoding:'utf8'}).trim().split('\n');return {names,read:(name:string)=>execFileSync('unzip',['-p',path,name]),close:()=>rm(folder,{recursive:true,force:true})};}
it('frozen ZIP stays on the captured document and drawing and includes portable image bytes',()=>withContentFixture(async fx=>{
 const {asset,drawing,doc}=await fixture(fx);const manifest=await createExportManifest(fx.owner,doc.id);expect(manifest.resourceBytes).toBe(image.length);
 await drawingService.save(fx.owner,drawing.id,{baseVersion:1,requestId:fx.requestId(),source:'manual',title:'后来的图',payload:fx.scene});
 await documentService.save(fx.owner,doc.id,{baseVersion:1,requestId:fx.requestId(),source:'auto',title:'后来的正文',payload:fx.body});
 const zip=await zipFiles(await collect(out=>streamDocumentExport(fx.owner,doc.id,manifest.snapshotToken,out)));
 try {expect(zip.read('document.md').toString()).toContain('原说明');expect(zip.read('document.md').toString()).not.toContain('后来的正文');const source=JSON.parse(zip.read(`drawings/${drawing.id}-v1.excalidraw`).toString());expect(source.files.file.dataURL).toBe('data:image/png;base64,'+image.toString('base64'));expect(source.elements[0]).toEqual(fx.scene.elements[0]);expect(zip.read(`assets/${asset.id}.png`)).toEqual(image);expect(zip.read(`drawings/${drawing.id}-v1.svg`).toString()).not.toMatch(/script|onload/);expect(zip.names.some(name=>name.includes('..'))).toBe(false);expect(JSON.stringify(source)).not.toMatch(/minio|Bearer |content\//i);}finally {await zip.close();}
}));
it('viewer can export pinned current content but tokens cannot be forged, shared, or expired',()=>withContentFixture(async fx=>{
 const {drawing,doc}=await fixture(fx);const body=structuredClone(doc.payload);body.blocks[1].props!.mode='pinned';body.blocks[1].props!.revision=1;
 await documentService.save(fx.owner,doc.id,{baseVersion:1,requestId:fx.requestId(),source:'auto',title:doc.title,payload:body});
 const manifest=await createExportManifest(fx.viewer,doc.id);const bytes=await collect(out=>streamDocumentExport(fx.viewer,doc.id,manifest.snapshotToken,out));expect(bytes.subarray(0,2).toString()).toBe('PK');
 await expect(collect(out=>streamDocumentExport(fx.owner,doc.id,manifest.snapshotToken,out))).rejects.toMatchObject({statusCode:403});await expect(collect(out=>streamDocumentExport(fx.viewer,doc.id,manifest.snapshotToken+'x',out))).rejects.toMatchObject({statusCode:403});
 await expect(createExportManifest(fx.viewer,doc.id,1)).rejects.toMatchObject({statusCode:403});await expect(collect(out=>streamDrawingExport(fx.viewer,drawing.id,1,out))).rejects.toMatchObject({statusCode:403});
 vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(Date.now()+16*60*1000);try {await expect(collect(out=>streamDocumentExport(fx.viewer,doc.id,manifest.snapshotToken,out))).rejects.toMatchObject({statusCode:403});}finally {vi.useRealTimers();}
}));
it('revoked access, deleted content and resource overflow are rejected before output',()=>withContentFixture(async fx=>{
 const {asset,doc}=await fixture(fx);const manifest=await createExportManifest(fx.viewer,doc.id);const ownerManifest=await createExportManifest(fx.owner,doc.id);
 await fx.db.user.update({where:{id:fx.viewer.id},data:{projectId:fx.otherProject.id}});await expect(collect(out=>streamDocumentExport(fx.viewer,doc.id,manifest.snapshotToken,out))).rejects.toMatchObject({statusCode:404});
 await fx.db.contentAsset.update({where:{id:asset.id},data:{bytes:100*1024*1024+1}});await expect(createExportManifest(fx.owner,doc.id)).rejects.toMatchObject({statusCode:413});
 await fx.db.document.update({where:{id:doc.id},data:{deletedAt:new Date()}});await expect(collect(out=>streamDocumentExport(fx.owner,doc.id,ownerManifest.snapshotToken,out))).rejects.toMatchObject({statusCode:404});
}));
it('missing previews are filled for the same frozen token, not a new latest snapshot',()=>withContentFixture(async fx=>{
 const {drawing,doc,revision}=await fixture(fx,false);const manifest=await createExportManifest(fx.owner,doc.id);expect(manifest.missingPreviews).toEqual([{drawingId:drawing.id,version:1}]);
 await expect(collect(out=>streamDocumentExport(fx.owner,doc.id,manifest.snapshotToken,out))).rejects.toMatchObject({statusCode:409});
 await drawingService.save(fx.owner,drawing.id,{baseVersion:1,requestId:fx.requestId(),source:'manual',title:'后图',payload:fx.scene});await saveDrawingPreview(fx.owner,drawing.id,1,revision.digest,Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'));
 const zip=await zipFiles(await collect(out=>streamDocumentExport(fx.owner,doc.id,manifest.snapshotToken,out)));try {expect(zip.names).toContain(`drawings/${drawing.id}-v1.svg`);expect(zip.names).not.toContain(`drawings/${drawing.id}-v2.svg`);}finally {await zip.close();}
}));

it('missing signing configuration never falls back to a forgeable export secret',()=>withContentFixture(async fx=>{
 const {doc}=await fixture(fx);const secret=process.env.JWT_SECRET;delete process.env.JWT_SECRET;
 try {await expect(createExportManifest(fx.owner,doc.id)).rejects.toMatchObject({statusCode:500});}finally {process.env.JWT_SECRET=secret;}
}));
it('client abort terminates export without leaving resource streams running',()=>withContentFixture(async fx=>{
 const {doc}=await fixture(fx);const manifest=await createExportManifest(fx.owner,doc.id);
 const output=new Writable({write(_chunk,_encoding,done){done();this.destroy(new Error('cancelled'));}});
 await expect(streamDocumentExport(fx.owner,doc.id,manifest.snapshotToken,output)).rejects.toThrow('cancelled');
}));
