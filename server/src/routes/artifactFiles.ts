import { Router } from 'express';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { prisma } from '../lib/prisma';
import { getFileStream as getMinIOStream } from '../lib/minio';
import path from 'path';
import WordExtractor from 'word-extractor';

const router = Router();

router.get('/:id/files/{*filePath}', asyncHandler(async (req, res) => {
  const artifact = await prisma.artifact.findUnique({ where: { id: req.params.id as string } });
  if (!artifact) throw AppError.notFound('Artifact not found');
  if (!artifact.content) throw AppError.badRequest('Not a folder artifact');

  const rawPath = req.params.filePath;
  const filePath = Array.isArray(rawPath) ? rawPath.join('/') : (rawPath as string);
  const objectName = `${artifact.filePath}/${filePath}`;

  try {
    const { stream, contentType } = await getMinIOStream(objectName);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(path.basename(filePath))}"`);
    stream.pipe(res);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[FolderFile] Error:', { objectName, err: msg });
    res.status(404).json({ error: { message: 'File not found in folder' } });
  }
}));

router.get('/:id/preview/{*filePath}', asyncHandler(async (req, res) => {
  const artifact = await prisma.artifact.findUnique({ where: { id: req.params.id as string } });
  if (!artifact) throw AppError.notFound('Artifact not found');
  if (!artifact.content) throw AppError.badRequest('Not a folder artifact');

  const rawPath = req.params.filePath;
  const filePath = Array.isArray(rawPath) ? rawPath.join('/') : (rawPath as string);
  const ext = path.extname(filePath).toLowerCase();

  if (ext !== '.doc') {
    throw AppError.badRequest('Preview only supported for .doc files');
  }

  const objectName = `${artifact.filePath}/${filePath}`;

  try {
    const { stream } = await getMinIOStream(objectName);
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }
    const buffer = Buffer.concat(chunks);

    const extractor = new WordExtractor();
    const doc = await extractor.extract(buffer);
    const body = doc.getBody();
    const paragraphs = body.split(/\r?\n/).filter((p: string) => p.trim().length > 0);
    const html = paragraphs.map((p: string) => `<p>${p.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`).join('\n');

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch {
    res.status(404).json({ error: { message: 'File not found in folder' } });
  }
}));

export default router;
