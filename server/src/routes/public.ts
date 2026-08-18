import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { successResponse } from '../lib/response';
import { prisma } from '../lib/prisma';
import { getFileStream as getMinIOStream } from '../lib/minio';
import { AppError } from '../middleware/errorHandler';
import path from 'path';
import WordExtractor from 'word-extractor';

const router = Router();

async function getArtifactByToken(token: string) {
  const artifact = await prisma.artifact.findUnique({ where: { shareToken: token } });
  if (!artifact) throw AppError.notFound('Shared artifact not found');
  return artifact;
}

router.get('/artifacts/:token', asyncHandler(async (req, res) => {
  const artifact = await getArtifactByToken(req.params.token as string);
  res.json(successResponse({
    id: artifact.id,
    name: artifact.name,
    type: artifact.type,
    filePath: artifact.filePath,
    content: artifact.content,
  }));
}));

router.get('/artifacts/:token/file', asyncHandler(async (req, res) => {
  const artifact = await getArtifactByToken(req.params.token as string);
  if (!artifact.filePath) throw AppError.badRequest('Artifact has no file');

  const { stream, contentType } = await getMinIOStream(artifact.filePath);
  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(artifact.name)}"`);
  stream.pipe(res);
}));

router.get('/artifacts/:token/files/{*filePath}', asyncHandler(async (req, res) => {
  const artifact = await getArtifactByToken(req.params.token as string);
  if (!artifact.filePath?.startsWith('folders/')) throw AppError.badRequest('Not a folder artifact');

  const rawPath = req.params.filePath;
  const filePath = Array.isArray(rawPath) ? rawPath.join('/') : (rawPath as string);
  const objectName = `${artifact.filePath}/${filePath}`;

  try {
    const { stream, contentType } = await getMinIOStream(objectName);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(path.basename(filePath))}"`);
    stream.pipe(res);
  } catch {
    res.status(404).json({ error: { message: 'File not found in folder' } });
  }
}));

router.get('/artifacts/:token/preview', asyncHandler(async (req, res) => {
  const artifact = await getArtifactByToken(req.params.token as string);
  if (!artifact.filePath) throw AppError.badRequest('Artifact has no file');

  const ext = path.extname(artifact.name).toLowerCase();
  if (ext !== '.doc') throw AppError.badRequest('Preview only supported for .doc files');

  const { stream } = await getMinIOStream(artifact.filePath);
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
}));

router.get('/artifacts/:token/preview/{*filePath}', asyncHandler(async (req, res) => {
  const artifact = await getArtifactByToken(req.params.token as string);
  if (!artifact.filePath?.startsWith('folders/')) throw AppError.badRequest('Not a folder artifact');

  const rawPath = req.params.filePath;
  const filePath = Array.isArray(rawPath) ? rawPath.join('/') : (rawPath as string);
  const ext = path.extname(filePath).toLowerCase();

  if (ext !== '.doc') throw AppError.badRequest('Preview only supported for .doc files');

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
