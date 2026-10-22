import {it,expect} from 'vitest';
import {withContentFixture} from '../fixtures';
import {documentService} from '../../src/content/documentService';
import {drawingService} from '../../src/content/drawingService';
import {trashContent,undeleteContent,listTrashContent,duplicateDocument,duplicateDrawing} from '../../src/content/lifecycleService';
import {setContentPreference,listContentPreferences} from '../../src/content/preferences';
import {projectService} from '../../src/services/projectService';
const doc=(fx:any,title:string)=>documentService.create(fx.owner,{projectId:fx.project.id,title,payload:fx.body});
it('copies only current page, independently copies visible drawing and keeps immutable assets',()=>withContentFixture(async fx=>{
 const d=await drawingService.create(fx.owner,{projectId:fx.project.id,title:'图',payload:fx.scene});
 const original=await documentService.create(fx.owner,{projectId:fx.project.id,title:'说明',payload:{formatVersion:1,blocks:[{id:'pic',type:'drawing',props:{drawingId:d.id,mode:'pinned',revision:1}}]}});
 await drawingService.save(fx.owner,d.id,{baseVersion:1,requestId:fx.requestId(),source:'manual',title:'新版',payload:fx.scene});
 const reference=await duplicateDocument(fx.owner,original.id,'reference');expect(reference.payload.blocks[0].props?.drawingId).toBe(d.id);
 const copy=await duplicateDocument(fx.owner,original.id,'duplicate');const copyId=copy.payload.blocks[0].props?.drawingId;expect(copyId).not.toBe(d.id);expect((await drawingService.read(fx.owner,copyId)).title).toContain('图');
 const direct=await duplicateDrawing(fx.owner,d.id);expect(direct.title).toContain('新版');
}));
it('single document trash and restore keep other documents, IDs, and history intact',()=>withContentFixture(async fx=>{
 const first=await doc(fx,'第一份 Markdown'),second=await doc(fx,'第二份 Markdown');
 await trashContent(fx.owner,'document',first.id);
 expect((await listTrashContent(fx.owner,'document',{})).items.map(d=>d.id)).toEqual([first.id]);
 expect((await documentService.list(fx.viewer,{})).items.map(d=>d.id)).toEqual([second.id]);
 await expect(documentService.save(fx.owner,first.id,{baseVersion:1,requestId:fx.requestId(),source:'auto',title:'stale',payload:fx.body})).rejects.toMatchObject({statusCode:410});
 expect(await undeleteContent(fx.owner,'document',first.id)).toEqual({id:first.id});
 expect((await documentService.read(fx.owner,first.id)).version).toBe(1);
 expect((await documentService.list(fx.viewer,{})).total).toBe(2);
 await expect(listTrashContent(fx.viewer,'document',{})).rejects.toMatchObject({statusCode:403});
 await expect(projectService.delete(fx.project.id)).rejects.toMatchObject({statusCode:409});
 const drawing=await drawingService.create(fx.owner,{projectId:fx.project.id,title:'图',payload:fx.scene});await trashContent(fx.owner,'drawing',drawing.id);expect((await drawingService.list(fx.viewer,{})).total).toBe(0);expect(await undeleteContent(fx.owner,'drawing',drawing.id)).toEqual({id:drawing.id});
}));
it('preferences belong to user and never change content versions',()=>withContentFixture(async fx=>{
 const d=await doc(fx,'说明');await setContentPreference(fx.viewer,'document',d.id,{favorite:true,viewState:{outlineOpen:true}});
 expect((await listContentPreferences(fx.viewer,'document',fx.project.id))[0].favorite).toBe(true);expect(await listContentPreferences(fx.owner,'document',fx.project.id)).toEqual([]);expect((await documentService.read(fx.owner,d.id)).version).toBe(1);
}));

