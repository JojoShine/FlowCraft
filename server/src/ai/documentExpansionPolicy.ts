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
