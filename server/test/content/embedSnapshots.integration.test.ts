import {it,expect} from 'vitest';
import {withContentFixture} from '../fixtures';
import {documentService} from '../../src/content/documentService';
import {drawingService} from '../../src/content/drawingService';
import {resolveDocumentEmbed,listDrawingReferences} from '../../src/content/referenceResolver';
const block=(drawingId:string,mode='latest',revision=1,id='drawing-block')=>({id,type:'drawing',props:{drawingId,mode,revision},children:[]});
it('current follows latest, history is frozen, restore pins without rolling back source',()=>withContentFixture(async fx=>{
 const drawing=await drawingService.create(fx.owner,{projectId:fx.project.id,title:'图',payload:fx.scene});
 const doc=await documentService.create(fx.owner,{projectId:fx.project.id,title:'说明',payload:{formatVersion:1,blocks:[block(drawing.id),block(drawing.id,'pinned',1,'pinned')]}});
 await drawingService.save(fx.owner,drawing.id,{baseVersion:1,requestId:fx.requestId(),source:'manual',title:'新版',payload:fx.scene});
 expect((await resolveDocumentEmbed(fx.owner,doc.id,'drawing-block',1)).revision).toBe(1);
 expect((await resolveDocumentEmbed(fx.owner,doc.id,'drawing-block')).revision).toBe(2);
 expect((await resolveDocumentEmbed(fx.viewer,doc.id,'pinned')).revision).toBe(1);
 await expect(resolveDocumentEmbed(fx.viewer,doc.id,'pinned',1)).rejects.toMatchObject({statusCode:403});
 await expect(resolveDocumentEmbed(fx.otherOwner,doc.id,'pinned')).rejects.toMatchObject({statusCode:404});
 await documentService.restore(fx.owner,doc.id,{baseVersion:1,requestId:fx.requestId(),revision:1});
 expect((await resolveDocumentEmbed(fx.owner,doc.id,'drawing-block')).revision).toBe(1);expect((await drawingService.read(fx.owner,drawing.id)).version).toBe(2);
 expect(await listDrawingReferences(fx.owner,drawing.id)).toHaveLength(2);
}));
it('deleted refs can be retained but cannot be newly inserted, cross project refs fail',()=>withContentFixture(async fx=>{
 const d=await drawingService.create(fx.owner,{projectId:fx.project.id,title:'图',payload:fx.scene});
 const doc=await documentService.create(fx.owner,{projectId:fx.project.id,title:'说明',payload:{formatVersion:1,blocks:[block(d.id)]}});
 await fx.db.drawing.update({where:{id:d.id},data:{deletedAt:new Date()}});
 expect((await resolveDocumentEmbed(fx.viewer,doc.id,'drawing-block')).status).toBe('deleted');
 await documentService.save(fx.owner,doc.id,{baseVersion:1,requestId:fx.requestId(),source:'auto',title:'改标题',payload:doc.payload});
 await expect(documentService.create(fx.owner,{projectId:fx.project.id,title:'新说明',payload:doc.payload})).rejects.toMatchObject({statusCode:400});
 const other=await drawingService.create(fx.otherOwner,{projectId:fx.otherProject.id,title:'别的图',payload:fx.scene});
 await expect(documentService.create(fx.owner,{projectId:fx.project.id,title:'新说明',payload:{formatVersion:1,blocks:[block(other.id)]}})).rejects.toMatchObject({statusCode:400});
}));
it('snapshot_survives_concurrent_drawing_restore',()=>withContentFixture(async fx=>{
 const d=await drawingService.create(fx.owner,{projectId:fx.project.id,title:'图',payload:fx.scene});
 await drawingService.save(fx.owner,d.id,{baseVersion:1,requestId:fx.requestId(),source:'auto',title:'新版',payload:fx.scene});
 const [doc]=await Promise.all([documentService.create(fx.owner,{projectId:fx.project.id,title:'快照',payload:{formatVersion:1,blocks:[block(d.id)]}}),drawingService.restore(fx.owner,d.id,{baseVersion:2,requestId:fx.requestId(),revision:1})]);
 const embed=await resolveDocumentEmbed(fx.owner,doc.id,'drawing-block',1);expect([2,3]).toContain(embed.revision);
 expect(await fx.db.drawingRevision.findUnique({where:{drawingId_version:{drawingId:d.id,version:embed.revision}}})).not.toBeNull();
}));
