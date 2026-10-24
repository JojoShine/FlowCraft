import {it,expect} from 'vitest';
import {withContentFixture} from '../fixtures';
it('keeps legacy projects and restricts deletion plus unique revision/request keys',()=>withContentFixture(async fx=>{
 const d=await fx.db.document.create({data:{projectId:fx.project.id,title:'文档',currentVersion:1}});
 const revision={documentId:d.id,version:1,title:'文档',payload:fx.body as any,digest:'digest',source:'create'};
 await fx.db.documentRevision.create({data:revision});
 await expect(fx.db.documentRevision.create({data:revision})).rejects.toMatchObject({code:'P2002'});
 await fx.db.contentSaveReceipt.create({data:{kind:'document',entityId:d.id,requestId:'req',actorId:fx.owner.id,requestDigest:'d',result:{version:1}}});
 await expect(fx.db.contentSaveReceipt.create({data:{kind:'document',entityId:d.id,requestId:'req',actorId:fx.owner.id,requestDigest:'d',result:{version:1}}})).rejects.toMatchObject({code:'P2002'});
 await expect(fx.db.project.delete({where:{id:fx.project.id}})).rejects.toMatchObject({code:'P2003'});
 expect(await fx.db.project.findUnique({where:{id:fx.project.id}})).not.toBeNull();
}));

it('stores new editor documents in a separate table from legacy documents',()=>withContentFixture(async fx=>{
 const document=await fx.db.document.create({data:{projectId:fx.project.id,title:'隔离旧文档'}});
 const rows=await fx.db.$queryRaw<Array<{id:string}>>`SELECT id FROM "ContentDocument" WHERE id=${document.id}`;
 expect(rows).toEqual([{id:document.id}]);
}));
