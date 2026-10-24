import type {DraftKey,LocalDraft} from './types';
export interface DraftStore {
 put<T>(draft:LocalDraft<T>):Promise<void>;
 list<T>(userId:string):Promise<LocalDraft<T>[]>;
 remove(key:DraftKey):Promise<void>;
}
const keyOf=(key:DraftKey)=>JSON.stringify([key.userId,key.projectId,key.kind,key.id,key.sessionId]);
let opening:Promise<IDBDatabase>|null=null;
function database():Promise<IDBDatabase> {
 if(!opening) opening=new Promise((resolve,reject)=>{
  const request=indexedDB.open('flowcraft-content-drafts',1);
  request.onupgradeneeded=()=>{const store=request.result.createObjectStore('drafts',{keyPath:'storageKey'});store.createIndex('userId','userId');};
  request.onsuccess=()=>resolve(request.result);request.onerror=()=>{opening=null;reject(request.error);};request.onblocked=()=>{opening=null;reject(new Error('本地草稿存储被其他页面阻塞'));};
 });return opening;
}
async function write(action:(store:IDBObjectStore)=>void):Promise<void> {
 const db=await database();return new Promise((resolve,reject)=>{const tx=db.transaction('drafts','readwrite');tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||new Error('本地草稿写入中断'));action(tx.objectStore('drafts'));});
}
export const draftStore:DraftStore={
 put:draft=>write(store=>{store.put({storageKey:keyOf(draft.key),userId:draft.key.userId,draft});}),
 remove:key=>write(store=>{store.delete(keyOf(key));}),
 async list<T>(userId:string):Promise<LocalDraft<T>[]> {const db=await database();return new Promise((resolve,reject)=>{const tx=db.transaction('drafts','readonly');const request=tx.objectStore('drafts').index('userId').getAll(userId);request.onerror=()=>reject(request.error);request.onsuccess=()=>resolve(request.result.map(row=>row.draft).sort((a,b)=>b.updatedAt-a.updatedAt));});},
};
