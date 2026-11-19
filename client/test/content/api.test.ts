import {it,expect,vi} from 'vitest';
const transport=vi.hoisted(()=>({get:vi.fn(),post:vi.fn(),patch:vi.fn(),delete:vi.fn(),put:vi.fn()}));
vi.mock('../../src/services/api',()=>({api:transport}));
import {documentsApi,drawingsApi,contentAssetsApi} from '../../src/features/content/api';
it('preserves save envelope and returns the once-unwrapped ack',async()=>{
 const input={baseVersion:3,requestId:'req',source:'manual' as const,title:'说明',payload:{formatVersion:1 as const,blocks:[]}};
 const ack={version:4,digest:'digest',savedAt:'2026-10-22T00:00:00Z',requestId:'req'};
 transport.patch.mockResolvedValue({data:ack});expect(await documentsApi.save('doc',input)).toEqual(ack);expect(transport.patch).toHaveBeenCalledWith('/documents/doc',input,expect.anything());
 transport.get.mockResolvedValue({data:{items:[],total:0,page:1,pageSize:50}});expect((await drawingsApi.list({})).total).toBe(0);
});
it('fetches protected assets as blobs without putting tokens in URLs',async()=>{
 const blob=new Blob(['image']);transport.get.mockResolvedValue({data:blob});const context={kind:'drawing' as const,id:'d'};
 expect(await contentAssetsApi.read('a',context)).toBe(blob);expect(transport.get).toHaveBeenLastCalledWith('/content-assets/a',expect.objectContaining({responseType:'blob',params:{context:JSON.stringify(context)}}));
});
