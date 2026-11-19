import {createHmac,timingSafeEqual} from 'crypto';
import {Readable,Writable} from 'stream';
import {ZipArchive} from 'archiver';
import type {Prisma} from '@prisma/client';
import {prisma} from '../lib/prisma';
import {getFileStream} from '../lib/minio';
import {AppError} from '../middleware/errorHandler';
import {requireContentRead,requireContentOwner} from './authorization';
import {runContentTransaction} from './revisions';
import {normalizeDocument,normalizeScene,documentAssetIds} from './validation';
import {assetExportPath,documentMarkdown} from './markdownExport';
import {nativeSceneStream,type ExportAsset,type AssetReader} from './sceneExport';
import type {Actor,DrawingScene} from './contracts';
const RESOURCE_LIMIT=100*1024*1024;
interface FrozenDrawing {blockId:string;drawingId:string;version:number;title:string;digest:string;previewAssetId:string|null;status:'ready'|'deleted'}
interface Snapshot {purpose:'content-export';userId:string;documentId:string;projectId:string;documentRevisionId:string;documentVersion:number;historical:boolean;drawings:FrozenDrawing[];assets:string[];expiresAt:number}
export interface ExportManifest {snapshotToken:string;documentVersion:number;resourceBytes:number;missingPreviews:{drawingId:string;version:number}[]}
function signature(payload:string) {const secret=process.env.JWT_SECRET;if(!secret) throw AppError.internal('缺少导出签名配置');return createHmac('sha256',secret).update('content-export:'+payload).digest();}
function sign(snapshot:Snapshot) {const payload=Buffer.from(JSON.stringify(snapshot)).toString('base64url');return payload+'.'+signature(payload).toString('base64url');}
function verify(token:string,actor:Actor,id:string):Snapshot {
 try {const parts=token.split('.');if(parts.length!==2||token.length>4*1024*1024) throw new Error();const actual=Buffer.from(parts[1],'base64url'),expected=signature(parts[0]);if(actual.length!==expected.length||actual.toString('base64url')!==parts[1]||!timingSafeEqual(actual,expected)) throw new Error();const value=JSON.parse(Buffer.from(parts[0],'base64url').toString()) as Snapshot;if(value.purpose!=='content-export'||value.userId!==actor.id||value.documentId!==id||value.expiresAt<=Date.now()) throw new Error();return value;}catch {throw new AppError('导出快照无效或已过期，请重新导出',403);}
}
async function freshActor(actor:Actor,db:Prisma.TransactionClient=prisma):Promise<Actor> {const current=await db.user.findUnique({where:{id:actor.id},select:{id:true,role:true,projectId:true}});if(!current) throw new AppError('登录已失效',401);return current;}
async function documentRevision(actor:Actor,id:string,version?:number,db:Prisma.TransactionClient=prisma) {
 const doc=await db.document.findUnique({where:{id}});if(!doc||doc.deletedAt) throw AppError.notFound('文档不存在');await requireContentRead(actor,doc.projectId,db);if(version!==undefined) await requireContentOwner(actor,doc.projectId,db);
 const revision=await db.documentRevision.findUnique({where:{documentId_version:{documentId:id,version:version??doc.currentVersion}},include:{drawingReferences:true}});if(!revision) throw AppError.notFound('版本不存在');return {doc,revision};
}
export async function createExportManifest(actor:Actor,id:string,version?:number):Promise<ExportManifest> {
 return runContentTransaction(async tx=>{
  actor=await freshActor(actor,tx);const {doc,revision}=await documentRevision(actor,id,version,tx);const body=normalizeDocument(revision.payload),assetIds=new Set(documentAssetIds(body)),drawings:FrozenDrawing[]=[];
  for(const ref of revision.drawingReferences) {
   const drawing=await tx.drawing.findUniqueOrThrow({where:{id:ref.drawingId}});if(drawing.projectId!==doc.projectId) throw AppError.notFound('绘图不存在');
   if(drawing.deletedAt&&version===undefined) {drawings.push({blockId:ref.blockId,drawingId:drawing.id,version:ref.revision,title:drawing.title,digest:'',previewAssetId:null,status:'deleted'});continue;}
   const captured=version!==undefined||ref.mode==='pinned'?ref.revision:drawing.currentVersion;
   const scene=await tx.drawingRevision.findUniqueOrThrow({where:{drawingId_version:{drawingId:drawing.id,version:captured}}});
   for(const file of Object.values(normalizeScene(scene.payload).files)) assetIds.add(file.assetId);
   drawings.push({blockId:ref.blockId,drawingId:drawing.id,version:captured,title:scene.title,digest:scene.digest,previewAssetId:scene.previewAssetId,status:'ready'});
  }
  const assets=await tx.contentAsset.findMany({where:{id:{in:[...assetIds]},projectId:doc.projectId,state:'complete',category:{not:'preview'}}});if(assets.length!==assetIds.size) throw AppError.conflict('导出资源不完整，请检查图片和附件');
  const resourceBytes=assets.reduce((sum,asset)=>sum+asset.bytes,0);if(resourceBytes>RESOURCE_LIMIT) throw new AppError('关联原始资源超过 100 MiB，请分别导出正文或单张图',413);
  const snapshot:Snapshot={purpose:'content-export',userId:actor.id,documentId:id,projectId:doc.projectId,documentRevisionId:revision.id,documentVersion:revision.version,historical:version!==undefined,drawings,assets:[...assetIds],expiresAt:Date.now()+15*60*1000};
  const missingPreviews=[...new Map(drawings.filter(d=>d.status==='ready'&&!d.previewAssetId).map(d=>[d.drawingId+':'+d.version,{drawingId:d.drawingId,version:d.version}])).values()];
  return {snapshotToken:sign(snapshot),documentVersion:revision.version,resourceBytes,missingPreviews};
 });
}
async function assertSnapshotAccess(actor:Actor,snapshot:Snapshot) {
 actor=await freshActor(actor);await requireContentRead(actor,snapshot.projectId);const doc=await prisma.document.findUnique({where:{id:snapshot.documentId}});
 if(!doc||doc.deletedAt||doc.projectId!==snapshot.projectId) throw AppError.notFound('文档不存在');
 if(snapshot.historical) await requireContentOwner(actor,snapshot.projectId);
 if(!snapshot.historical) {const ids=[...new Set(snapshot.drawings.filter(d=>d.status==='ready').map(d=>d.drawingId))];if(await prisma.drawing.count({where:{id:{in:ids},projectId:snapshot.projectId,deletedAt:null}})!==ids.length) throw AppError.conflict('引用的绘图状态已变化，请重新导出');}
}
function resourceReader(authorize:()=>Promise<void>) {
 const streams=new Set<Readable>(),waiting:(()=>void)[]=[];let active=0,cancelled=false;
 const read:AssetReader=async function*(asset) {
  if(active>=2) await new Promise<void>(resolve=>waiting.push(resolve));if(cancelled) throw new Error('下载已中止');active++;
  let stream:Readable|undefined;
  try {await authorize();if(cancelled) throw new Error('下载已中止');stream=(await getFileStream(asset.objectKey)).stream;streams.add(stream);for await(const chunk of stream) {if(cancelled) throw new Error('下载已中止');yield Buffer.from(chunk);}}
  finally {if(stream) {streams.delete(stream);stream.destroy();}active--;waiting.shift()?.();}
 };
 return {read,cancel:()=>{cancelled=true;for(const stream of streams) stream.destroy(new Error('下载已中止'));for(const wake of waiting.splice(0)) wake();}};
}
async function sendStream(source:Readable,output:Writable):Promise<void> {
 await new Promise<void>((resolve,reject)=>{source.once('error',reject);output.once('error',reject);output.once('finish',resolve);output.once('close',()=>{if(!output.writableFinished) {source.destroy();reject(new Error('下载已中止'));}});source.pipe(output);});
}
export async function streamDocumentExport(actor:Actor,id:string,token:string,output:Writable):Promise<void> {
 const snapshot=verify(token,actor,id);await assertSnapshotAccess(actor,snapshot);
 const revision=await prisma.documentRevision.findUnique({where:{id:snapshot.documentRevisionId}});if(!revision||revision.documentId!==id||revision.version!==snapshot.documentVersion) throw AppError.conflict('导出快照内容不存在');
 const assets=await prisma.contentAsset.findMany({where:{id:{in:snapshot.assets},projectId:snapshot.projectId,state:'complete'}});if(assets.length!==snapshot.assets.length) throw AppError.conflict('导出资源缺失');if(assets.reduce((sum,a)=>sum+a.bytes,0)>RESOURCE_LIMIT) throw new AppError('关联原始资源超过 100 MiB',413);
 const assetMap=new Map<string,ExportAsset>(assets.map(a=>[a.id,a])),paths=new Map(assets.map(a=>[a.id,assetExportPath(a)])),scenes=new Map<string,DrawingScene>(),previews=new Map<string,ExportAsset>();
 for(const ref of snapshot.drawings.filter(d=>d.status==='ready')) {
  const key=ref.drawingId+':'+ref.version;if(scenes.has(key)) continue;
  const scene=await prisma.drawingRevision.findUnique({where:{drawingId_version:{drawingId:ref.drawingId,version:ref.version}}});if(!scene||scene.digest!==ref.digest) throw AppError.conflict('绘图快照不一致');
  const preview=await prisma.contentAsset.findFirst({where:{id:ref.previewAssetId||scene.previewAssetId||'__missing__',projectId:snapshot.projectId,category:'preview',state:'complete'}});if(!preview) throw AppError.conflict('绘图预览尚未就绪，请由项目所有者更新预览后重试');
  const payload=normalizeScene(scene.payload);for(const file of Object.values(payload.files)) if(!assetMap.has(file.assetId)) throw AppError.conflict('绘图图片不在导出快照中');scenes.set(key,payload);previews.set(key,preview);
 }
 const reader=resourceReader(()=>assertSnapshotAccess(actor,snapshot));const archive=new ZipArchive({zlib:{level:6},statConcurrency:2});const sources:Readable[]=[];
 try {
  await new Promise<void>((resolve,reject)=>{
   let done=false;const fail=(error:Error)=>{if(done) return;done=true;reader.cancel();for(const source of sources) source.destroy();archive.abort();reject(error);};
   archive.once('error',fail);output.once('error',fail);output.once('finish',()=>{if(!done) {done=true;resolve();}});output.once('close',()=>{if(!output.writableFinished) fail(new Error('下载已中止'));});
   archive.pipe(output);
   archive.append(documentMarkdown(revision.title,normalizeDocument(revision.payload),paths,snapshot.drawings),{name:'document.md'});
   archive.append(`导出文档：${revision.title}\n正文版本：v${revision.version}\n图形使用本次导出冻结的版本。外链资源不自动下载，文档链接仍指向需要登录的系统页面。\n`,{name:'README.txt'});
   for(const asset of assets) {const source=Readable.from(reader.read(asset),{objectMode:false});sources.push(source);source.once('error',fail);archive.append(source,{name:paths.get(asset.id)!});}
   for(const [key,scene] of scenes) {const ref=snapshot.drawings.find(d=>d.drawingId+':'+d.version===key)!,stem=`drawings/${ref.drawingId}-v${ref.version}`;const svg=Readable.from(reader.read(previews.get(key)!),{objectMode:false}),native=nativeSceneStream(scene,assetMap,reader.read);for(const source of [svg,native]) {sources.push(source);source.once('error',fail);}archive.append(svg,{name:stem+'.svg'});archive.append(native,{name:stem+'.excalidraw'});}
   void archive.finalize().catch(fail);
  });
 } finally {reader.cancel();for(const source of sources) source.destroy();}
}
export async function streamMarkdownExport(actor:Actor,id:string,version:number|undefined,output:Writable):Promise<void> {
 actor=await freshActor(actor);const {revision}=await documentRevision(actor,id,version);const refs=revision.drawingReferences.map(ref=>({blockId:ref.blockId,drawingId:ref.drawingId,version:ref.revision,title:'绘图',status:'ready' as const}));
 await sendStream(Readable.from([documentMarkdown(revision.title,normalizeDocument(revision.payload),new Map(),refs,true)]),output);
}
export async function streamDrawingExport(actor:Actor,id:string,version:number|undefined,output:Writable):Promise<void> {
 actor=await freshActor(actor);const drawing=await prisma.drawing.findUnique({where:{id}});if(!drawing||drawing.deletedAt) throw AppError.notFound('绘图不存在');await requireContentRead(actor,drawing.projectId);if(version!==undefined) await requireContentOwner(actor,drawing.projectId);
 const revision=await prisma.drawingRevision.findUnique({where:{drawingId_version:{drawingId:id,version:version??drawing.currentVersion}}});if(!revision) throw AppError.notFound('版本不存在');const scene=normalizeScene(revision.payload),ids=[...new Set(Object.values(scene.files).map(f=>f.assetId))];const assets=await prisma.contentAsset.findMany({where:{id:{in:ids},projectId:drawing.projectId,state:'complete'}});if(assets.length!==ids.length) throw AppError.conflict('绘图图片缺失');
 const reader=resourceReader(async()=>{const current=await freshActor(actor);await requireContentRead(current,drawing.projectId);const live=await prisma.drawing.findUnique({where:{id}});if(!live||live.deletedAt) throw AppError.notFound('绘图不存在');if(version!==undefined) await requireContentOwner(current,drawing.projectId);});
 try {await sendStream(nativeSceneStream(scene,new Map(assets.map(a=>[a.id,a])),reader.read),output);}finally {reader.cancel();}
}
