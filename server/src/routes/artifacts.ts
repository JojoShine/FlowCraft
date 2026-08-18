import { Router } from 'express';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { successResponse } from '../lib/response';
import { artifactService } from '../services/artifactService';
import { upload } from '../middleware/upload';
import { uploadFile } from '../lib/minio';
import { compressImage } from '../lib/imageCompress';
import { prisma } from '../lib/prisma';
import { requireRole, scopeViewer } from '../middleware/auth';
import path from 'path';
import { Readable } from 'stream';
import WordExtractor from 'word-extractor';
import multer from 'multer';

const folderUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024, files: 2000 },
});

const router = Router();

router.post('/upload-folder', requireRole('admin'), folderUpload.array('files', 2000), asyncHandler(async (req, res) => {
  const files = req.files as Express.Multer.File[];
  if (!files || files.length === 0) {
    throw AppError.badRequest('No files uploaded');
  }

  const { projectId, taskId, name, type } = req.body;
  if (!projectId) throw AppError.badRequest('projectId is required');

  const folderName = name || path.basename(files[0].originalname) || 'uploaded-folder';
  const timestamp = Date.now();
  const artifactId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const taskDir = taskId || 'default';

  const fileTree: { path: string; size: number; mimeType: string }[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const relativePath = (req.body as any)[`relativePath_${i}`] || file.originalname;
    const cleanPath = relativePath.replace(/\\/g, '/');
    const parts = cleanPath.split('/');
    const innerPath = parts.length > 1 ? parts.slice(1).join('/') : cleanPath;
    const objectName = `${projectId}/${taskDir}/${artifactId}/${innerPath}`;

    const compressed = await compressImage(file.buffer, file.mimetype);
    await uploadFile(compressed, objectName, file.mimetype);

    fileTree.push({
      path: innerPath,
      size: compressed.length,
      mimeType: file.mimetype,
    });
  }

  const artifact = await prisma.artifact.create({
    data: {
      id: artifactId,
      name: folderName,
      type: type || 'prototype',
      status: 'approved',
      filePath: `${projectId}/${taskDir}/${artifactId}`,
      content: JSON.stringify(fileTree),
      projectId,
      taskId: taskId || null,
    },
    include: {
      task: { select: { id: true, title: true } },
      creator: { select: { id: true, name: true } },
    },
  });

  res.status(201).json(successResponse(artifact));
}));

router.post('/', requireRole('admin'), asyncHandler(async (req, res) => {
  const { name, type, projectId, taskId, status, content } = req.body;
  const artifact = await artifactService.create({ name, type, projectId, taskId, status, content });
  res.json(successResponse(artifact));
}));

router.post('/upload', requireRole('admin'), upload.single('file'), asyncHandler(async (req, res) => {
  if (!req.file) {
    throw AppError.badRequest('No file uploaded');
  }

  const { projectId, taskId, type, name } = req.body;
  
  const artifact = await artifactService.upload(req.file, {
    projectId,
    taskId,
    type,
    name,
  });

  res.status(201).json(successResponse(artifact));
}));

router.get('/:id/file', asyncHandler(async (req, res) => {
  const { stream, contentType, fileName } = await artifactService.getFileStream(req.params.id as string);

  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(fileName)}"`);

  stream.pipe(res);
}));

router.get('/:id/preview', asyncHandler(async (req, res) => {
  const { stream, fileName } = await artifactService.getFileStream(req.params.id as string);
  const ext = path.extname(fileName).toLowerCase();

  if (ext !== '.doc') {
    throw AppError.badRequest('Preview only supported for .doc files');
  }

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

router.get('/', scopeViewer(), asyncHandler(async (req, res) => {
  const { projectId, type, page, pageSize } = req.query;
  const result = await artifactService.list({
    projectId: projectId as string,
    type: type as string,
    page: page ? Number(page) : undefined,
    pageSize: pageSize ? Number(pageSize) : undefined,
  });
  res.json(successResponse(result.data, { total: result.total, page: result.page, pageSize: result.pageSize }));
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const artifact = await artifactService.getById(req.params.id as string);
  res.json(successResponse(artifact));
}));

router.patch('/:id', requireRole('admin'), asyncHandler(async (req, res) => {
  const artifact = await artifactService.update(req.params.id as string, req.body);
  res.json(successResponse(artifact));
}));

router.delete('/:id', requireRole('admin'), asyncHandler(async (req, res) => {
  await artifactService.delete(req.params.id as string);
  res.status(204).send();
}));

router.post('/:id/share', requireRole('admin'), asyncHandler(async (req, res) => {
  const token = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  const artifact = await prisma.artifact.update({
    where: { id: req.params.id as string },
    data: { shareToken: token },
  });
  res.json(successResponse({ shareToken: artifact.shareToken }));
}));

router.delete('/:id/share', requireRole('admin'), asyncHandler(async (req, res) => {
  await prisma.artifact.update({
    where: { id: req.params.id as string },
    data: { shareToken: null },
  });
  res.status(204).send();
}));

export default router;

