import {it,expect} from 'vitest';
import {parseMarkdown,safeLinkUrl} from '../../src/features/documents/markdown';
import {createDocumentTemplate} from '../../src/features/documents/DocumentTemplates';
it('keeps Markdown headings, code, and tables within one document and warns for missing local images',async()=>{
 const imported=await parseMarkdown('# 服务器\n\n## 部署\n\n```bash\necho hello\n```\n\n| 名称 | IP |\n| --- | --- |\n| web | 127.0.0.1 |\n\n![截图](./missing.png)');
 expect(imported.body.formatVersion).toBe(1);const serialized=JSON.stringify(imported.body);expect(serialized).toContain('heading');expect(serialized).toContain('codeBlock');expect(serialized).toContain('table');expect(imported.warnings).toHaveLength(1);
});
it('server template has the seven agreed columns; dangerous links are never executable',()=>{
 const body=JSON.stringify(createDocumentTemplate('servers'));for(const column of ['名称','环境','IP/域名','用途','部署服务','负责人','备注']) expect(body).toContain(column);
 expect(safeLinkUrl('javascript:alert(1)')).toBe(false);expect(safeLinkUrl('java\nscript:alert(1)')).toBe(false);expect(safeLinkUrl('data:text/html,hi')).toBe(false);expect(safeLinkUrl('https://example.com')).toBe(true);
});
