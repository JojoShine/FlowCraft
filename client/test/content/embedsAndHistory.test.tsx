import {it,expect,vi} from 'vitest';
import {render,screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
const shared=vi.hoisted(()=>({role:'viewer',status:'preview-pending'}));
vi.mock('../../src/contexts/AuthContext',()=>({useAuth:()=>({user:{id:'u',role:shared.role}})}));
vi.mock('../../src/components/ui/ConfirmDialog',()=>({useConfirm:()=>vi.fn(async()=>true)}));
vi.mock('../../src/features/content/api',()=>({documentsApi:{resolveEmbed:vi.fn(async()=>({blockId:'b',drawingId:'d',revision:1,title:'部署图',scene:{formatVersion:1,elements:[],appState:{},files:{}},previewAssetId:null,status:shared.status}))},drawingsApi:{references:vi.fn(async()=>[]),duplicate:vi.fn()},contentAssetsApi:{read:vi.fn()}}));
import {DrawingEmbedBlock} from '../../src/features/drawings/DrawingEmbedBlock';
import {HistoryPanel} from '../../src/features/content/HistoryPanel';
it('pinned references show their version and preview-pending placeholder without loading a canvas',async()=>{
 render(<MemoryRouter><DrawingEmbedBlock documentId="doc" reference={{blockId:'b',drawingId:'d',mode:'pinned',revision:1}} canEdit={false} onReferenceChange={()=>{}}/></MemoryRouter>);
 expect(await screen.findByText('固定版本 v1')).toBeTruthy();expect(await screen.findByText('预览待更新')).toBeTruthy();expect(screen.queryByRole('button',{name:'编辑原图'})).toBeNull();expect(document.querySelector('.excalidraw')).toBeNull();
});
it('deleted references stay visible as placeholders',async()=>{
 shared.status='deleted';render(<MemoryRouter><DrawingEmbedBlock documentId="doc" reference={{blockId:'b',drawingId:'d',mode:'latest',revision:null}} canEdit={false} onReferenceChange={()=>{}}/></MemoryRouter>);expect(await screen.findByText('图已移入回收站')).toBeTruthy();shared.status='preview-pending';
});
it('viewer never receives arbitrary history or restore controls',()=>{
 render(<MemoryRouter><HistoryPanel kind="document" id="doc" beforeRestore={async()=>true} onRestored={()=>{}} onClose={()=>{}}/></MemoryRouter>);expect(screen.queryByRole('button',{name:'恢复到此版本'})).toBeNull();
});

it('newly saved document references are resolved again without reloading the page',async()=>{
 const {documentsApi}=await import('../../src/features/content/api');const resolve=vi.mocked(documentsApi.resolveEmbed);const before=resolve.mock.calls.length;
 render(<MemoryRouter><DrawingEmbedBlock documentId="doc" reference={{blockId:'b',drawingId:'d',mode:'latest',revision:null}} canEdit={false} onReferenceChange={()=>{}}/></MemoryRouter>);await screen.findByText('预览待更新');
 window.dispatchEvent(new CustomEvent('flowcraft:document-saved',{detail:{id:'doc'}}));
 const {waitFor}=await import('@testing-library/react');await waitFor(()=>expect(resolve.mock.calls.length).toBe(before+2));
});
