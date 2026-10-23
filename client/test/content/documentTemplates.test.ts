import {it,expect} from 'vitest';
import {createDocumentTemplate,documentTemplateOptions} from '../../src/features/documents/DocumentTemplates';
import {documentToTiptap,documentFromTiptap} from '../../src/features/documents/tiptapDocumentAdapter';
const requested=['可研报告','实施方案','项目计划','测试报告','需求方案','设计方案','会议纪要','应急方案','培训方案'];
it.each(requested)('provides an editable, structured %s template with independent block identities',label=>{
 const option=documentTemplateOptions.find(item=>item.label===label);expect(option).toBeTruthy();const first=createDocumentTemplate(option!.value),second=createDocumentTemplate(option!.value);
 expect(first.blocks[0].content).toEqual([{type:'text',text:label,styles:{}}]);expect(first.blocks.filter(block=>block.type==='heading').length).toBeGreaterThanOrEqual(5);expect(first.blocks.some(block=>block.type==='table')).toBe(true);expect(new Set([...first.blocks,...second.blocks].map(block=>block.id)).size).toBe(first.blocks.length+second.blocks.length);expect(documentFromTiptap(documentToTiptap(first))).toEqual(first);
});
