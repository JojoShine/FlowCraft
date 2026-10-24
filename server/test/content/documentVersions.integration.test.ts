import {it,expect} from 'vitest';
import {withContentFixture} from '../fixtures';
import {documentService} from '../../src/content/documentService';
it('document CAS, no-op replay, title history, and restore preserve body',()=>withContentFixture(async fx=>{
 const d=await documentService.create(fx.owner,{projectId:fx.project.id,title:'说明',payload:fx.body});
 const input={baseVersion:1,requestId:fx.requestId(),source:'auto' as const,title:'更新',payload:fx.body};
 const ack=await documentService.save(fx.owner,d.id,input);expect(ack.version).toBe(2);expect(await documentService.save(fx.owner,d.id,input)).toEqual(ack);
 await expect(documentService.save(fx.owner,d.id,{...input,requestId:fx.requestId()})).rejects.toMatchObject({statusCode:409});
 const noOp={...input,baseVersion:2,requestId:fx.requestId()};expect((await documentService.save(fx.owner,d.id,noOp)).version).toBe(2);
 await documentService.restore(fx.owner,d.id,{baseVersion:2,requestId:fx.requestId(),revision:1});
 expect((await documentService.read(fx.owner,d.id)).title).toBe('说明');
 expect((await documentService.history(fx.owner,d.id,1)).items.map(r=>r.version)).toEqual([3,2,1]);
 expect((await documentService.list(fx.viewer,{q:'服务器'})).total).toBe(1);
 await expect(documentService.save(fx.viewer,d.id,input)).rejects.toMatchObject({statusCode:403});
 await expect(documentService.revision(fx.viewer,d.id,1)).rejects.toMatchObject({statusCode:403});
 await expect(documentService.read(fx.otherOwner,d.id)).rejects.toMatchObject({statusCode:404});
}));
