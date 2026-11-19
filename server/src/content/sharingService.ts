import {randomBytes} from 'crypto';
import type {Prisma} from '@prisma/client';
import {prisma} from '../lib/prisma';
import {AppError} from '../middleware/errorHandler';
import {requireContentOwner} from './authorization';
import {runContentTransaction} from './revisions';
import {documentService} from './documentService';
import {drawingService} from './drawingService';
import {resolveDocumentEmbed} from './referenceResolver';
import {openContentAsset} from './assetAccess';
import type {Actor,ContentKind,DrawingScene} from './contracts';
async function owned(db:Prisma.TransactionClient,actor:Actor,kind:ContentKind,id:string) {
 const row=kind==='document'?await db.document.findUnique({where:{id}}):await db.drawing.findUnique({where:{id}});
 if(!row||row.deletedAt) throw AppError.notFound('内容不存在');
 await requireContentOwner(actor,row.projectId,db);return row;
}
export function shareStatus(actor:Actor,kind:ContentKind,id:string) {
 return runContentTransaction(async db=>({shareToken:(await owned(db,actor,kind,id)).shareToken}));
}
export function enableSharing(actor:Actor,kind:ContentKind,id:string) {
 return runContentTransaction(async db=>{
  const row=await owned(db,actor,kind,id);if(row.shareToken) return {shareToken:row.shareToken};
  const shareToken=randomBytes(32).toString('base64url'),data={shareToken};
  if(kind==='document') await db.document.update({where:{id},data});else await db.drawing.update({where:{id},data});
  return {shareToken};
 });
}
export function disableSharing(actor:Actor,kind:ContentKind,id:string) {
 return runContentTransaction(async db=>{
  await owned(db,actor,kind,id);const data={shareToken:null};
  if(kind==='document') await db.document.update({where:{id},data});else await db.drawing.update({where:{id},data});
 });
}
async function scope(kind:ContentKind,token:string) {
 if(!/^[A-Za-z0-9_-]{43}$/.test(token)) throw AppError.notFound('分享已关闭或内容不存在');
 const row=kind==='document'?await prisma.document.findUnique({where:{shareToken:token}}):await prisma.drawing.findUnique({where:{shareToken:token}});
 if(!row||row.deletedAt) throw AppError.notFound('分享已关闭或内容不存在');
 // Use the strict viewer asset checks; a share never receives owner privileges.
 const actor:Actor={id:'public-share',role:'viewer',projectId:row.projectId};return {row,actor};
}
function visibleScene(scene:DrawingScene):DrawingScene {
 const elements=scene.elements.filter(element=>!element.isDeleted),fileIds=new Set(elements.filter(element=>element.type==='image').map(element=>element.fileId));
 return {...scene,elements,files:Object.fromEntries(Object.entries(scene.files).filter(([id])=>fileIds.has(id)))};
}
export async function readSharedContent(kind:ContentKind,token:string) {
 const {row,actor}=await scope(kind,token);
 if(kind==='document') return documentService.read(actor,row.id);
 const view=await drawingService.read(actor,row.id);return {...view,payload:visibleScene(view.payload)};
}
export async function readSharedEmbed(token:string,blockId:string) {
 const {row,actor}=await scope('document',token),embed=await resolveDocumentEmbed(actor,row.id,blockId);
 return {...embed,scene:embed.scene?visibleScene(embed.scene):null,previewAssetId:null,status:embed.scene?'preview-pending' as const:embed.status};
}
export async function openSharedAsset(kind:ContentKind,token:string,assetId:string,blockId?:string) {
 const {row,actor}=await scope(kind,token);
 if(blockId) {
  if(kind!=='document') throw AppError.notFound('文件不存在');
  const embed=await resolveDocumentEmbed(actor,row.id,blockId);
  if(!embed.scene||!Object.values(visibleScene(embed.scene).files).some(file=>file.assetId===assetId)) throw AppError.notFound('文件不存在');
  return openContentAsset(actor,assetId,{kind:'drawing',id:embed.drawingId,revision:embed.revision,documentId:row.id,blockId});
 }
 if(kind==='drawing') {const view=await drawingService.read(actor,row.id);if(!Object.values(visibleScene(view.payload).files).some(file=>file.assetId===assetId)) throw AppError.notFound('文件不存在');}
 return openContentAsset(actor,assetId,{kind,id:row.id});
}
