import {Request,Response,NextFunction} from 'express';
import {z} from 'zod';
import {authenticate} from '../middleware/auth';
import {AppError} from '../middleware/errorHandler';
export function contentAuthenticate(req:Request,res:Response,next:NextFunction) {
 if(!req.headers.authorization?.startsWith('Bearer ')) return next(new AppError('未登录',401));
 return authenticate(req,res,next);
}
export function parse<T>(schema:z.ZodType<T>,value:unknown):T {const result=schema.safeParse(value);if(!result.success) throw AppError.badRequest('请求参数无效');return result.data;}
export const createInput=z.object({projectId:z.string().uuid(),title:z.string().min(1).max(300),payload:z.unknown()});
export const saveInput=z.object({baseVersion:z.number().int().positive(),requestId:z.string().uuid(),source:z.enum(['auto','manual']),title:z.string().min(1).max(300),payload:z.unknown()});
export const restoreInput=z.object({baseVersion:z.number().int().positive(),requestId:z.string().uuid(),revision:z.number().int().positive()});
export const listInput=z.object({projectId:z.string().uuid().optional(),q:z.string().max(200).optional(),page:z.coerce.number().int().positive().optional(),favorite:z.enum(['true','false']).transform(v=>v==='true').optional(),recent:z.enum(['true','false']).transform(v=>v==='true').optional()});
export const versionInput=z.coerce.number().int().positive();
export const kindInput=z.enum(['document','drawing']);
export const contextInput=z.object({kind:kindInput,id:z.string(),revision:versionInput.optional(),documentId:z.string().uuid().optional(),blockId:z.string().optional()});
export function contentParserError(error:any,_req:Request,_res:Response,next:NextFunction) {
 if(error?.type==='entity.too.large') return next(new AppError('内容容量过大',413));
 if(error?.type==='entity.parse.failed') return next(AppError.badRequest('JSON 格式无效'));
 next(error);
}
