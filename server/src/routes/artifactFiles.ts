import { Router } from 'express';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { prisma } from '../lib/prisma';
import { getFileStream as getMinIOStream } from '../lib/minio';
import path from 'path';

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

    const head = buffer.slice(0, 1024).toString('utf8').toLowerCase();
    if (head.includes('<html') || head.includes('<!doctype html') || head.includes('<body') || head.includes('<head') || head.includes('xmlns')) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(buffer);
      return;
    }

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send('<style>.doc-err{text-align:center;color:#999;padding:40px;font-size:14px}@media(prefers-color-scheme:dark){.doc-err{color:#888}}</style><p class="doc-err">该文档格式暂不支持预览，请下载后使用其他软件打开</p>');
  } catch {
    res.status(404).json({ error: { message: 'File not found in folder' } });
  }
}));

export default router;
