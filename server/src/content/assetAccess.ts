import {prisma} from '../lib/prisma';
import {getFileStream} from '../lib/minio';
import {AppError} from '../middleware/errorHandler';
import {requireContentRead} from './authorization';
import type {Actor,ContentContext} from './contracts';
export async function openContentAsset(actor:Actor,assetId:string,context:ContentContext) {
 const asset=await prisma.contentAsset.findUnique({where:{id:assetId},include:{project:true}});
 if(!asset||asset.state!=='complete') throw AppError.notFound('文件不存在');
 await requireContentRead(actor,asset.projectId);
 const owner=actor.role==='admin'&&asset.project.ownerId===actor.id;
 let allowed=owner;
 if(!owner&&context.kind==='document') {
  const doc=await prisma.document.findUnique({where:{id:context.id}});
  if(doc&&!doc.deletedAt&&doc.projectId===asset.projectId&&(!context.revision||context.revision===doc.currentVersion)) {
   allowed=!!await prisma.documentRevisionAsset.findFirst({where:{assetId,documentRevision:{documentId:doc.id,version:doc.currentVersion}}});
  }
 }
 if(!owner&&context.kind==='drawing') {
  const drawing=await prisma.drawing.findUnique({where:{id:context.id}});
  if(drawing&&!drawing.deletedAt&&drawing.projectId===asset.projectId) {
   let version=drawing.currentVersion;
   if(context.documentId&&context.blockId) {
    const doc=await prisma.document.findUnique({where:{id:context.documentId}});
    if(!doc||doc.deletedAt||doc.projectId!==drawing.projectId) throw AppError.notFound('文件不存在');
    const ref=await prisma.documentDrawingReference.findFirst({where:{documentRevision:{documentId:doc.id,version:doc.currentVersion},blockId:context.blockId,drawingId:drawing.id}});
    if(!ref) throw AppError.notFound('文件不存在');
    version=ref.mode==='pinned'?ref.revision:drawing.currentVersion;
   }
   if(!context.revision||context.revision===version) allowed=!!await prisma.drawingRevision.findFirst({where:{drawingId:drawing.id,version,OR:[{assets:{some:{assetId}}},{previewAssetId:assetId}]}});
  }
 }
 if(!allowed) throw AppError.notFound('文件不存在');
 const {stream}=await getFileStream(asset.objectKey);
 return {stream,mimeType:asset.mimeType,bytes:asset.bytes};
}
