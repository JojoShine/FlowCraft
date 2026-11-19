import {it,expect} from 'vitest';
import {documentMarkdown} from '../../src/content/markdownExport';
it('empty legacy inline code content exports safely alongside tables and nested checklists',()=>{
 const markdown=documentMarkdown('手册',{formatVersion:1,blocks:[{id:'code',type:'codeBlock',props:{language:'bash'},content:[{type:'text',text:'',styles:{}}]},{id:'table',type:'table',content:{rows:[{cells:[[{type:'text',text:'名称'}],[{type:'text',text:'IP'}]]},{cells:[[{type:'text',text:'web'}],[{type:'text',text:'127.0.0.1'}]]}]}},{id:'list',type:'bulletListItem',content:'部署',children:[{id:'check',type:'checkListItem',props:{checked:true},content:'验证'}]}]},new Map(),[]);
 expect(markdown).toContain('```bash');expect(markdown).toContain('| 名称 | IP |');expect(markdown).toContain('    - [x] 验证');
});
