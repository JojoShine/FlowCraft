import {it,expect,vi} from 'vitest';
import {render,screen,waitFor,act} from '@testing-library/react';
const shared=vi.hoisted(()=>({views:[] as any[],read:vi.fn()}));
vi.mock('../../src/contexts/AuthContext',()=>({useAuth:()=>({user:{id:'owner',role:'admin'}})}));
vi.mock('../../src/features/documents/DocumentEditor',()=>({DocumentEditor:(props:any)=>{shared.views.push(props);return <p>版本 {props.view.version}</p>;}}));
vi.mock('../../src/features/documents/useDocumentExport',()=>({useDocumentExport:()=>({busy:false})}));
vi.mock('../../src/features/drawings/useDrawingExport',()=>({useDrawingExport:()=>({busy:false})}));
vi.mock('../../src/features/content/api',()=>({documentsApi:{history:async()=>({items:[{version:1,title:'旧正文',savedAt:'2026-10-22',source:'create'}],total:1}),get:async()=>({id:'doc',projectId:'project',title:'正文',version:2,canEdit:true,payload:{formatVersion:1,blocks:[]}}),revision:async()=>({id:'doc',projectId:'project',title:'旧正文',version:1,canEdit:true,payload:{formatVersion:1,blocks:[]}})},drawingsApi:{},contentAssetsApi:{read:(...args:any[])=>shared.read(...args)}}));
import {HistoryPanel} from '../../src/features/content/HistoryPanel';
it('document history resolves images and attachments through authenticated revision contexts and revokes object URLs',async()=>{
 const OriginalURL=URL,create=vi.fn(()=>`blob:test-${Math.random()}`),revoke=vi.fn();vi.stubGlobal('URL',class extends OriginalURL {static createObjectURL=create;static revokeObjectURL=revoke;});shared.read.mockResolvedValue(new Blob(['file']));
 try {const {unmount}=render(<HistoryPanel kind="document" id="doc" beforeRestore={async()=>true} onRestored={()=>{}} onClose={()=>{}}/>);await waitFor(()=>expect(screen.getAllByText(/^版本 /)).toHaveLength(2));const snapshots=[2,1].map(version=>shared.views.filter(view=>view.view.version===version).at(-1));expect(snapshots.every(snapshot=>typeof snapshot.resolveAsset==='function')).toBe(true);
 const urls:string[]=[];await act(async()=>{for(const snapshot of snapshots) for(const file of ['image','attachment']) urls.push(await snapshot.resolveAsset(`${file}-${snapshot.view.version}`));});expect(shared.read).toHaveBeenCalledWith('image-1',{kind:'document',id:'doc',revision:1},expect.any(AbortSignal));expect(shared.read).toHaveBeenCalledWith('attachment-2',{kind:'document',id:'doc',revision:2},expect.any(AbortSignal));unmount();for(const url of urls) expect(revoke).toHaveBeenCalledWith(url);
 } finally {vi.unstubAllGlobals();}
});
