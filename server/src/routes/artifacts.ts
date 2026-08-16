import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { successResponse } from '../lib/response';
import { artifactService } from '../services/artifactService';
import { upload } from '../middleware/upload';
import { uploadFile, getFileStream as getMinIOStream } from '../lib/minio';
import { prisma } from '../lib/prisma';
import path from 'path';
import multer from 'multer';

const folderUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024, files: 2000 },
});

const router = Router();

router.post('/upload-folder', folderUpload.array('files', 2000), asyncHandler(async (req, res) => {
  const files = req.files as Express.Multer.File[];
  if (!files || files.length === 0) {
    throw new Error('No files uploaded');
  }

  const { projectId, taskId, name, type } = req.body;
  if (!projectId) throw new Error('projectId is required');

  const folderName = name || path.basename(files[0].originalname) || 'uploaded-folder';
  const timestamp = Date.now();
  const artifactId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const fileTree: { path: string; size: number; mimeType: string }[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const relativePath = (req.body as any)[`relativePath_${i}`] || file.originalname;
    const cleanPath = relativePath.replace(/\\/g, '/');
    const parts = cleanPath.split('/');
    const innerPath = parts.length > 1 ? parts.slice(1).join('/') : cleanPath;
    const objectName = `folders/${artifactId}/${innerPath}`;

    await uploadFile(file.buffer, objectName, file.mimetype);

    fileTree.push({
      path: innerPath,
      size: file.size,
      mimeType: file.mimetype,
    });
  }

  const artifact = await prisma.artifact.create({
    data: {
      id: artifactId,
      name: folderName,
      type: type || 'prototype',
      status: 'approved',
      filePath: `folders/${artifactId}`,
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

router.get('/:id/files/{*filePath}', asyncHandler(async (req, res) => {
  const artifact = await prisma.artifact.findUnique({ where: { id: req.params.id } });
  if (!artifact) throw new Error('Artifact not found');
  if (!artifact.filePath?.startsWith('folders/')) throw new Error('Not a folder artifact');

  const rawPath = req.params.filePath;
  const filePath = Array.isArray(rawPath) ? rawPath.join('/') : rawPath;
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

router.post('/', asyncHandler(async (req, res) => {
  const { name, type, projectId, taskId, status, content } = req.body;
  const artifact = await artifactService.create({ name, type, projectId, taskId, status, content });
  res.json(successResponse(artifact));
}));

router.post('/upload', upload.single('file'), asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new Error('No file uploaded');
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
  const { stream, contentType, fileName } = await artifactService.getFileStream(req.params.id);

  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(fileName)}"`);

  stream.pipe(res);
}));

router.get('/', asyncHandler(async (req, res) => {
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
  const artifact = await artifactService.getById(req.params.id);
  res.json(successResponse(artifact));
}));

router.patch('/:id', asyncHandler(async (req, res) => {
  const artifact = await artifactService.update(req.params.id, req.body);
  res.json(successResponse(artifact));
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  await artifactService.delete(req.params.id);
  res.status(204).send();
}));

export default router;

