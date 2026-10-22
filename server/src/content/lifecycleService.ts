import {Prisma} from '@prisma/client';
import {randomUUID} from 'crypto';
import {prisma} from '../lib/prisma';
import {AppError} from '../middleware/errorHandler';
import {requireContentOwner} from './authorization';
import {runContentTransaction,pageNumber} from './revisions';
import {lockContentProject} from './documentTree';
import {contentDigest,documentText,walkBlocks,normalizeDocument} from './validation';
import {captureDrawingReferences} from './referenceResolver';
import type {Actor,ContentKind,ContentListQuery,ContentSummary,Page,DocumentBody,DrawingScene,ContentView} from './contracts';
async function owned(tx:Prisma.TransactionClient,actor:Actor,kind:ContentKind,id:string,active=false) {
 const row=kind==='document'?await tx.document.findUnique({where:{id}}):await tx.drawing.findUnique({where:{id}});
 if(!row||active&&row.deletedAt) throw AppError.notFound('内容不存在');await requireContentOwner(actor,row.projectId,tx);return row;
}
export async function trashContent(actor:Actor,kind:ContentKind,id:string):Promise<void> {
 await runContentTransaction(async tx=>{
  const row=await owned(tx,actor,kind,id,true);await lockContentProject(tx,row.projectId);const deletedAt=new Date();
  if(kind==='drawing') {await tx.drawing.update({where:{id},data:{deletedAt}});return;}
  const rows=await tx.document.findMany({where:{projectId:row.projectId,deletedAt:null}});const ids=new Set([id]);let changed=true;while(changed) {changed=false;for(const d of rows) if(d.parentId&&ids.has(d.parentId)&&!ids.has(d.id)) {ids.add(d.id);changed=true;}}
  await tx.document.updateMany({where:{id:{in:[...ids]}},data:{deletedAt}});
 });
}
export async function undeleteContent(actor:Actor,kind:ContentKind,id:string):Promise<{id:string;restoredAtRoot:boolean}> {
 return runContentTransaction(async tx=>{
  const row=await owned(tx,actor,kind,id);await lockContentProject(tx,row.projectId);
  if(kind==='drawing') {await tx.drawing.update({where:{id},data:{deletedAt:null}});return {id,restoredAtRoot:false};}
  const doc=await tx.document.findUniqueOrThrow({where:{id}});const parent=doc.parentId?await tx.document.findUnique({where:{id:doc.parentId}}):null;
  let ancestor=parent,depth=1;while(ancestor&&!ancestor.deletedAt&&depth<=5) {depth++;ancestor=ancestor.parentId?await tx.document.findUnique({where:{id:ancestor.parentId}}):null;}
  const restoredAtRoot=!!doc.parentId&&(!parent||!!parent.deletedAt||depth>5);
  await tx.document.update({where:{id},data:{deletedAt:null,...(restoredAtRoot?{parentId:null}:{})}});return {id,restoredAtRoot};
 });
}
export async function listTrashContent(actor:Actor,kind:ContentKind,query:ContentListQuery={}):Promise<Page<ContentSummary>> {
 if(actor.role!=='admin') throw new AppError('只有所有者可以查看回收站',403);
 if(query.projectId) await requireContentOwner(actor,query.projectId);
 const where={project:{ownerId:actor.id},deletedAt:{not:null},...(query.projectId?{projectId:query.projectId}:{})};const page=pageNumber(query.page);
 const rows=kind==='document'?await prisma.document.findMany({where,orderBy:{deletedAt:'desc'},skip:(page-1)*50,take:50}):await prisma.drawing.findMany({where,orderBy:{deletedAt:'desc'},skip:(page-1)*50,take:50});
 const total=kind==='document'?await prisma.document.count({where}):await prisma.drawing.count({where});
 return {items:rows.map(r=>({id:r.id,projectId:r.projectId,title:r.title,version:r.currentVersion,updatedAt:r.updatedAt.toISOString()})),total,page,pageSize:50};
}
async function copyDrawing(tx:Prisma.TransactionClient,actor:Actor,id:string,version?:number) {
 const row=await owned(tx,actor,'drawing',id,true);const r=await tx.drawingRevision.findUnique({where:{drawingId_version:{drawingId:id,version:version??row.currentVersion}},include:{assets:true}});if(!r) throw AppError.notFound('绘图版本不存在');
 const title=`${r.title.slice(0,290)} 副本`;
 const copy=await tx.drawing.create({data:{projectId:row.projectId,title,revisions:{create:{version:1,title,payload:r.payload as Prisma.InputJsonValue,digest:contentDigest(title,r.payload as unknown as DrawingScene),source:'create',previewAssetId:r.previewAssetId,assets:{create:r.assets.map(a=>({assetId:a.assetId}))}}}},include:{revisions:true}});
 return {id:copy.id,projectId:copy.projectId,version:1,title,payload:r.payload as unknown as DrawingScene,savedAt:copy.revisions[0].savedAt.toISOString(),canEdit:true,deletedAt:null};
}
export async function duplicateDrawing(actor:Actor,id:string,revision?:number):Promise<ContentView<DrawingScene>> {return runContentTransaction(tx=>copyDrawing(tx,actor,id,revision));}
export async function duplicateDocument(actor:Actor,id:string,mode:'reference'|'duplicate'):Promise<ContentView<DocumentBody>> {
 if(!['reference','duplicate'].includes(mode)) throw AppError.badRequest('复制方式无效');
 return runContentTransaction(async tx=>{
  const row=await owned(tx,actor,'document',id,true);await lockContentProject(tx,row.projectId);
  const doc=await tx.document.findUniqueOrThrow({where:{id}});const r=await tx.documentRevision.findUniqueOrThrow({where:{documentId_version:{documentId:id,version:row.currentVersion}},include:{assets:true}});
  const payload=normalizeDocument(r.payload);const refs=await captureDrawingReferences(tx,row.projectId,payload,r.id);const copies=new Map<string,string>();
  if(mode==='duplicate') for(const ref of refs) {const key=ref.drawingId+':'+ref.revision;if(!copies.has(key)) copies.set(key,(await copyDrawing(tx,actor,ref.drawingId,ref.revision)).id);}
  walkBlocks(payload.blocks,b=>{if(b.type==='drawing'&&mode==='duplicate') {const ref=refs.find(ref=>ref.blockId===b.id)!;b.props={...b.props,drawingId:copies.get(ref.drawingId+':'+ref.revision),revision:1};}b.id=randomUUID();});
  const title=`${r.title.slice(0,290)} 副本`;const snapshots=await captureDrawingReferences(tx,row.projectId,payload);
  const copy=await tx.document.create({data:{projectId:row.projectId,parentId:doc.parentId,order:doc.order+1,title,searchText:documentText(payload),revisions:{create:{version:1,title,payload:payload as unknown as Prisma.InputJsonValue,digest:contentDigest(title,payload),source:'create',drawingReferences:{create:snapshots},assets:{create:r.assets.map(a=>({assetId:a.assetId}))}}}},include:{revisions:true}});
  return {id:copy.id,projectId:copy.projectId,version:1,title,payload,savedAt:copy.revisions[0].savedAt.toISOString(),canEdit:true,deletedAt:null};
 });
}
