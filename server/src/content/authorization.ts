import {prisma} from '../lib/prisma';
import {AppError} from '../middleware/errorHandler';
import type {Actor,ContentKind,ContentUploadContext} from './contracts';
import type {Prisma} from '@prisma/client';
type DB = Prisma.TransactionClient;
type ContentWriteTarget = {projectId:string;allowCollaboratorEditing:boolean};
export async function requireContentRead(actor:Actor,projectId:string,db:DB=prisma):Promise<void> {
 const project=await db.project.findUnique({where:{id:projectId},select:{ownerId:true}});
 if(!project||!(actor.role==='admin'&&project.ownerId===actor.id||actor.role==='viewer'&&actor.projectId===projectId)) throw AppError.notFound('内容不存在');
}
export async function requireContentOwner(actor:Actor,projectId:string,db:DB=prisma):Promise<void> {
 const project=await db.project.findUnique({where:{id:projectId},select:{ownerId:true}});
 if(!project||actor.role!=='admin'||project.ownerId!==actor.id) throw new AppError('只有项目所有者可以修改内容',403);
}
export async function canWriteContent(actor:Actor,{projectId,allowCollaboratorEditing}:ContentWriteTarget,kind:ContentKind,db:DB=prisma):Promise<boolean> {
 if(actor.role==='admin') return !!await db.project.findFirst({where:{id:projectId,ownerId:actor.id},select:{id:true}});
 if(!allowCollaboratorEditing||actor.role!=='viewer'||actor.projectId!==projectId) return false;
 const viewer=await db.user.findFirst({where:{id:actor.id,role:'viewer',projectId},select:{canEditDocuments:true,canEditDrawings:true}});
 return (kind==='document'?viewer?.canEditDocuments:viewer?.canEditDrawings)??false;
}
export async function requireContentWrite(actor:Actor,content:ContentWriteTarget,kind:ContentKind,db:DB=prisma):Promise<void> {
 if(!await canWriteContent(actor,content,kind,db)) throw new AppError('当前没有编辑该内容的权限',403);
}
export async function requireContentUpload(actor:Actor,projectId:string,context?:ContentUploadContext):Promise<void> {
 if(!context) return requireContentOwner(actor,projectId);
 const where={id:context.id,projectId,deletedAt:null};
 const select={projectId:true,allowCollaboratorEditing:true} as const;
 const content=context.kind==='document'?await prisma.document.findFirst({where,select}):await prisma.drawing.findFirst({where,select});
 if(!content) throw new AppError('当前没有编辑该内容的权限',403);
 await requireContentWrite(actor,content,context.kind);
}
export function readableProjectWhere(actor:Actor) {return actor.role==='admin'?{ownerId:actor.id}:{id:actor.role==='viewer'?(actor.projectId||'__none__'):'__none__'};}
