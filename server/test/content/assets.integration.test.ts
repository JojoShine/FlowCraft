import {it,expect,vi} from 'vitest';
import {Readable} from 'stream';
import {withContentFixture} from '../fixtures';
import {uploadContentAsset,validateAssetReferences} from '../../src/content/assetService';
import {openContentAsset} from '../../src/content/assetAccess';
import {requireContentRead} from '../../src/content/authorization';
const input=(projectId:string,bytes=3)=>({projectId,category:'image' as const,mimeType:'image/png',originalName:'../../same.png',bytes,stream:Readable.from(Buffer.alloc(bytes))});
it('owner uploads immutable assets, viewer cannot upload, cross project reads are hidden',()=>withContentFixture(async fx=>{
 await expect(uploadContentAsset(fx.viewer,input(fx.project.id))).rejects.toMatchObject({statusCode:403});
 await expect(requireContentRead({...fx.viewer,projectId:null},fx.project.id)).rejects.toMatchObject({statusCode:404});
 const asset=await uploadContentAsset(fx.owner,input(fx.project.id));
 const another=await uploadContentAsset(fx.owner,input(fx.project.id));expect(asset.id).not.toBe(another.id);
 const stored=await fx.db.contentAsset.findUniqueOrThrow({where:{id:asset.id}});expect(stored.objectKey).toMatch(new RegExp('^content/'+fx.project.id+'/[a-f0-9-]+$'));
 const opened=await openContentAsset(fx.owner,asset.id,{kind:'drawing',id:'draft'});let bytes=0;for await(const chunk of opened.stream) bytes+=chunk.length;expect(bytes).toBe(3);
 await expect(openContentAsset(fx.otherOwner,asset.id,{kind:'drawing',id:'draft'})).rejects.toMatchObject({statusCode:404});
 await expect(openContentAsset(fx.viewer,asset.id,{kind:'drawing',id:'draft'})).rejects.toMatchObject({statusCode:404});
 const d=await fx.db.drawing.create({data:{projectId:fx.project.id,title:'图'}});
 await fx.db.drawingRevision.create({data:{drawingId:d.id,version:1,title:'图',payload:fx.scene as any,digest:'x',source:'create',assets:{create:{assetId:asset.id}}}});
 expect((await openContentAsset(fx.viewer,asset.id,{kind:'drawing',id:d.id})).bytes).toBe(3);
 await fx.db.drawing.update({where:{id:d.id},data:{deletedAt:new Date()}});
 await expect(openContentAsset(fx.viewer,asset.id,{kind:'drawing',id:d.id})).rejects.toMatchObject({statusCode:404});
}));
it('enforces file limits before upload and complete state before references',()=>withContentFixture(async fx=>{
 await expect(uploadContentAsset(fx.owner,input(fx.project.id,10*1024*1024+1))).rejects.toMatchObject({statusCode:413});
 await expect(uploadContentAsset(fx.owner,{...input(fx.project.id),category:'attachment',bytes:20*1024*1024+1})).rejects.toMatchObject({statusCode:413});
 const asset=await uploadContentAsset(fx.owner,input(fx.project.id));
 await validateAssetReferences(fx.db,fx.project.id,[asset.id]);
 await fx.db.contentAsset.update({where:{id:asset.id},data:{state:'uploading'}});
 await expect(validateAssetReferences(fx.db,fx.project.id,[asset.id])).rejects.toMatchObject({statusCode:400});
 await expect(validateAssetReferences(fx.db,fx.otherProject.id,[asset.id])).rejects.toMatchObject({statusCode:400});
}));
it('failed upload and incorrect byte count cannot damage previous assets',()=>withContentFixture(async fx=>{
 const old=await uploadContentAsset(fx.owner,input(fx.project.id));
 const spy=vi.spyOn(fx.storage.client,'putObject').mockRejectedValueOnce(new Error('interrupted'));
 await expect(uploadContentAsset(fx.owner,input(fx.project.id))).rejects.toThrow('interrupted');spy.mockRestore();
 await expect(uploadContentAsset(fx.owner,{...input(fx.project.id),bytes:10})).rejects.toThrow();
 expect((await fx.db.contentAsset.findUniqueOrThrow({where:{id:old.id}})).state).toBe('complete');
 expect((await fx.storage.client.statObject(fx.storage.bucket,(await fx.db.contentAsset.findUniqueOrThrow({where:{id:old.id}})).objectKey)).size).toBe(3);
}));
