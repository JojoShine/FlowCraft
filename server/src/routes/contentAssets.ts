import {Router} from 'express';
import multer from 'multer';
import {tmpdir} from 'os';
import {createReadStream} from 'fs';
import {open,unlink} from 'fs/promises';
import {z} from 'zod';
import {asyncHandler,AppError} from '../middleware/errorHandler';
import {successResponse} from '../lib/response';
import {uploadContentAsset} from '../content/assetService';
import {openContentAsset} from '../content/assetAccess';
import {requireContentOwner} from '../content/authorization';
import {parse,contextInput} from './contentHttp';
const router=Router();
const upload=multer({dest:tmpdir(),limits:{fileSize:20*1024*1024,files:1,fields:3}}).single('file');
router.post('/',(req,res,next)=>{upload(req,res,error=>{if(error instanceof multer.MulterError) return next(new AppError(error.code==='LIMIT_FILE_SIZE'?'文件容量过大':'上传参数无效',error.code==='LIMIT_FILE_SIZE'?413:400));next(error);});},asyncHandler(async(req,res)=>{
 const file=req.file;if(!file) throw AppError.badRequest('请选择文件');
 try {
  const input=parse(z.object({projectId:z.string().min(1).max(255),category:z.enum(['image','attachment'])}),req.body);
  await requireContentOwner(req.user!,input.projectId);
  if(input.category==='image') {
   const handle=await open(file.path,'r');const header=Buffer.alloc(12);try {await handle.read(header,0,12,0);}finally {await handle.close();}
   const valid=file.mimetype==='image/png'&&header.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))||file.mimetype==='image/jpeg'&&header[0]===255&&header[1]===216&&header[2]===255||file.mimetype==='image/gif'&&header.subarray(0,3).toString()==='GIF'||file.mimetype==='image/webp'&&header.subarray(0,4).toString()==='RIFF'&&header.subarray(8,12).toString()==='WEBP';
   if(!valid) throw AppError.badRequest('图片格式与内容不符');
  }
  const asset=await uploadContentAsset(req.user!,{...input,mimeType:file.mimetype,originalName:file.originalname,bytes:file.size,stream:createReadStream(file.path)});res.status(201).json(successResponse(asset));
 } finally {await unlink(file.path).catch(()=>{});}
}));
router.get('/:id',asyncHandler(async(req,res)=>{
 let context:unknown;try {context=JSON.parse(String(req.query.context));} catch {throw AppError.badRequest('文件访问上下文无效');}
 const asset=await openContentAsset(req.user!,req.params.id as string,parse(contextInput,context));
 const inline=['image/png','image/jpeg','image/gif','image/webp','image/svg+xml'].includes(asset.mimeType);
 res.set({'Content-Type':asset.mimeType,'Content-Length':String(asset.bytes),'X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; sandbox",'Content-Disposition':inline?'inline':'attachment','Cache-Control':'private, no-store'});
 asset.stream.on('error',()=>{res.destroy();});req.on('aborted',()=>asset.stream.destroy());asset.stream.pipe(res);
}));
export default router;
