import sharp from 'sharp';

const MIN_COMPRESS_SIZE = 100 * 1024;
const COMPRESSIBLE = ['image/jpeg', 'image/png', 'image/webp'];

export async function compressImage(buffer: Buffer, mimeType: string): Promise<Buffer> {
  if (!COMPRESSIBLE.includes(mimeType) || buffer.length < MIN_COMPRESS_SIZE) {
    return buffer;
  }

  if (mimeType === 'image/jpeg') {
    return sharp(buffer).rotate().jpeg({ quality: 80 }).toBuffer();
  }
  if (mimeType === 'image/png') {
    return sharp(buffer).png({ quality: 80 }).toBuffer();
  }
  if (mimeType === 'image/webp') {
    return sharp(buffer).webp({ quality: 80 }).toBuffer();
  }
  return buffer;
}
