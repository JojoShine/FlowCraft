import {it,expect} from 'vitest';
import {decodeTemplate,encodeTemplate,cloneTemplateBody} from '../../src/features/documents/documentTemplateCatalog';
import {documentToTiptap} from '../../src/features/documents/tiptapDocumentAdapter';
import type {DocumentBody} from '../../src/features/content/types';
it('copies template blocks with independent IDs and replaces project-bound resources with editable placeholders',()=>{
 const body:DocumentBody={formatVersion:1,blocks:[{id:'heading',type:'heading',props:{level:2},content:'结构'},{id:'image',type:'image',props:{assetId:'secret',name:'示意图'}},{id:'list',type:'bulletListItem',content:'操作',children:[{id:'drawing',type:'drawing',props:{drawingId:'private'}},{id:'link',type:'documentLink',props:{documentId:'private-doc'}}]}]},copy=cloneTemplateBody(body);expect(copy.blocks[0].id).not.toBe('heading');expect(copy.blocks[0].content).toBe('结构');const json=JSON.stringify(copy);for(const value of ['secret','private','private-doc']) expect(json).not.toContain(value);expect(json).toContain('示意图');expect(()=>documentToTiptap(copy)).not.toThrow();expect(body.blocks[1].type).toBe('image');
});
it('round trips native templates and writing requirements without altering the source',async()=>{
 const body:DocumentBody={formatVersion:1,blocks:[{id:'one',type:'paragraph',content:'填写说明'}]},content=encodeTemplate(body,'面向评审，注明依据'),decoded=await decodeTemplate({content,fileType:'flowcraft'});expect(decoded.instructions).toBe('面向评审，注明依据');expect(decoded.body.blocks[0].content).toBe('填写说明');expect(decoded.body.blocks[0].id).not.toBe('one');
});
it.each(['html','word'])('converts legacy %s content to editable headings and tables without executing scripts',async fileType=>{
 const content='<h2>旧模板</h2><p>保留正文</p><script>window.hacked=true</script><table><tr><th>名称</th></tr><tr><td>服务器</td></tr></table>',result=await decodeTemplate({content,fileType});expect(JSON.stringify(result.body)).toContain('旧模板');expect(result.body.blocks.some(block=>block.type==='table')).toBe(true);expect(JSON.stringify(result.body)).not.toContain('hacked');expect(()=>documentToTiptap(result.body)).not.toThrow();
});
it('imports Markdown templates and rejects invalid native templates instead of silently blanking them',async()=>{
 expect(JSON.stringify((await decodeTemplate({content:'## 需求\n\n### 范围\n\n填写范围',fileType:'markdown'})).body)).toContain('范围');await expect(decodeTemplate({content:'{bad',fileType:'flowcraft'})).rejects.toThrow();
});
