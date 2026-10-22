import {it,expect} from 'vitest';
import {withContentFixture} from '../fixtures';
import {drawingService,saveDrawingPreview} from '../../src/content/drawingService';
import {sanitizeSvg} from '../../src/content/sanitizeSvg';
const svg=Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect x="0" y="0" width="100" height="100"/></svg>');
it('old preview arriving late cannot replace the latest thumbnail or source revision',()=>withContentFixture(async fx=>{
 const d=await drawingService.create(fx.owner,{projectId:fx.project.id,title:'图',payload:fx.scene});
 const first=await drawingService.revision(fx.owner,d.id,1);
 const ack=await drawingService.save(fx.owner,d.id,{baseVersion:1,requestId:fx.requestId(),source:'auto',title:'新版',payload:fx.scene});
 const latest=await saveDrawingPreview(fx.owner,d.id,2,ack.digest,svg);
 await saveDrawingPreview(fx.owner,d.id,1,first.digest,svg);
 expect((await drawingService.list(fx.owner,{})).items[0].previewAssetId).toBe(latest.id);expect((await drawingService.read(fx.owner,d.id)).version).toBe(2);
 await expect(saveDrawingPreview(fx.viewer,d.id,2,ack.digest,svg)).rejects.toMatchObject({statusCode:403});
 await expect(saveDrawingPreview(fx.owner,d.id,2,'wrong',svg)).rejects.toMatchObject({statusCode:409});
}));
it('svg_export_removes_active_and_external_content without executing or fetching it',()=>{
 const dirty=Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><script>alert(1)</script><foreignObject><div>bad</div></foreignObject><image href="https://evil.example/x"/><rect style="fill:url(https://evil.example/a)" onclick="alert(1)"/><style>@import "https://evil.example";</style></svg>');
 const safe=sanitizeSvg(dirty).toString();expect(safe).not.toMatch(/script|foreignObject|onload|onclick|evil\.example|@import/);expect(safe).toContain('<svg');
 expect(()=>sanitizeSvg(Buffer.from('<!DOCTYPE svg [<!ENTITY a "bad">]><svg/>'))).toThrow();
});
