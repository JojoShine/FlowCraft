import {Prisma} from '@prisma/client';
import {prisma} from '../lib/prisma';
import {AppError} from '../middleware/errorHandler';
import {requireContentRead,requireContentOwner,readableProjectWhere} from './authorization';
import {validateAssetReferences} from './assetService';
import {runContentTransaction,replayReceipt,recordReceipt,pageNumber} from './revisions';
import {normalizeDocument,contentDigest,requestDigest,validateTitle,validateSave,documentAssetIds,documentText,walkBlocks} from './validation';
import type {Actor,DocumentBody,ContentView,CreateContentInput,ContentListQuery,SaveEnvelope,SaveAck,RestoreInput,DocumentRevisionDto,RevisionPage} from './contracts';
import {captureDrawingReferences} from './referenceResolver';
type DB=Prisma.TransactionClient;
async function document(tx:DB,actor:Actor,id:string,write=false,history=false) {
 const d=await tx.document.findUnique({where:{id}});if(!d) throw AppError.notFound('文档不存在');
 await (write?requireContentOwner:requireContentRead)(actor,d.projectId,tx);
 if(d.deletedAt&&!history) throw new AppError('文档已移入回收站',write?410:404);
 return d;
}
function view(d:any,r:any,actor:Actor):ContentView<DocumentBody> {return {id:d.id,projectId:d.projectId,version:r.version,title:r.title,payload:r.payload,savedAt:r.savedAt.toISOString(),canEdit:actor.role==='admin',deletedAt:d.deletedAt?.toISOString()||null};}
async function commit(actor:Actor,id:string,input:SaveEnvelope<DocumentBody>|RestoreInput,restore:boolean):Promise<SaveAck> {
 validateSave(input);const reqDigest=requestDigest({operation:restore?'restore':'save',...input});
 return runContentTransaction(async tx=>{
  const d=await document(tx,actor,id,true);
  const replay=await replayReceipt(tx,actor,'document',id,input.requestId,reqDigest);if(replay) return replay;
  if(d.currentVersion!==input.baseVersion) throw AppError.conflict('文档已在其他位置更新');
  const current=await tx.documentRevision.findUniqueOrThrow({where:{documentId_version:{documentId:id,version:d.currentVersion}}});
  let title:string,payload:DocumentBody;
  if(restore) {
   const old=await tx.documentRevision.findUnique({where:{documentId_version:{documentId:id,version:(input as RestoreInput).revision}}});if(!old) throw AppError.notFound('版本不存在');
   title=old.title;payload=normalizeDocument(old.payload);
   const refs=await tx.documentDrawingReference.findMany({where:{documentRevisionId:old.id}});
   const snapshots=new Map(refs.map(r=>[r.blockId,r]));
   walkBlocks(payload.blocks,b=>{if(b.type==='drawing') {const ref=snapshots.get(b.id);if(!ref) throw AppError.badRequest('历史绘图快照缺失');b.props={...b.props,mode:'pinned',revision:ref.revision};}});
  } else {
   const save=input as SaveEnvelope<DocumentBody>;if(!['auto','manual'].includes(save.source)) throw AppError.badRequest('保存来源无效');title=validateTitle(save.title);payload=normalizeDocument(save.payload);
  }
  const digest=contentDigest(title,payload);let revision=current;
  if(restore||digest!==current.digest) {
   const ids=documentAssetIds(payload);await validateAssetReferences(tx,d.projectId,ids);
   const previous=restore?await tx.documentRevision.findUniqueOrThrow({where:{documentId_version:{documentId:id,version:(input as RestoreInput).revision}}}):current;
   const refs=await captureDrawingReferences(tx,d.projectId,payload,previous.id);
   await validateDocumentLinks(tx,d.projectId,payload);
   const updated=await tx.document.updateMany({where:{id,currentVersion:input.baseVersion,deletedAt:null},data:{title,searchText:documentText(payload),currentVersion:{increment:1}}});if(updated.count!==1) throw AppError.conflict('文档已更新');
   revision=await tx.documentRevision.create({data:{documentId:id,version:d.currentVersion+1,title,payload:payload as unknown as Prisma.InputJsonValue,digest,source:restore?'restore':(input as SaveEnvelope<DocumentBody>).source,restoredFrom:restore?(input as RestoreInput).revision:null,drawingReferences:{create:refs},assets:{create:ids.map(assetId=>({assetId}))}}});
  }
  return recordReceipt(tx,actor,'document',id,input.requestId,reqDigest,{version:revision.version,digest:revision.digest,savedAt:revision.savedAt.toISOString(),requestId:input.requestId});
 });
}
export const documentService={
 async create(actor:Actor,input:CreateContentInput<DocumentBody>):Promise<ContentView<DocumentBody>> {
  const title=validateTitle(input.title),payload=normalizeDocument(input.payload);
  return runContentTransaction(async tx=>{
   await requireContentOwner(actor,input.projectId,tx);
   await validateDocumentLinks(tx,input.projectId,payload);
   const refs=await captureDrawingReferences(tx,input.projectId,payload);
   const ids=documentAssetIds(payload);await validateAssetReferences(tx,input.projectId,ids);
   const d=await tx.document.create({data:{projectId:input.projectId,title,searchText:documentText(payload),revisions:{create:{version:1,title,payload:payload as unknown as Prisma.InputJsonValue,digest:contentDigest(title,payload),source:'create',drawingReferences:{create:refs},assets:{create:ids.map(assetId=>({assetId}))}}}},include:{revisions:true}});
   return view(d,d.revisions[0],actor);
  });
 },
 async count(actor:Actor,projectId?:string) {
  if(projectId) await requireContentRead(actor,projectId);
  return {total:await prisma.document.count({where:{project:{...readableProjectWhere(actor)},deletedAt:null,...(projectId?{projectId}:{})}})};
 },
 async list(actor:Actor,query:ContentListQuery={}) {
  if(query.projectId) await requireContentRead(actor,query.projectId);
  const preferences=query.favorite||query.recent?await prisma.contentPreference.findMany({where:{userId:actor.id,kind:'document',...(query.favorite?{favorite:true}:{lastViewedAt:{not:null}})},orderBy:{lastViewedAt:'desc'}}):null;
  const where:Prisma.DocumentWhereInput={project:{...readableProjectWhere(actor)},deletedAt:null,...(query.projectId?{projectId:query.projectId}:{}),...(query.q?{OR:[{title:{contains:query.q,mode:'insensitive'}},{searchText:{contains:query.q,mode:'insensitive'}}]}:{}),...(preferences?{id:{in:preferences.map(p=>p.entityId)}}:{})};
  const page=pageNumber(query.page);const [total,rows]=await Promise.all([prisma.document.count({where}),prisma.document.findMany({where,orderBy:{updatedAt:'desc'},skip:(page-1)*50,take:50})]);
  return {items:rows.map(d=>({id:d.id,projectId:d.projectId,title:d.title,version:d.currentVersion,updatedAt:d.updatedAt.toISOString()})),total,page,pageSize:50};
 },
 async read(actor:Actor,id:string) {return runContentTransaction(async tx=>{const d=await document(tx,actor,id);const r=await tx.documentRevision.findUniqueOrThrow({where:{documentId_version:{documentId:id,version:d.currentVersion}}});return view(d,r,actor);});},
 save(actor:Actor,id:string,input:SaveEnvelope<DocumentBody>) {return commit(actor,id,input,false);},
 restore(actor:Actor,id:string,input:RestoreInput) {return commit(actor,id,input,true);},
 async history(actor:Actor,id:string,page=1):Promise<RevisionPage> {
  const d=await document(prisma,actor,id,false,true);await requireContentOwner(actor,d.projectId);page=pageNumber(page);
  const [total,rows]=await Promise.all([prisma.documentRevision.count({where:{documentId:id}}),prisma.documentRevision.findMany({where:{documentId:id},orderBy:{version:'desc'},skip:(page-1)*20,take:20})]);
  return {items:rows.map(r=>({version:r.version,title:r.title,savedAt:r.savedAt.toISOString(),source:r.source as any,restoredFrom:r.restoredFrom})),total,page,pageSize:20};
 },
 async revision(actor:Actor,id:string,version:number):Promise<DocumentRevisionDto> {
  const d=await document(prisma,actor,id,false,true);await requireContentOwner(actor,d.projectId);
  const r=await prisma.documentRevision.findUnique({where:{documentId_version:{documentId:id,version}}});if(!r) throw AppError.notFound('版本不存在');const references=await prisma.documentDrawingReference.findMany({where:{documentRevisionId:r.id}});return {...view(d,r,actor),digest:r.digest,source:r.source,restoredFrom:r.restoredFrom,references:references.map(ref=>({blockId:ref.blockId,drawingId:ref.drawingId,mode:ref.mode as 'latest'|'pinned',revision:ref.revision}))};
 }
};

async function validateDocumentLinks(tx:DB,projectId:string,body:DocumentBody) {
 const ids:string[]=[];walkBlocks(body.blocks,b=>{if(b.type==='documentLink') ids.push(b.props!.documentId);});
 if(await tx.document.count({where:{id:{in:[...new Set(ids)]},projectId}})!==new Set(ids).size) throw AppError.badRequest('文档链接不属于本项目');
}
