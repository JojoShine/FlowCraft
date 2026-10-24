import {it,expect,vi} from 'vitest';
import {renderHook,act} from '@testing-library/react';
const shared=vi.hoisted(()=>({role:'admin',manifest:vi.fn(),zip:vi.fn(async()=>new Blob(['zip'])),markdown:vi.fn(async()=>new Blob(['md'])),preview:vi.fn(async()=>{})}));
vi.mock('../../src/contexts/AuthContext',()=>({useAuth:()=>({user:{id:'u',role:shared.role}})}));
vi.mock('../../src/features/content/api',()=>({documentsApi:{exportManifest:shared.manifest,exportZip:shared.zip,exportMarkdown:shared.markdown}}));
vi.mock('../../src/features/drawings/exportPreview',()=>({ensureDrawingPreview:shared.preview}));
vi.mock('../../src/features/content/download',()=>({downloadBlob:vi.fn()}));
import {useDocumentExport} from '../../src/features/documents/useDocumentExport';
it('fills owner previews then downloads with exactly the original snapshot token',async()=>{
 shared.role='admin';shared.manifest.mockResolvedValue({snapshotToken:'frozen',documentVersion:3,resourceBytes:0,missingPreviews:[{drawingId:'d',version:2}]});const {result}=renderHook(()=>useDocumentExport('doc'));
 await act(()=>result.current.exportZip());expect(shared.preview).toHaveBeenCalledWith('d',2,expect.anything());expect(shared.zip).toHaveBeenCalledWith('doc','frozen',expect.anything());expect(shared.manifest).toHaveBeenCalledTimes(1);expect(result.current.error).toBeNull();
});
it('viewer missing-preview export reports a retryable reason without uploading or downloading an incomplete ZIP',async()=>{
 shared.role='viewer';shared.preview.mockClear();shared.zip.mockClear();shared.manifest.mockResolvedValue({snapshotToken:'frozen',documentVersion:1,resourceBytes:0,missingPreviews:[{drawingId:'d',version:1}]});const {result}=renderHook(()=>useDocumentExport('doc'));await act(()=>result.current.exportZip());expect(result.current.error).toMatch(/预览/);expect(shared.preview).not.toHaveBeenCalled();expect(shared.zip).not.toHaveBeenCalled();
});
