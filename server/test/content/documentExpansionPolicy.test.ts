import {it,expect} from 'vitest';
import {lengthRequirement,countExpansionText,markUnsupportedLines} from '../../src/ai/documentExpansionPolicy';
it.each([
 ['总长度控制在 1500 个汉字以内。',{max:1500,unit:'han'}],
 ['不超过 1,500 字',{max:1500,unit:'characters'}],
 ['不要超过600字',{max:600,unit:'characters'}],
 ['全文800字',{max:800,unit:'characters'}],
 ['请写一份300字的方案',{max:300,unit:'characters'}],
 ['最多500个中文字符',{max:500,unit:'characters'}],
 ['至少 800 字，不超过 1200 字',{max:1200,unit:'characters'}],
 ['至少 800 字',null],['保留章节与表格',null],
 ['字数上限：600；使用中文',{max:600,unit:'characters'}],
 ['最多 500 字；全文控制在 400 字以内',{max:400,unit:'characters'}],
] as const)('reads upper length requirements from %s',(text,expected)=>expect(lengthRequirement(text)).toEqual(expected));
it('counts Han separately and counts all non-whitespace Unicode characters conservatively for generic character limits',()=>{expect(countExpansionText('## 标题\nAtlas 20，👩‍💻','han')).toBe(2);expect(countExpansionText('a 中\n😀','characters')).toBe(3);});
it('marks unsupported paragraphs, list steps, table cells and code instructions without losing headings or table structure',()=>{
 const source='# 方案\n\n## 回退\n\n切回原系统。\n\n1. 备份数据库。\n2. 执行增量同步。\n\n| 步骤 | 方法 |\n| --- | --- |\n| 切换 | 修改 DNS |\n\n```sh\nrm -rf data\n```';
 const lines=source.split('\n'),bad=['切回原系统。','2. 执行增量同步。','| 切换 | 修改 DNS |','rm -rf data'].map(text=>lines.indexOf(text)+1),result=markUnsupportedLines(source,bad);expect(result).toContain('## 回退');expect(result).toContain('1. 备份数据库。');expect(result).not.toMatch(/切回原系统|执行增量同步|修改 DNS|rm -rf data/);expect(result).toContain('| 待补充 | 待补充 |');expect(result).toContain('| --- | --- |');expect(result).toContain('2. 待补充');
});
it('rejects an invalid review instead of accepting an unchecked preview',()=>{expect(()=>markUnsupportedLines('# 标题\n内容',[20])).toThrow();expect(()=>markUnsupportedLines('# 标题\n内容',[1])).toThrow();});
it('does not treat a subsection limit as a whole-document limit',()=>{expect(lengthRequirement('总字数不超过1500字，摘要最多100字')).toEqual({max:1500,unit:'characters'});expect(lengthRequirement('摘要最多100字')).toBeNull();});
it('keeps different counting units independent',async()=>{const {lengthRequirements}=await import('../../src/ai/documentExpansionPolicy');expect(lengthRequirements('全文不超过1500汉字，全文最多2000字符')).toEqual([{max:1500,unit:'han'},{max:2000,unit:'characters'}]);});
it('preserves optional table borders and escaped pipes when marking an unsupported data row',()=>{const markdown='步骤 | 方法\n--- | ---\n切换\\|回退 | 修改DNS';expect(markUnsupportedLines(markdown,[3])).toBe('步骤 | 方法\n--- | ---\n| 待补充 | 待补充 |');});
it.each(['全文不超过1500字且摘要不超过100字','全文1500字以内（摘要最多100字）','全文每段最多100字，全文不超过1500字'])('uses the nearest scope for %s',instructions=>{expect(lengthRequirement(instructions)).toEqual({max:1500,unit:'characters'});});

it('marks unchecked or ungrounded substantive lines as pending',async()=>{const {reviewedUnsupportedLines}=await import('../../src/ai/documentExpansionPolicy');const markdown='# 方案\n\n备份数据库。\n\n回退时先恢复数据库。\n\n待补充';expect(reviewedUnsupportedLines(markdown,[{line:3,evidence:['备份数据库'],unsupported:false},{line:5,evidence:[],unsupported:false}],'备份数据库')).toEqual([5]);expect(reviewedUnsupportedLines(markdown,[{line:3,evidence:['备份数据库'],unsupported:false}],'备份数据库')).toEqual([5]);expect(reviewedUnsupportedLines(markdown,[{line:3,evidence:['并不存在的原文'],unsupported:false},{line:5,evidence:[],unsupported:true}],'备份数据库')).toEqual([3,5]);});

it('never exempts numeric facts or IP addresses and recognizes punctuated placeholders',async()=>{const {reviewedUnsupportedLines}=await import('../../src/ai/documentExpansionPolicy');for(const markdown of ['# 资源\n\n| 服务器数 | 预算 |\n| --- | --- |\n| 12 | 500000 |','# 资源\n\n192.168.1.20']) expect(()=>reviewedUnsupportedLines(markdown,[],'服务器数量待定')).toThrow();expect(reviewedUnsupportedLines('# 方案\n\n- 待补充。\n\n| 项目 | 信息 |\n| --- | --- |\n| 待补充 | 待补充 |',[],'')).toEqual([]);});

it('ignores redundant structural checks without exempting substantive data',async()=>{const {reviewedUnsupportedLines}=await import('../../src/ai/documentExpansionPolicy');expect(reviewedUnsupportedLines('# 方案\n\n备份数据库。',[{line:1,evidence:[],unsupported:false},{line:3,evidence:['备份数据库'],unsupported:false}],'备份数据库')).toEqual([]);});
