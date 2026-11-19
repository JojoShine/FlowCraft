import {it,expect} from 'vitest';
import {withContentFixture} from '../fixtures';
import {drawingService} from '../../src/content/drawingService';
const create=(fx:any)=>drawingService.create(fx.owner,{projectId:fx.project.id,title:'部署图',payload:fx.scene});
it('CAS commits exactly one concurrent save without revision gaps',()=>withContentFixture(async fx=>{
 const d=await create(fx);const a={baseVersion:1,requestId:fx.requestId(),source:'auto' as const,title:'A',payload:fx.scene};
 const results=await Promise.allSettled([drawingService.save(fx.owner,d.id,a),drawingService.save(fx.owner,d.id,{...a,requestId:fx.requestId(),title:'B'})]);
 expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);expect(results.filter(r=>r.status==='rejected'&&r.reason.statusCode===409)).toHaveLength(1);
 expect((await drawingService.history(fx.owner,d.id,1)).items.map(r=>r.version)).toEqual([2,1]);
}));
it('idempotent replay happens before CAS; changed reuse is rejected and no-op receipts survive later saves',()=>withContentFixture(async fx=>{
 const d=await create(fx);const input={baseVersion:1,requestId:fx.requestId(),source:'manual' as const,title:d.title,payload:{...fx.scene,appState:{...fx.scene.appState,scrollX:12}}};
 const noop=await drawingService.save(fx.owner,d.id,input);expect(noop.version).toBe(1);
 await drawingService.save(fx.owner,d.id,{...input,requestId:fx.requestId(),title:'changed'});
 expect(await drawingService.save(fx.owner,d.id,input)).toEqual(noop);
 await expect(drawingService.save(fx.owner,d.id,{...input,title:'reuse'})).rejects.toMatchObject({statusCode:409});
 expect((await drawingService.history(fx.owner,d.id,1)).total).toBe(2);
}));
it('restoring creates an immutable revision even for same content, preserving elements',()=>withContentFixture(async fx=>{
 const d=await create(fx);
 await drawingService.save(fx.owner,d.id,{baseVersion:1,requestId:fx.requestId(),source:'manual',title:'新版',payload:{...fx.scene,elements:[...fx.scene.elements,{id:'b',type:'ellipse',x:100,y:2}]}});
 const restore={baseVersion:2,requestId:fx.requestId(),revision:1};
 const ack=await drawingService.restore(fx.owner,d.id,restore);expect(ack.version).toBe(3);expect(await drawingService.restore(fx.owner,d.id,restore)).toEqual(ack);
 expect((await drawingService.read(fx.owner,d.id)).payload.elements).toEqual(fx.scene.elements);
 expect((await drawingService.revision(fx.owner,d.id,3)).restoredFrom).toBe(1);
 expect((await drawingService.restore(fx.owner,d.id,{...restore,baseVersion:3,requestId:fx.requestId()})).version).toBe(4);
 expect((await drawingService.restore(fx.owner,d.id,{baseVersion:4,requestId:fx.requestId(),revision:2})).version).toBe(5);
}));
it('viewer reads current only; invalid assets and deleted objects never create partial history',()=>withContentFixture(async fx=>{
 const d=await create(fx);expect((await drawingService.read(fx.viewer,d.id)).canEdit).toBe(false);
 await expect(drawingService.history(fx.viewer,d.id,1)).rejects.toMatchObject({statusCode:403});
 await expect(drawingService.read(fx.otherOwner,d.id)).rejects.toMatchObject({statusCode:404});
 const input={baseVersion:1,requestId:fx.requestId(),source:'auto' as const,title:'修改',payload:fx.scene};
 await expect(drawingService.save(fx.viewer,d.id,input)).rejects.toMatchObject({statusCode:403});
 await expect(drawingService.save(fx.owner,d.id,{...input,payload:{...fx.scene,files:{f:{assetId:'missing'}}}})).rejects.toMatchObject({statusCode:400});
 expect((await drawingService.history(fx.owner,d.id,1)).total).toBe(1);
 await fx.db.drawing.update({where:{id:d.id},data:{deletedAt:new Date()}});
 await expect(drawingService.save(fx.owner,d.id,input)).rejects.toMatchObject({statusCode:410});
 expect((await drawingService.list(fx.viewer,{})).total).toBe(0);
}));
