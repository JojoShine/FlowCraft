import {randomUUID,createHash} from 'crypto';
import {Transform} from 'stream';
import {pipeline} from 'stream/promises';
import {Prisma} from '@prisma/client';
import {prisma} from '../lib/prisma';
import {uploadFileStream,deleteFile} from '../lib/minio';
import {AppError} from '../middleware/errorHandler';
import {requireContentOwner} from './authorization';
import type {Actor,AssetDto,AssetUploadInput} from './contracts';
export async function validateAssetReferences(db:Prisma.TransactionClient,projectId:string,ids:string[]):Promise<void> {
 const unique=[...new Set(ids)];
 const count=await db.contentAsset.count({where:{id:{in:unique},projectId,state:'complete',category:{not:'preview'}}});
 if(count!==unique.length) throw AppError.badRequest('引用的文件尚未上传完成或不属于本项目');
}
export async function uploadContentAsset(actor:Actor,input:AssetUploadInput):Promise<AssetDto> {
 await requireContentOwner(actor,input.projectId);
 if(!['image','attachment'].includes(input.category)) throw AppError.badRequest('预览需通过专用接口上传');
 const limit=(input.category==='image'?10:20)*1024*1024;
 if(!Number.isSafeInteger(input.bytes)||input.bytes<1) throw AppError.badRequest('文件大小无效');
 if(input.bytes>limit) throw new AppError('文件容量过大',413);
 if(input.category==='image'&&!['image/png','image/jpeg','image/gif','image/webp'].includes(input.mimeType)) throw AppError.badRequest('不支持的图片格式');
 const id=randomUUID(),objectKey=`content/${input.projectId}/${id}`;
 await prisma.contentAsset.create({data:{id,projectId:input.projectId,creatorId:actor.id,objectKey,category:input.category,originalName:input.originalName.slice(0,255),mimeType:input.mimeType,bytes:input.bytes,digest:'',state:'uploading'}});
 let bytes=0;const hash=createHash('sha256');
 const meter=new Transform({transform(chunk,_encoding,done){bytes+=chunk.length;if(bytes>limit||bytes>input.bytes) return done(new AppError('文件容量过大',413));hash.update(chunk);done(null,chunk);}});
 const pump=pipeline(input.stream,meter);
 const upload=uploadFileStream(meter,objectKey,input.mimeType,input.bytes);
 try {
  await Promise.all([pump,upload]);
  if(bytes!==input.bytes) throw AppError.badRequest('文件数据不完整');
  const asset=await prisma.contentAsset.update({where:{id},data:{state:'complete',digest:hash.digest('hex')}});
  return {id,mimeType:asset.mimeType,bytes:asset.bytes,state:'complete'};
 } catch(error) {
  meter.destroy();input.stream.destroy();await Promise.allSettled([pump,upload]);
  await deleteFile(objectKey).catch(()=>{});
  await prisma.contentAsset.update({where:{id},data:{state:'failed'}});
  throw error;
 }
}
