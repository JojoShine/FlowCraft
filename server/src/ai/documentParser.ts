import mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import cheerio from 'cheerio';

export async function parseBufferToText(buffer: Buffer, fileName: string): Promise<string> {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';

  switch (ext) {
    case 'txt':
    case 'md':
      return buffer.toString('utf-8');

    case 'html':
    case 'htm':
      return parseHtml(buffer.toString('utf-8'));

    case 'docx':
      return parseDocx(buffer);

    case 'xlsx':
    case 'xls':
      return parseExcel(buffer);

    case 'pdf':
      return parsePdf(buffer);

    default:
      return buffer.toString('utf-8');
  }
}

function parseHtml(html: string): string {
  const $ = cheerio.load(html);
  $('script, style, noscript').remove();
  return $('body').text().replace(/\s+/g, ' ').trim();
}

async function parseDocx(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

function parseExcel(buffer: Buffer): string {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const lines: string[] = [];
  for (const name of workbook.SheetNames) {
    const sheet = workbook.Sheets[name];
    const csv = XLSX.utils.sheet_to_csv(sheet);
    lines.push(`[${name}]\n${csv}`);
  }
  return lines.join('\n\n');
}

async function parsePdf(buffer: Buffer): Promise<string> {
  const { PDFParse } = await import('pdf-parse');
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  const result = await parser.getText();
  await parser.destroy();
  return result.text;
}
