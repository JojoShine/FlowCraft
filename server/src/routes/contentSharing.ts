import {Router} from 'express';
import {asyncHandler,AppError} from '../middleware/errorHandler';
import {successResponse} from '../lib/response';
import {shareStatus,enableSharing,disableSharing,readSharedContent,readSharedEmbed,openSharedAsset} from '../content/sharingService';
import type {ContentKind} from '../content/contracts';
export function contentSharingRouter(kind:ContentKind) {
 const router=Router({mergeParams:true});
 router.use((_req,res,next)=>{res.setHeader('Cache-Control','no-store');next();});
 router.get('/',asyncHandler(async(req,res)=>{res.json(successResponse(await shareStatus(req.user!,kind,req.params.id as string)));}));
 router.post('/',asyncHandler(async(req,res)=>{res.json(successResponse(await enableSharing(req.user!,kind,req.params.id as string)));}));
 router.delete('/',asyncHandler(async(req,res)=>{await disableSharing(req.user!,kind,req.params.id as string);res.status(204).send();}));
 return router;
}
function kind(value:unknown):ContentKind {if(value!=='document'&&value!=='drawing') throw AppError.notFound('分享不存在');return value;}
export const publicContentRouter=Router();
publicContentRouter.use((_req,res,next)=>{res.set({'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex, nofollow, noarchive'});next();});
publicContentRouter.get('/:kind/:token',asyncHandler(async(req,res)=>{res.json(successResponse(await readSharedContent(kind(req.params.kind),req.params.token as string)));}));
publicContentRouter.get('/document/:token/embeds/:blockId',asyncHandler(async(req,res)=>{res.json(successResponse(await readSharedEmbed(req.params.token as string,req.params.blockId as string)));}));
publicContentRouter.get(['/:kind/:token/assets/:assetId','/document/:token/embeds/:blockId/assets/:assetId'],asyncHandler(async(req,res)=>{
 const asset=await openSharedAsset(req.params.blockId?'document':kind(req.params.kind),req.params.token as string,req.params.assetId as string,req.params.blockId as string|undefined);
 const inline=['image/png','image/jpeg','image/gif','image/webp','image/svg+xml'].includes(asset.mimeType);
 res.set({'Content-Type':asset.mimeType,'Content-Length':String(asset.bytes),'Content-Security-Policy':"default-src 'none'; sandbox",'Content-Disposition':inline?'inline':'attachment'});
 asset.stream.on('error',()=>res.destroy());req.on('aborted',()=>asset.stream.destroy());asset.stream.pipe(res);
}));
