import {it,expect} from 'vitest';
import {Blob as NodeBlob} from 'node:buffer';
import {draftStore} from '../../src/features/content/draftStore';
it('isolates users and sessions while preserving pending binary files',async()=>{
 const key={userId:crypto.randomUUID(),projectId:'p',kind:'drawing' as const,id:'d',sessionId:'tab-a'};
 const value={key,baseVersion:1,localSequence:1,title:'草稿',payload:{a:1},pendingFiles:[{localId:'f',fileName:'pic',mimeType:'image/png',targetId:'element',blob:new NodeBlob(['image']) as unknown as Blob}],updatedAt:Date.now()};
 await draftStore.put(value);await draftStore.put({...value,key:{...key,sessionId:'tab-b'}});
 const rows=await draftStore.list(key.userId);expect(rows).toHaveLength(2);expect(await rows[0].pendingFiles[0].blob.text()).toBe('image');expect(await draftStore.list('another-user')).toEqual([]);await draftStore.remove(key);expect(await draftStore.list(key.userId)).toHaveLength(1);
});
