import path from 'path';
import mammoth from 'mammoth';
import {AppError} from '../middleware/errorHandler';
export type TaskAttachment={originalname:string;buffer:Buffer};
export async function taskAttachmentText(files:TaskAttachment[]) {
 if(files.length>3) throw AppError.badRequest('最多添加 3 个附件');
 const parts:string[]=[];
 for(const file of files) {
  if(file.buffer.length>5*1024*1024) throw new AppError('每个附件不能超过 5 MB',413);
  const name=path.basename(file.originalname),extension=path.extname(name).toLowerCase();
  if(!['.md','.txt','.docx','.pdf'].includes(extension)) throw AppError.badRequest('附件支持 Markdown、TXT、Word（DOCX）和 PDF');
  let text:string;
  try {
   if(extension==='.docx') text=(await mammoth.extractRawText({buffer:file.buffer})).value;
   else if(extension==='.pdf') {
    const {PDFParse}=await import('pdf-parse');const parser=new PDFParse({data:file.buffer,isEvalSupported:false});
    try {const result=await parser.getText({first:101,pageJoiner:''});if(result.total>100) throw AppError.badRequest('PDF 超过 100 页，请提取需要拆解的部分');text=result.text;}finally{await parser.destroy();}
   } else text=new TextDecoder('utf-8',{fatal:true}).decode(file.buffer);
  }catch(error){if(error instanceof AppError) throw error;throw AppError.badRequest(`无法读取附件“${name}”，请检查文件格式、编码或是否加密`);}
  if(!text.trim()) throw AppError.badRequest(`附件“${name}”没有可读取的文字；扫描 PDF 请先转为文字版`);
  parts.push(`附件：${name}\n${text.trim()}`);
 }
 return parts.join('\n\n');
}
