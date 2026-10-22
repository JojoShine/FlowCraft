import {Prisma} from '@prisma/client';
import {prisma} from '../lib/prisma';
import {AppError} from '../middleware/errorHandler';
import {readableProjectWhere,requireContentRead,requireContentOwner} from './authorization';
import {runContentTransaction} from './revisions';
import type {Actor,ContentSummary} from './contracts';
export type DocumentTreeNode=ContentSummary&{parentId:string|null;order:number;children:DocumentTreeNode[]};
export async function lockContentProject(tx:Prisma.TransactionClient,projectId:string) {await tx.$queryRaw`SELECT id FROM "Project" WHERE id = ${projectId} FOR UPDATE`;}
export async function getDocumentTree(actor:Actor,projectId?:string):Promise<DocumentTreeNode[]> {
 if(projectId) await requireContentRead(actor,projectId);
 const rows=await prisma.document.findMany({where:{project:{...readableProjectWhere(actor)},deletedAt:null,...(projectId?{projectId}:{})},orderBy:[{order:'asc'},{createdAt:'asc'}]});
 const nodes=new Map(rows.map(d=>[d.id,{id:d.id,projectId:d.projectId,title:d.title,version:d.currentVersion,updatedAt:d.updatedAt.toISOString(),parentId:d.parentId,order:d.order,children:[] as DocumentTreeNode[]}]));
 const roots:DocumentTreeNode[]=[];for(const node of nodes.values()) {const parent=node.parentId?nodes.get(node.parentId):null;if(parent) parent.children.push(node);else roots.push(node);}return roots;
}
export async function moveDocument(actor:Actor,id:string,input:{parentId:string|null;beforeId:string|null}):Promise<void> {
 await runContentTransaction(async tx=>{
  const d=await tx.document.findUnique({where:{id}});if(!d||d.deletedAt) throw AppError.notFound('页面不存在');await requireContentOwner(actor,d.projectId,tx);await lockContentProject(tx,d.projectId);
  const rows=await tx.document.findMany({where:{projectId:d.projectId,deletedAt:null},orderBy:[{order:'asc'},{createdAt:'asc'}]});
  const map=new Map(rows.map(r=>[r.id,r]));
  if(input.parentId&&!map.has(input.parentId)) throw AppError.conflict('父页面必须属于本项目');
  map.get(id)!.parentId=input.parentId;
  for(const node of rows) {let current:typeof node|undefined=node;const seen=new Set<string>();let depth=0;while(current) {if(seen.has(current.id)||++depth>5) throw AppError.conflict('移动会产生循环或超过五层');seen.add(current.id);current=current.parentId?map.get(current.parentId):undefined;}}
  const siblings=rows.filter(r=>r.parentId===input.parentId&&r.id!==id);
  const index=input.beforeId?siblings.findIndex(r=>r.id===input.beforeId):siblings.length;if(index<0) throw AppError.conflict('排序目标必须在同一父页面下');siblings.splice(index,0,map.get(id)!);
  await tx.document.update({where:{id},data:{parentId:input.parentId}});
  for(let order=0;order<siblings.length;order++) await tx.document.update({where:{id:siblings[order].id},data:{order}});
 });
}
