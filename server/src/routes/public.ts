import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { successResponse } from '../lib/response';
import { prisma } from '../lib/prisma';
import { getFileStream as getMinIOStream } from '../lib/minio';
import { AppError } from '../middleware/errorHandler';
import path from 'path';
import { ZipArchive } from 'archiver';

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

router.get('/artifacts/:token/download', asyncHandler(async (req, res) => {
  const artifact = await getArtifactByToken(req.params.token as string);
  if (!artifact.content) throw AppError.badRequest('Not a folder artifact');

  const fileTree: { path: string; size: number; mimeType: string }[] = JSON.parse(artifact.content);
  if (!Array.isArray(fileTree) || fileTree.length === 0) {
    throw AppError.badRequest('Folder is empty');
  }

  const folderName = artifact.name || 'download';
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(folderName)}.zip"`);

  const archive = new ZipArchive({ zlib: { level: 6 } });
  archive.on('error', (err: Error) => {
    console.error('[PublicFolderDownload] Archive error:', err.message);
    if (!res.headersSent) {
      res.status(500).json({ error: { message: 'Failed to create archive' } });
    }
  });
  archive.pipe(res);

  for (const file of fileTree) {
    const objectName = `${artifact.filePath}/${file.path}`;
    try {
      const { stream } = await getMinIOStream(objectName);
      archive.append(stream, { name: file.path });
    } catch (err) {
      console.warn(`[PublicFolderDownload] Skipping missing file: ${objectName}`);
    }
  }

  await archive.finalize();
}));

router.get('/artifacts/:token/files/{*filePath}', asyncHandler(async (req, res) => {
  const artifact = await getArtifactByToken(req.params.token as string);
  if (!artifact.content) throw AppError.badRequest('Not a folder artifact');

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

  const head = buffer.slice(0, 1024).toString('utf8').toLowerCase();
  if (head.includes('<html') || head.includes('<!doctype html') || head.includes('<body') || head.includes('<head') || head.includes('xmlns')) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(buffer);
    return;
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send('<style>.doc-err{text-align:center;color:#999;padding:40px;font-size:14px}@media(prefers-color-scheme:dark){.doc-err{color:#888}}</style><p class="doc-err">该文档格式暂不支持预览，请下载后使用其他软件打开</p>');
}));

router.get('/artifacts/:token/preview/{*filePath}', asyncHandler(async (req, res) => {
  const artifact = await getArtifactByToken(req.params.token as string);
  if (!artifact.content) throw AppError.badRequest('Not a folder artifact');

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
