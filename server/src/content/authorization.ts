import {prisma} from '../lib/prisma';
import {AppError} from '../middleware/errorHandler';
import type {Actor} from './contracts';
import type {Prisma} from '@prisma/client';
type DB = Prisma.TransactionClient;
export async function requireContentRead(actor:Actor,projectId:string,db:DB=prisma):Promise<void> {
 const project=await db.project.findUnique({where:{id:projectId},select:{ownerId:true}});
 if(!project||!(actor.role==='admin'&&project.ownerId===actor.id||actor.role==='viewer'&&actor.projectId===projectId)) throw AppError.notFound('内容不存在');
}
export async function requireContentOwner(actor:Actor,projectId:string,db:DB=prisma):Promise<void> {
 const project=await db.project.findUnique({where:{id:projectId},select:{ownerId:true}});
 if(!project||actor.role!=='admin'||project.ownerId!==actor.id) throw new AppError('只有项目所有者可以修改内容',403);
}
export function readableProjectWhere(actor:Actor) {return actor.role==='admin'?{ownerId:actor.id}:{id:actor.role==='viewer'?(actor.projectId||'__none__'):'__none__'};}
