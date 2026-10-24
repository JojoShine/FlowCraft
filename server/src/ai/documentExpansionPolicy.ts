export type LengthRequirement={max:number;unit:'han'|'characters'};
export function lengthRequirements(instructions:string):LengthRequirement[] {
 const limits:LengthRequirement[]=[];
 function add(max:number,unit:LengthRequirement['unit'],position:number,matchedPrefix='') {
  const clauses=instructions.slice(0,position).split(/[,，;；。\n]/),context=clauses[clauses.length-1]+matchedPrefix;
  const scopes=[...context.matchAll(/全文|正文|总字数|总长度|全篇|整篇|整体|摘要|标题|引言|结论|小结|每(?:段|节|章|项|条)|各(?:段|节|章)|单(?:段|节|章)|每个/g)],nearest=scopes[scopes.length-1]?.[0];
  if(nearest&&!/^(?:全文|正文|总字数|总长度|全篇|整篇|整体)$/.test(nearest)) return;
  if(Number.isSafeInteger(max)&&max>0) limits.push({max,unit});
 }
 const pattern=/(不超过|不要超过|不得超过|不能超过|全文|正文|写一份|写一篇|最多|至多|上限(?:为|是|[:：])?|控制在|限制在|限定在)?\s*([\d,，]+)\s*(?:个)?(汉字|中文字符|字符|字)\s*(以内|以下|内|左右)?/g;
 for(const match of instructions.matchAll(pattern)){if(!match[1]&&!match[4]) continue;add(Number(match[2].replace(/[,，]/g,'')),match[3]==='汉字'?'han':'characters',match.index!,match[1]);}
 for(const match of instructions.matchAll(/(?:字数|字符数)\s*上限\s*[:：为]?\s*([\d,，]+)/g)) add(Number(match[1].replace(/[,，]/g,'')),'characters',match.index!);
 const distinct=new Map<LengthRequirement['unit'],number>();for(const limit of limits) distinct.set(limit.unit,Math.min(distinct.get(limit.unit)??Infinity,limit.max));
 return [...distinct].map(([unit,max])=>({max,unit}));
}
export function lengthRequirement(instructions:string):LengthRequirement|null {return lengthRequirements(instructions)[0]||null;}
export function countExpansionText(markdown:string,unit:LengthRequirement['unit']) {return unit==='han'?(markdown.match(/\p{Script=Han}/gu)||[]).length:Array.from(markdown.replace(/\s/gu,'')).length;}
function tableCells(line:string):string[] {
 const cells:string[]=[];let from=0;
 for(let index=0;index<line.length;index++){if(line[index]!=='|') continue;let slashes=0;for(let at=index-1;at>=0&&line[at]==='\\';at--) slashes++;if(slashes%2) continue;cells.push(line.slice(from,index));from=index+1;}
 cells.push(line.slice(from));if(cells.length>1&&!cells[0].trim()) cells.shift();if(cells.length>1&&!cells[cells.length-1].trim()) cells.pop();return cells;
}
function separator(line:string){return line.includes('|')&&tableCells(line).every(cell=>/^:?-{3,}:?$/.test(cell.trim()));}
export function markUnsupportedLines(markdown:string,unsupported:number[]):string {
 const lines=markdown.split('\n'),selected=new Set(unsupported);
 for(const line of selected) {const text=lines[line-1];if(!Number.isInteger(line)||line<1||line>lines.length||!text?.trim()||/^\s*(?:#{1,6}\s|```|~~~)/.test(text)||separator(text)) throw new Error('无效的材料核对结果');}
 return lines.map((line,index)=>{if(!selected.has(index+1)) return line;let start=index;while(start>0&&lines[start-1].trim()) start--;let end=index;while(end+1<lines.length&&lines[end+1].trim()) end++;
  if(line.includes('|')&&lines.slice(start,end+1).some(separator)) return '| '+tableCells(line).map(()=>'待补充').join(' | ')+' |';
  const prefix=line.match(/^\s*(?:[-*+]|\d+[.)])\s+(?:\[[ xX]\]\s+)?/)?.[0]||'';return prefix.replace(/\[[xX]\]/,'[ ]')+'待补充';
 }).join('\n');
}
function placeholder(line:string):boolean {
 const text=line.replace(/^\s*(?:[-*+]|\d+[.)])\s+(?:\[[ xX]\]\s+)?/,'').trim(),cells=text.includes('|')?tableCells(text):[text];
 return cells.length>0&&cells.every(cell=>/^待补充[。．.!！?？：:、，,；;]*$/.test(cell.trim()));
}
export function reviewedUnsupportedLines(markdown:string,checks:{line:number;evidence:string[];unsupported:boolean}[],source:string):number[] {
 const lines=markdown.split('\n'),required=lines.flatMap((line,index)=>{
  const text=line.trim();if(!text||/^(?:#{1,6}\s|```|~~~)/.test(text)||separator(text)||(lines[index+1]&&separator(lines[index+1]))||placeholder(text)) return [];
  return [index+1];
 }),seen=new Set<number>(),unsupported=new Set(required);
 for(const check of checks){if(!Number.isInteger(check.line)||check.line<1||check.line>lines.length||!lines[check.line-1].trim()||seen.has(check.line)) throw new Error('无效的逐行材料核对');seen.add(check.line);if(!required.includes(check.line)) continue;if(!check.unsupported&&check.evidence.length&&check.evidence.every(quote=>quote.trim()&&source.includes(quote))) unsupported.delete(check.line);}
 if(required.length&&!checks.length) throw new Error('材料核对为空');return [...unsupported];
}
const purposeStart='(?:(?:目标|目的|预期(?:输出|成果|结果)|期望(?:输出|成果|结果))\\s*(?:[:：是为|]|\\r?\\n)|旨在)\\s*';
function purposeText(value:string){return value.replace(/\*\*|__|`/g,'').replace(/^\s*(?:[-*+]|\d+[.)])\s+/,'').replace(/\s/g,'').replace(/^[|]+|[|。．.!！?？；;，,]+$/g,'');}
function purposeKind(value:string):'goal'|'output' {return /预期|期望/.test(value)?'output':'goal';}
export function enforceExplicitPurposes(markdown:string,material:string):{markdown:string;unsupportedLines:number[]} {
 const declared={goal:new Set<string>(),output:new Set<string>()},cleanMaterial=material.replace(/\*\*|__|`/g,''),invalidDeclaration=/建议|提议|拟议|设想|假设|示例|例如|模板|填写|说明|写作要求|未明确|未确认|尚未|未确定|未提供|不要|不得|不能/;
 const sourceHeadings=[...cleanMaterial.matchAll(/^ {0,3}(#{1,6})[ \t]+(.+)$/gm)],sourceScopes:{level:number;title:string}[]=[];let sourceHeading=0;
 for(const match of cleanMaterial.matchAll(new RegExp(purposeStart+'([^\\r\\n。！？!?；;]+)','g'))) {
  while(sourceHeading<sourceHeadings.length&&sourceHeadings[sourceHeading].index!<=match.index!) {
   const heading=sourceHeadings[sourceHeading++],level=heading[1].length;while(sourceScopes.length&&sourceScopes[sourceScopes.length-1].level>=level) sourceScopes.pop();sourceScopes.push({level,title:heading[2]});
  }
  const before=cleanMaterial.slice(0,match.index).split(/[\r\n。！？!?；;]/).pop()||'',value=match[1];
  if(invalidDeclaration.test(before)||sourceScopes.some(scope=>invalidDeclaration.test(scope.title))||/尚未(?:确认|确定|批准)|未(?:确认|确定|批准)|待(?:确认|确定|批准)/.test(value)) continue;
  const kind=purposeKind(match[0].slice(0,match[0].length-value.length));
  for(const part of [value,...value.split(/[，,]/)]) {const text=purposeText(part);if(text) declared[kind].add(text);}
 }
 const lines=markdown.split('\n'),bodyUnsupported:number[]=[],unsupportedLines:number[]=[],sections:{level:number;kind:'goal'|'output'|null}[]=[];let purposeSection:'goal'|'output'|null=null;
 for(let index=0;index<lines.length;index++) {
  const clean=lines[index].replace(/\*\*|__|`/g,''),heading=/^\s*(#{1,6})\s+(.+)/.exec(clean),match=new RegExp(purposeStart+'([\\s\\S]*)$').exec(clean);
  if(heading) {
   const level=heading[1].length;while(sections.length&&sections[sections.length-1].level>=level) sections.pop();
   purposeSection=/(?:目标|目的)(?=$|[\s与和:：])|预期(?:输出|成果|结果)|期望(?:输出|成果|结果)/.test(heading[2])?purposeKind(heading[2]):sections[sections.length-1]?.kind||null;sections.push({level,kind:purposeSection});
  }
  if(!clean.trim()||separator(clean)||(lines[index+1]&&separator(lines[index+1]))||placeholder(clean)) continue;
  if(heading&&!match) continue;
  if(!match&&!purposeSection) continue;
  if(!match&&/^\s*(?:[-*+]|\d+[.)])?\s*(?:背景|主题|会议主题|议题|时间|地点|主持(?:人)?|记录(?:人)?|参会(?:人员)?|缺席(?:人员)?|项目名(?:称)?|部署环境|涉及环境|权限)\s*[:：]/.test(clean)) continue;
  const value=match?match[1]:clean.replace(/^\s*(?:[-*+]|\d+[.)])\s+(?:\[[ xX]\]\s+)?/,''),kind=match?purposeKind(match[0].slice(0,match[0].length-value.length)):purposeSection!;
  if(purposeText(value)==='待补充'||value.split(/[，,]/).every(part=>declared[kind].has(purposeText(part)))) continue;
  unsupportedLines.push(index+1);
  if(heading) lines[index]=clean.slice(0,match!.index+match![0].length-match![1].length)+'待补充';else bodyUnsupported.push(index+1);
 }
 return {markdown:markUnsupportedLines(lines.join('\n'),bodyUnsupported),unsupportedLines};
}
