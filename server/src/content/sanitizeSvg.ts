import createDOMPurify from 'dompurify';
import {JSDOM} from 'jsdom';
import {AppError} from '../middleware/errorHandler';
export function sanitizeSvg(input:Buffer):Buffer {
 if(input.length>10*1024*1024) throw new AppError('预览容量过大',413);
 const source=input.toString('utf8');if(/<!DOCTYPE|<!ENTITY/i.test(source)) throw AppError.badRequest('SVG 文档声明不受支持');
 const window=new JSDOM('').window;
 try {
  const parsed=new window.DOMParser().parseFromString(source,'image/svg+xml');const svg=parsed.documentElement;
  if(svg.localName!=='svg'||parsed.querySelector('parsererror')) throw AppError.badRequest('SVG 格式无效');
  const purifier=createDOMPurify(window as any);
  const cleaned=purifier.sanitize(svg.outerHTML,{USE_PROFILES:{svg:true,svgFilters:true},FORBID_TAGS:['script','foreignObject','style','iframe','object','embed','animate','animateMotion','animateTransform','set','feImage','a'],FORBID_ATTR:['onload','onclick'],ADD_DATA_URI_TAGS:['image']});
  const doc=new window.DOMParser().parseFromString(cleaned,'image/svg+xml');const root=doc.documentElement;
  for(const element of [root,...Array.from(root.querySelectorAll('*'))]) {
   for(const attr of Array.from(element.attributes)) {
    const name=attr.localName.toLowerCase(),value=attr.value;
    if(name.startsWith('on')||/@import|expression\s*\(|url\s*\(/i.test(value)) {element.removeAttributeNode(attr);continue;}
    if(name==='href') {
     if(value.startsWith('#')) continue;
     if(element.localName!=='image'||!safeRasterData(value)) element.removeAttributeNode(attr);
    }
    if(['src','srcset'].includes(name)) element.removeAttributeNode(attr);
   }
  }
  root.setAttribute('xmlns','http://www.w3.org/2000/svg');return Buffer.from(new window.XMLSerializer().serializeToString(root));
 } finally {window.close();}
}
function safeRasterData(value:string) {
 const match=/^data:image\/(png|jpeg|gif|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);if(!match) return false;
 const bytes=Buffer.from(match[2],'base64');if(bytes.length>10*1024*1024) return false;
 return match[1]==='png'?bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])):match[1]==='jpeg'?bytes[0]===255&&bytes[1]===216&&bytes[2]===255:match[1]==='gif'?bytes.subarray(0,3).toString()==='GIF':bytes.subarray(0,4).toString()==='RIFF'&&bytes.subarray(8,12).toString()==='WEBP';
}
