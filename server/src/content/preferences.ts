import {Prisma} from '@prisma/client';
import {prisma} from '../lib/prisma';
import {AppError} from '../middleware/errorHandler';
import {requireContentRead,readableProjectWhere} from './authorization';
import type {Actor,ContentKind,PreferencePatch,PreferenceDto} from './contracts';
const viewKeys=new Set(['outlineOpen','expandedIds','gridView','scrollX','scrollY','zoom']);
export async function setContentPreference(actor:Actor,kind:ContentKind,id:string,patch:PreferencePatch):Promise<PreferenceDto> {
 const row=kind==='document'?await prisma.document.findUnique({where:{id}}):await prisma.drawing.findUnique({where:{id}});if(!row||row.deletedAt) throw AppError.notFound('内容不存在');await requireContentRead(actor,row.projectId);
 const data:{favorite?:boolean;lastViewedAt?:Date;viewState?:Prisma.InputJsonValue}={};
 if(patch.favorite!==undefined) {if(typeof patch.favorite!=='boolean') throw AppError.badRequest('收藏状态无效');data.favorite=patch.favorite;}
 if(patch.lastViewedAt) {const date=new Date(patch.lastViewedAt);if(!Number.isFinite(date.getTime())) throw AppError.badRequest('时间无效');data.lastViewedAt=date;}
 if(patch.viewState) {if(JSON.stringify(patch.viewState).length>16384||Object.keys(patch.viewState).some(k=>!viewKeys.has(k))) throw AppError.badRequest('视图偏好无效');data.viewState=patch.viewState as Prisma.InputJsonValue;}
 const p=await prisma.contentPreference.upsert({where:{userId_kind_entityId:{userId:actor.id,kind,entityId:id}},create:{userId:actor.id,kind,entityId:id,...data},update:data});return dto(p);
}
function dto(p:any):PreferenceDto {return {kind:p.kind,entityId:p.entityId,favorite:p.favorite,lastViewedAt:p.lastViewedAt?.toISOString(),viewState:p.viewState};}
export async function listContentPreferences(actor:Actor,kind:ContentKind,projectId?:string):Promise<PreferenceDto[]> {
 if(projectId) await requireContentRead(actor,projectId);
 const where={project:{...readableProjectWhere(actor)},deletedAt:null,...(projectId?{projectId}:{})};const ids=(kind==='document'?await prisma.document.findMany({where,select:{id:true}}):await prisma.drawing.findMany({where,select:{id:true}})).map(d=>d.id);
 return (await prisma.contentPreference.findMany({where:{userId:actor.id,kind,entityId:{in:ids}}})).map(dto);
}
