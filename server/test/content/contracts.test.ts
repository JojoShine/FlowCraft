import {describe,it,expect} from 'vitest';
import {normalizeDocument,normalizeScene,contentDigest,documentText} from '../../src/content/validation';
import {testEnvironment} from '../environment';
const scene = {formatVersion:1,elements:[{id:'a',type:'rectangle',x:0.123456789,y:2},{id:'b',type:'text',text:'服务器'}],appState:{viewBackgroundColor:'#fff'},files:{}};
const withOnlyViewportChanged = (s:typeof scene) => ({...s,appState:{...s.appState,scrollX:50,zoom:{value:2},selectedElementIds:{a:true}}});
const reversedElements = (s:typeof scene) => ({...s,elements:[...s.elements].reverse()});
describe('content contracts',()=>{
 it('rejects unsupported formats and blocks',()=>{expect(()=>normalizeDocument({formatVersion:99,blocks:[]})).toThrow();expect(()=>normalizeDocument({formatVersion:1,blocks:[{id:'x',type:'script'}]})).toThrow();});
 it('enforces UTF8 byte limits',()=>{expect(()=>normalizeDocument({formatVersion:1,blocks:[{id:'a',type:'paragraph',content:'中'.repeat(750000)}]})).toThrow(/大|limit|容量/);});
 it('ignores viewport but preserves element order, ids, and floating coordinates',()=>{expect(contentDigest('图',scene as any)).toBe(contentDigest('图',withOnlyViewportChanged(scene) as any));expect(contentDigest('图',reversedElements(scene) as any)).not.toBe(contentDigest('图',scene as any));expect(normalizeScene(scene).elements[0].x).toBe(0.123456789);});
 it('rejects embeds and binary scene files',()=>{expect(()=>normalizeScene({...scene,elements:[{id:'e',type:'embeddable'}]})).toThrow();expect(()=>normalizeScene({...scene,files:{f:{dataURL:'data:image/png;base64,a'}}})).toThrow();});
 it('rejects unsafe test destinations before connecting',()=>{expect(()=>testEnvironment({TEST_DATABASE_URL:'postgresql://x@prod.example/flowcraft_test'})).toThrow();expect(()=>testEnvironment({TEST_DATABASE_URL:'postgresql://x@127.0.0.1/live'})).toThrow();expect(()=>testEnvironment({TEST_MINIO_ENDPOINT:'prod.example'})).toThrow();});
});

it('document search contains visible content instead of formatting keys and URLs',()=>{
 const body={formatVersion:1 as const,blocks:[{id:'p',type:'paragraph',content:[{type:'link',href:'https://hidden.example',content:[{type:'text',text:'服务器说明',styles:{textColor:'red'}}]}]}]};
 expect(documentText(body)).toBe('服务器说明');
});

it('enforces persisted document byte size after normalization adds missing structural defaults',()=>{
 const input={formatVersion:1,blocks:[{id:'p',type:'paragraph',content:''}]};
 input.blocks[0].content='a'.repeat(2*1024*1024-Buffer.byteLength(JSON.stringify(input)));
 expect(Buffer.byteLength(JSON.stringify(input))).toBe(2*1024*1024);expect(()=>normalizeDocument(input)).toThrow(/容量/);
});
it('image references must be own entries instead of inherited object properties',()=>{
 expect(()=>normalizeScene({formatVersion:1,elements:[{id:'i',type:'image',fileId:'constructor'}],appState:{},files:{}})).toThrow(/图片/);
});
