import {Prisma} from '@prisma/client';
import {prisma} from '../lib/prisma';
import {AppError} from '../middleware/errorHandler';
import {requireContentRead,requireContentOwner} from './authorization';
import {drawingReferences} from './validation';
import {runContentTransaction} from './revisions';
import type {Actor,DocumentBody,ResolvedEmbed,DocumentReferenceDto} from './contracts';
export async function captureDrawingReferences(tx:Prisma.TransactionClient,projectId:string,body:DocumentBody,previousRevisionId?:string) {
 const previous=previousRevisionId?await tx.documentDrawingReference.findMany({where:{documentRevisionId:previousRevisionId}}):[];
 const rows=[];
 for(const ref of drawingReferences(body)) {
  const d=await tx.drawing.findUnique({where:{id:ref.drawingId}});
  if(!d||d.projectId!==projectId) throw AppError.badRequest('绘图引用不属于本项目');
  const prior=previous.find(p=>p.blockId===ref.blockId&&p.drawingId===ref.drawingId);
  if(d.deletedAt&&!prior) throw AppError.badRequest('不能插入回收站中的绘图');
  const version=d.deletedAt?prior!.revision:ref.mode==='pinned'?ref.revision!:d.currentVersion;
  if(d.deletedAt&&ref.mode==='pinned'&&ref.revision!==prior!.revision) throw AppError.badRequest('不能修改已删除的绘图引用');
  const r=await tx.drawingRevision.findUnique({where:{drawingId_version:{drawingId:d.id,version}}});
  if(!r) throw AppError.badRequest('绘图版本不存在');
  rows.push({blockId:ref.blockId,drawingId:d.id,mode:ref.mode,revision:version});
 }
 return rows;
}
export async function resolveDocumentEmbed(actor:Actor,documentId:string,blockId:string,documentVersion?:number):Promise<ResolvedEmbed> {
 return runContentTransaction(async tx=>{
  const doc=await tx.document.findUnique({where:{id:documentId}});if(!doc) throw AppError.notFound('文档不存在');
  await requireContentRead(actor,doc.projectId,tx);
  if(documentVersion!==undefined) await requireContentOwner(actor,doc.projectId,tx);
  if(doc.deletedAt&&documentVersion===undefined) throw AppError.notFound('文档不存在');
  const version=documentVersion??doc.currentVersion;
  const ref=await tx.documentDrawingReference.findFirst({where:{documentRevision:{documentId,version},blockId}});
  if(!ref) throw AppError.notFound('绘图块不存在');
  const d=await tx.drawing.findUnique({where:{id:ref.drawingId}});
  const base={blockId,drawingId:ref.drawingId,revision:ref.revision,title:d?.title||'绘图',scene:null,previewAssetId:null};
  if(!d||d.projectId!==doc.projectId) return {...base,status:'unavailable'};
  if(d.deletedAt&&documentVersion===undefined) return {...base,status:'deleted'};
  const drawingVersion=documentVersion!==undefined||ref.mode==='pinned'?ref.revision:d.currentVersion;
  const r=await tx.drawingRevision.findUnique({where:{drawingId_version:{drawingId:d.id,version:drawingVersion}}});
  if(!r) return {...base,status:'unavailable'};
  return {...base,revision:r.version,title:r.title,scene:r.payload as any,previewAssetId:r.previewAssetId,status:r.previewAssetId?'ready':'preview-pending'};
 });
}
export async function listDrawingReferences(actor:Actor,drawingId:string):Promise<DocumentReferenceDto[]> {
 const d=await prisma.drawing.findUnique({where:{id:drawingId}});if(!d) throw AppError.notFound('画布不存在');await requireContentRead(actor,d.projectId);
 const rows=await prisma.documentDrawingReference.findMany({where:{drawingId,documentRevision:{document:{projectId:d.projectId,deletedAt:null}}},include:{documentRevision:{include:{document:true}}}});
 return rows.filter(r=>r.documentRevision.version===r.documentRevision.document.currentVersion).map(r=>({documentId:r.documentRevision.documentId,title:r.documentRevision.document.title,blockId:r.blockId}));
}
