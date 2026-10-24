import {documentsApi} from '../content/api';
import type {ContentView,DocumentBody} from '../content/types';
export interface ExpansionSnapshot {documentId:string;version:number;title:string;body:DocumentBody;fingerprint:string}
export interface ExpansionSession {current:{current:ContentView<DocumentBody>};queue:{getSnapshot:()=>{version:number}};drain:()=>Promise<boolean>;update:(title:string,body:DocumentBody)=>void}
const fingerprint=(view:ContentView<DocumentBody>)=>JSON.stringify([view.id,view.title,view.payload]);
export async function prepareExpansion(session:ExpansionSession):Promise<ExpansionSnapshot> {
 if(!session.current.current.canEdit) throw new Error('当前没有编辑权限');if(!await session.drain()) throw new Error('请先完成正文保存或处理未保存的草稿');const view=session.current.current;return {documentId:view.id,version:session.queue.getSnapshot().version,title:view.title,body:structuredClone(view.payload),fingerprint:fingerprint(view)};
}
export async function applyExpansion(session:ExpansionSession,snapshot:ExpansionSnapshot,body:DocumentBody) {
 const check=()=>{if(fingerprint(session.current.current)!==snapshot.fingerprint) throw new Error('正文或标题已变化，请保留当前修改并重新生成');if(session.queue.getSnapshot().version!==snapshot.version) throw new Error('文档版本已更新，请重新生成');};check();
 const saved=await documentsApi.get(snapshot.documentId);check();if(saved.version!==snapshot.version) throw new Error('文档已在其他位置更新，请先处理版本变化并重新生成');if(!saved.canEdit) throw new Error('当前没有编辑权限');session.update(session.current.current.title,body);if(!await session.drain()) throw new Error('正文已应用为本地草稿，保存尚未完成，请在文档中重试保存');
}
