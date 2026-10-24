import {Prisma} from '@prisma/client';
import {prisma} from '../lib/prisma';
import {AppError} from '../middleware/errorHandler';
import {requireContentRead,requireContentOwner,readableProjectWhere} from './authorization';
import {sanitizeSvg} from './sanitizeSvg';
import {storeDrawingPreviewAsset} from './assetService';
import {validateAssetReferences} from './assetService';
import {runContentTransaction,replayReceipt,recordReceipt,pageNumber} from './revisions';
import {normalizeScene,contentDigest,requestDigest,validateTitle,validateSave} from './validation';
import type {Actor,DrawingScene,ContentView,CreateContentInput,ContentListQuery,SaveEnvelope,SaveAck,RestoreInput,DrawingRevisionDto,RevisionPage} from './contracts';
type DB=Prisma.TransactionClient;
async function drawing(tx:DB,actor:Actor,id:string,write=false,history=false) {
 const d=await tx.drawing.findUnique({where:{id}});if(!d) throw AppError.notFound('画布不存在');
 await (write?requireContentOwner:requireContentRead)(actor,d.projectId,tx);
 if(d.deletedAt&&!history) throw new AppError('画布已移入回收站',write?410:404);
 return d;
}
function view(d:any,r:any,actor:Actor):ContentView<DrawingScene> {return {id:d.id,projectId:d.projectId,version:r.version,title:r.title,payload:r.payload,savedAt:r.savedAt.toISOString(),canEdit:actor.role==='admin',deletedAt:d.deletedAt?.toISOString()||null};}
async function commit(actor:Actor,id:string,input:SaveEnvelope<DrawingScene>|RestoreInput,restore:boolean):Promise<SaveAck> {
 validateSave(input);const reqDigest=requestDigest({operation:restore?'restore':'save',...input});
 return runContentTransaction(async tx=>{
  const d=await drawing(tx,actor,id,true);
  const replay=await replayReceipt(tx,actor,'drawing',id,input.requestId,reqDigest);if(replay) return replay;
  if(d.currentVersion!==input.baseVersion) throw AppError.conflict('画布已在其他位置更新');
  const current=await tx.drawingRevision.findUniqueOrThrow({where:{drawingId_version:{drawingId:id,version:d.currentVersion}}});
  let title:string,payload:DrawingScene;
  if(restore) {
   const old=await tx.drawingRevision.findUnique({where:{drawingId_version:{drawingId:id,version:(input as RestoreInput).revision}}});if(!old) throw AppError.notFound('版本不存在');
   title=old.title;payload=normalizeScene(old.payload);
  } else {
   const save=input as SaveEnvelope<DrawingScene>;if(!['auto','manual'].includes(save.source)) throw AppError.badRequest('保存来源无效');title=validateTitle(save.title);payload=normalizeScene(save.payload);
  }
  const digest=contentDigest(title,payload);let revision=current;
  if(restore||digest!==current.digest) {
   const ids=[...new Set(Object.values(payload.files).map(f=>f.assetId))];await validateAssetReferences(tx,d.projectId,ids);
   const updated=await tx.drawing.updateMany({where:{id,currentVersion:input.baseVersion,deletedAt:null},data:{title,currentVersion:{increment:1}}});if(updated.count!==1) throw AppError.conflict('画布已更新');
   revision=await tx.drawingRevision.create({data:{drawingId:id,version:d.currentVersion+1,title,payload:payload as unknown as Prisma.InputJsonValue,digest,source:restore?'restore':(input as SaveEnvelope<DrawingScene>).source,restoredFrom:restore?(input as RestoreInput).revision:null,assets:{create:ids.map(assetId=>({assetId}))}}});
  }
  return recordReceipt(tx,actor,'drawing',id,input.requestId,reqDigest,{version:revision.version,digest:revision.digest,savedAt:revision.savedAt.toISOString(),requestId:input.requestId});
 });
}
export const drawingService={
 async create(actor:Actor,input:CreateContentInput<DrawingScene>):Promise<ContentView<DrawingScene>> {
  const title=validateTitle(input.title),payload=normalizeScene(input.payload);
  return runContentTransaction(async tx=>{
   await requireContentOwner(actor,input.projectId,tx);const ids=[...new Set(Object.values(payload.files).map(f=>f.assetId))];await validateAssetReferences(tx,input.projectId,ids);
   const d=await tx.drawing.create({data:{projectId:input.projectId,title,revisions:{create:{version:1,title,payload:payload as unknown as Prisma.InputJsonValue,digest:contentDigest(title,payload),source:'create',assets:{create:ids.map(assetId=>({assetId}))}}}},include:{revisions:true}});
   return view(d,d.revisions[0],actor);
  });
 },
 async list(actor:Actor,query:ContentListQuery={}) {
  if(query.projectId) await requireContentRead(actor,query.projectId);
  const preferences=query.favorite||query.recent?await prisma.contentPreference.findMany({where:{userId:actor.id,kind:'drawing',...(query.favorite?{favorite:true}:{lastViewedAt:{not:null}})},orderBy:{lastViewedAt:'desc'}}):null;
  const where:Prisma.DrawingWhereInput={project:{...readableProjectWhere(actor)},deletedAt:null,...(query.projectId?{projectId:query.projectId}:{}),...(query.q?{title:{contains:query.q,mode:'insensitive'}}:{}),...(preferences?{id:{in:preferences.map(p=>p.entityId)}}:{})};
  const page=pageNumber(query.page);const [total,rows]=await Promise.all([prisma.drawing.count({where}),prisma.drawing.findMany({where,orderBy:{updatedAt:'desc'},skip:(page-1)*50,take:50,include:{revisions:{orderBy:{version:'desc'},take:1,select:{previewAssetId:true}}}})]);
  return {items:rows.map(d=>({id:d.id,projectId:d.projectId,title:d.title,version:d.currentVersion,updatedAt:d.updatedAt.toISOString(),previewAssetId:d.revisions[0]?.previewAssetId})),total,page,pageSize:50};
 },
 async read(actor:Actor,id:string) {return runContentTransaction(async tx=>{const d=await drawing(tx,actor,id);const r=await tx.drawingRevision.findUniqueOrThrow({where:{drawingId_version:{drawingId:id,version:d.currentVersion}}});return view(d,r,actor);});},
 save(actor:Actor,id:string,input:SaveEnvelope<DrawingScene>) {return commit(actor,id,input,false);},
 restore(actor:Actor,id:string,input:RestoreInput) {return commit(actor,id,input,true);},
 async history(actor:Actor,id:string,page=1):Promise<RevisionPage> {
  const d=await drawing(prisma,actor,id,false,true);await requireContentOwner(actor,d.projectId);page=pageNumber(page);
  const [total,rows]=await Promise.all([prisma.drawingRevision.count({where:{drawingId:id}}),prisma.drawingRevision.findMany({where:{drawingId:id},orderBy:{version:'desc'},skip:(page-1)*20,take:20})]);
  return {items:rows.map(r=>({version:r.version,title:r.title,savedAt:r.savedAt.toISOString(),source:r.source as any,restoredFrom:r.restoredFrom})),total,page,pageSize:20};
 },
 async revision(actor:Actor,id:string,version:number):Promise<DrawingRevisionDto> {
  const d=await drawing(prisma,actor,id,false,true);await requireContentOwner(actor,d.projectId);
  const r=await prisma.drawingRevision.findUnique({where:{drawingId_version:{drawingId:id,version}}});if(!r) throw AppError.notFound('版本不存在');return {...view(d,r,actor),digest:r.digest,source:r.source,restoredFrom:r.restoredFrom};
 }
};

export async function saveDrawingPreview(actor:Actor,id:string,version:number,digest:string,svg:Buffer) {
 const d=await drawing(prisma,actor,id,true);
 const revision=await prisma.drawingRevision.findUnique({where:{drawingId_version:{drawingId:id,version}},include:{previewAsset:true}});
 if(!revision) throw AppError.notFound('版本不存在');if(revision.digest!==digest) throw AppError.conflict('预览与场景版本不一致');
 if(revision.previewAsset?.state==='complete') return {id:revision.previewAsset.id,mimeType:revision.previewAsset.mimeType,bytes:revision.previewAsset.bytes,state:'complete' as const};
 const asset=await storeDrawingPreviewAsset(actor,d.projectId,sanitizeSvg(svg));
 return runContentTransaction(async tx=>{
  await drawing(tx,actor,id,true);const current=await tx.drawingRevision.findUniqueOrThrow({where:{drawingId_version:{drawingId:id,version}}});
  if(current.digest!==digest) throw AppError.conflict('预览与场景版本不一致');
  await tx.drawingRevision.update({where:{id:current.id},data:{previewAssetId:asset.id}});return asset;
 });
}
