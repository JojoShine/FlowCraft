import {describe,it,expect} from 'vitest';
import {toTiptap,fromTiptap} from '../../src/features/documents/tiptapSampleAdapter';
describe('Tiptap sample persistence',()=>{
 it('round trips formatting and image identity without persisting preview URLs',()=>{
  const body={formatVersion:1 as const,blocks:[{id:'a',type:'heading',props:{level:2},content:[{type:'text',text:'部署说明',styles:{bold:true}}],children:[]},{id:'b',type:'image',props:{assetId:'asset-1',name:'截图.png'},children:[]}]};
  const json=toTiptap(body);json.content![1].attrs!.src='blob:temporary';
  const result=fromTiptap(json);expect(result.blocks[0]).toEqual(body.blocks[0]);expect(result.blocks[1].props).toEqual({assetId:'asset-1',url:'asset:asset-1',name:'截图.png'});expect(JSON.stringify(result)).not.toContain('blob:');
 });
 it('refuses unsupported content instead of silently discarding it',()=>{
  expect(()=>toTiptap({formatVersion:1,blocks:[{id:'table',type:'table',content:{}}]})).toThrow('样板');
  expect(()=>toTiptap({formatVersion:1,blocks:[{id:'a',type:'paragraph',children:[{id:'b',type:'paragraph'}]}]})).toThrow('样板');
 });
 it('rejects external images and formatting that the sample cannot preserve',()=>{
  expect(()=>toTiptap({formatVersion:1,blocks:[{id:'a',type:'image',props:{url:'https://example.com/diagram.png',name:'diagram.png'}}]})).toThrow('样板');
  expect(()=>toTiptap({formatVersion:1,blocks:[{id:'a',type:'image',props:{assetId:'asset-1',caption:'部署示意'}}]})).toThrow('样板');
  expect(()=>toTiptap({formatVersion:1,blocks:[{id:'a',type:'paragraph',props:{textAlignment:'center'},content:[]}]})).toThrow('样板');
 });
 it('retains pending image identity for recovering an interrupted upload',()=>{
  const result=fromTiptap({type:'doc',content:[{type:'image',attrs:{id:'paste-1',name:'截图.png',src:'blob:preview'}}]});
  expect(result.blocks[0].props).toEqual({url:'pending:paste-1',name:'截图.png'});expect(toTiptap(result).content![0].attrs!.id).toBe('paste-1');
 });
});
