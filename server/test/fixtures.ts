import {randomUUID} from 'crypto';
import {prisma as db} from '../src/lib/prisma';
import {minioClient,BUCKET_NAME,uploadFile} from '../src/lib/minio';
import type {Actor,DocumentBody,DrawingScene} from '../src/content/contracts';
export async function withContentFixture(test:(fx:ContentFixture)=>Promise<void>,projectId?:string):Promise<void> {
 const owner=await db.user.create({data:{role:'admin',name:'content test'}});
 const otherOwner=await db.user.create({data:{role:'admin',name:'other test'}});
 const project=await db.project.create({data:{id:projectId,name:'content test',type:'software',ownerId:owner.id}});
 const otherProject=await db.project.create({data:{name:'other test',type:'software',ownerId:otherOwner.id}});
 const viewer=await db.user.create({data:{role:'viewer',projectId:project.id}});
 const ids=[project.id,otherProject.id],users=[owner.id,otherOwner.id,viewer.id];
 const body:DocumentBody={formatVersion:1,blocks:[{id:randomUUID(),type:'paragraph',content:[{type:'text',text:'服务器说明',styles:{}}],children:[]}]};
 const scene:DrawingScene={formatVersion:1,elements:[{id:'a',type:'rectangle',x:12.34,y:56.78,width:100,height:80}],appState:{viewBackgroundColor:'#ffffff'},files:{}};
 try {await test({owner,otherOwner,viewer,project,otherProject,db,storage:{client:minioClient(),bucket:BUCKET_NAME(),upload:uploadFile},body,scene,requestId:randomUUID});}
 finally {
  const assets=await db.contentAsset.findMany({where:{projectId:{in:ids}}});
  if(assets.length) await minioClient().removeObjects(BUCKET_NAME(),assets.map(a=>a.objectKey)).catch(()=>{});
  await db.documentDrawingReference.deleteMany({where:{documentRevision:{document:{projectId:{in:ids}}}}});
  await db.documentRevisionAsset.deleteMany({where:{documentRevision:{document:{projectId:{in:ids}}}}});
  await db.drawingRevisionAsset.deleteMany({where:{drawingRevision:{drawing:{projectId:{in:ids}}}}});
  await db.documentRevision.deleteMany({where:{document:{projectId:{in:ids}}}});
  await db.drawingRevision.deleteMany({where:{drawing:{projectId:{in:ids}}}});
  await db.document.deleteMany({where:{projectId:{in:ids}}});
  await db.drawing.deleteMany({where:{projectId:{in:ids}}});
  await db.contentAsset.deleteMany({where:{projectId:{in:ids}}});
  await db.contentSaveReceipt.deleteMany({where:{actorId:{in:users}}});
  await db.project.deleteMany({where:{id:{in:ids}}});
  await db.user.deleteMany({where:{id:{in:users}}});
 }
}
export type ContentFixture={owner:Actor;otherOwner:Actor;viewer:Actor;project:{id:string};otherProject:{id:string};db:typeof db;storage:{client:ReturnType<typeof minioClient>;bucket:string;upload:typeof uploadFile};body:DocumentBody;scene:DrawingScene;requestId:()=>string};
