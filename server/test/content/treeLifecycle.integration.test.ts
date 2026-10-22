import {it,expect} from 'vitest';
import {withContentFixture} from '../fixtures';
import {documentService} from '../../src/content/documentService';
import {drawingService} from '../../src/content/drawingService';
import {getDocumentTree,moveDocument} from '../../src/content/documentTree';
import {trashContent,undeleteContent,listTrashContent,duplicateDocument,duplicateDrawing} from '../../src/content/lifecycleService';
import {setContentPreference,listContentPreferences} from '../../src/content/preferences';
import {projectService} from '../../src/services/projectService';
const doc=(fx:any,title:string,parentId?:string)=>documentService.create(fx.owner,{projectId:fx.project.id,title,payload:fx.body,parentId});
it('tree supports five levels, rejects cycles, depth six and cross project moves without revisions',()=>withContentFixture(async fx=>{
 const root=await doc(fx,'root');let parent=root;const nodes=[root];for(let i=2;i<=5;i++) {parent=await doc(fx,'level '+i,parent.id);nodes.push(parent);}
 await expect(doc(fx,'six',parent.id)).rejects.toMatchObject({statusCode:400});
 await expect(moveDocument(fx.owner,root.id,{parentId:nodes[1].id,beforeId:null})).rejects.toMatchObject({statusCode:409});
 const other=await documentService.create(fx.otherOwner,{projectId:fx.otherProject.id,title:'other',payload:fx.body});
 await expect(moveDocument(fx.owner,parent.id,{parentId:other.id,beforeId:null})).rejects.toMatchObject({statusCode:409});
 await moveDocument(fx.owner,parent.id,{parentId:null,beforeId:root.id});
 expect((await getDocumentTree(fx.viewer,fx.project.id))[0].id).toBe(parent.id);expect((await documentService.read(fx.owner,parent.id)).version).toBe(1);
}));
it('concurrent_moves_cannot_create_cycle_or_depth_six',()=>withContentFixture(async fx=>{
 const a=await doc(fx,'a'),b=await doc(fx,'b');
 const results=await Promise.allSettled([moveDocument(fx.owner,a.id,{parentId:b.id,beforeId:null}),moveDocument(fx.owner,b.id,{parentId:a.id,beforeId:null})]);
 expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);expect(results.filter(r=>r.status==='rejected'&&r.reason.statusCode===409)).toHaveLength(1);
}));
it('copies only current page, independently copies visible drawing and keeps immutable assets',()=>withContentFixture(async fx=>{
 const d=await drawingService.create(fx.owner,{projectId:fx.project.id,title:'图',payload:fx.scene});
 const original=await documentService.create(fx.owner,{projectId:fx.project.id,title:'说明',payload:{formatVersion:1,blocks:[{id:'pic',type:'drawing',props:{drawingId:d.id,mode:'pinned',revision:1}}]}});
 await doc(fx,'child',original.id);
 await drawingService.save(fx.owner,d.id,{baseVersion:1,requestId:fx.requestId(),source:'manual',title:'新版',payload:fx.scene});
 const reference=await duplicateDocument(fx.owner,original.id,'reference');expect(reference.payload.blocks[0].props?.drawingId).toBe(d.id);
 const copy=await duplicateDocument(fx.owner,original.id,'duplicate');const copyId=copy.payload.blocks[0].props?.drawingId;expect(copyId).not.toBe(d.id);expect((await drawingService.read(fx.owner,copyId)).title).toContain('图');expect((await getDocumentTree(fx.owner,fx.project.id)).find(n=>n.id===copy.id)?.children).toHaveLength(0);
 const direct=await duplicateDrawing(fx.owner,d.id);expect(direct.title).toContain('新版');
}));
it('trash retains IDs/history, subtree restores at root, deleted stale pages cannot save, project deletion is guarded',()=>withContentFixture(async fx=>{
 const root=await doc(fx,'root'),child=await doc(fx,'child',root.id);
 await trashContent(fx.owner,'document',root.id);expect((await listTrashContent(fx.owner,'document',{})).total).toBe(2);expect((await documentService.list(fx.viewer,{})).total).toBe(0);
 await expect(documentService.save(fx.owner,root.id,{baseVersion:1,requestId:fx.requestId(),source:'auto',title:'stale',payload:fx.body})).rejects.toMatchObject({statusCode:410});
 expect(await undeleteContent(fx.owner,'document',child.id)).toEqual({id:child.id,restoredAtRoot:true});expect((await documentService.read(fx.owner,child.id)).version).toBe(1);
 await expect(listTrashContent(fx.viewer,'document',{})).rejects.toMatchObject({statusCode:403});
 await expect(projectService.delete(fx.project.id)).rejects.toMatchObject({statusCode:409});
 const drawing=await drawingService.create(fx.owner,{projectId:fx.project.id,title:'图',payload:fx.scene});await trashContent(fx.owner,'drawing',drawing.id);expect((await drawingService.list(fx.viewer,{})).total).toBe(0);expect((await undeleteContent(fx.owner,'drawing',drawing.id)).id).toBe(drawing.id);
}));
it('preferences belong to user and never change content versions',()=>withContentFixture(async fx=>{
 const d=await doc(fx,'说明');await setContentPreference(fx.viewer,'document',d.id,{favorite:true,viewState:{outlineOpen:true}});
 expect((await listContentPreferences(fx.viewer,'document',fx.project.id))[0].favorite).toBe(true);expect(await listContentPreferences(fx.owner,'document',fx.project.id)).toEqual([]);expect((await documentService.read(fx.owner,d.id)).version).toBe(1);
}));

it('undeleting a child after its parent moved to depth five restores safely at root',()=>withContentFixture(async fx=>{
 const parent=await doc(fx,'parent'),child=await doc(fx,'child',parent.id);await trashContent(fx.owner,'document',child.id);
 let target=await doc(fx,'target');for(let i=0;i<3;i++) target=await doc(fx,'nested',target.id);
 await moveDocument(fx.owner,parent.id,{parentId:target.id,beforeId:null});
 expect((await undeleteContent(fx.owner,'document',child.id)).restoredAtRoot).toBe(true);
}));
