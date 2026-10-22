import {Prisma} from '@prisma/client';
import {prisma} from '../lib/prisma';
import {AppError} from '../middleware/errorHandler';
import type {Actor,ContentKind,SaveAck} from './contracts';
export async function runContentTransaction<T>(fn:(tx:Prisma.TransactionClient)=>Promise<T>):Promise<T> {
 for(let attempt=0;;attempt++) {
  try {return await prisma.$transaction(fn,{isolationLevel:Prisma.TransactionIsolationLevel.Serializable,timeout:15000});}
  catch(error:any) {if(error.code==='P2034'&&attempt<3) continue; if(['P2034','P2002'].includes(error.code)) throw AppError.conflict('内容已更新，请处理版本冲突');throw error;}
 }
}
export async function replayReceipt(tx:Prisma.TransactionClient,actor:Actor,kind:ContentKind,id:string,requestId:string,digest:string):Promise<SaveAck|null> {
 const receipt=await tx.contentSaveReceipt.findUnique({where:{kind_entityId_requestId:{kind,entityId:id,requestId}}});
 if(!receipt) return null;
 if(receipt.actorId!==actor.id||receipt.requestDigest!==digest) throw AppError.conflict('请求标识已用于另一项保存');
 return receipt.result as unknown as SaveAck;
}
export async function recordReceipt(tx:Prisma.TransactionClient,actor:Actor,kind:ContentKind,id:string,requestId:string,digest:string,ack:SaveAck) {
 await tx.contentSaveReceipt.create({data:{kind,entityId:id,requestId,actorId:actor.id,requestDigest:digest,result:ack as unknown as Prisma.InputJsonValue}});
 return ack;
}
export function pageNumber(page?:number) {return Number.isInteger(page)&&page!>0?page!:1;}
