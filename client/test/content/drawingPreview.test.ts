import {it,expect,vi} from 'vitest';
import {renderHook,waitFor} from '@testing-library/react';
const shared=vi.hoisted(()=>({read:vi.fn(),revision:vi.fn(),put:vi.fn(),render:vi.fn()}));
vi.mock('../../src/features/content/api',()=>({contentAssetsApi:{read:shared.read},drawingsApi:{revision:shared.revision,putPreview:shared.put}}));
vi.mock('../../src/features/drawings/exportPreview',()=>({exportPreview:(...args:any[])=>shared.render(...args)}));
import {useDrawingPreview} from '../../src/features/drawings/useDrawingPreview';
const scene={formatVersion:1,elements:[],appState:{},files:{image:{assetId:'same-asset'}}};
const ack=(version:number)=>({requestId:`request-${version}`,version,savedAt:'now'});
it('reuses immutable images across saved versions and cancels obsolete preview requests',async()=>{
 shared.read.mockResolvedValue(new Blob(['image']));shared.revision.mockImplementation(async(_id,version)=>({payload:scene,digest:`digest-${version}`}));shared.put.mockResolvedValue({});shared.render.mockImplementation(async(_scene,read)=>{await read('same-asset');return new Blob(['<svg/>']);});
 const {result,rerender,unmount}=renderHook(({version})=>useDrawingPreview({id:'drawing',canEdit:true,lastAck:ack(version)}),{initialProps:{version:1}});await waitFor(()=>expect(result.current.status).toBe('ready'));const signal=shared.revision.mock.calls[0][2];rerender({version:2});await waitFor(()=>expect(shared.put).toHaveBeenCalledTimes(2));expect(shared.read).toHaveBeenCalledTimes(1);expect(signal).toBeInstanceOf(AbortSignal);expect(signal.aborted).toBe(true);const latest=shared.revision.mock.calls[1][2];unmount();expect(latest.aborted).toBe(true);
});
