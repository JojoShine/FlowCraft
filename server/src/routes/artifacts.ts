import { Router } from 'express';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { successResponse } from '../lib/response';
import { artifactService } from '../services/artifactService';
import { upload } from '../middleware/upload';
import { uploadFile } from '../lib/minio';
import { compressImage } from '../lib/imageCompress';
import { prisma } from '../lib/prisma';
import { requireRole, checkProjectOwnership } from '../middleware/auth';
import { logger } from '../lib/logger';
import path from 'path';
import { Readable } from 'stream';
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
  if (!(await checkProjectOwnership(req.user!, projectId))) {
    res.status(403).json({ success: false, error: '无权操作该项目' });
    return;
  }

  const folderName = name || path.basename(files[0].originalname) || 'uploaded-folder';
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
      type: type || 'folder',
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
  const { name, type, projectId, taskId, templateId, outputFormat, status, content } = req.body;
  logger.info('[artifacts] POST create', { name, type, projectId, templateId, outputFormat });
  if (!(await checkProjectOwnership(req.user!, projectId))) {
    res.status(403).json({ success: false, error: '无权操作该项目' });
    return;
  }
  const artifact = await artifactService.create({ name, type, projectId, taskId, templateId, outputFormat, status, content });
  res.json(successResponse(artifact));
}));

router.post('/upload', requireRole('admin'), upload.single('file'), asyncHandler(async (req, res) => {
  if (!req.file) {
    throw AppError.badRequest('No file uploaded');
  }

  const { projectId, taskId, type, name } = req.body;
  if (!(await checkProjectOwnership(req.user!, projectId))) {
    res.status(403).json({ success: false, error: '无权操作该项目' });
    return;
  }

  const artifact = await artifactService.upload(req.file, {
    projectId,
    taskId,
    type,
    name,
  });

  res.status(201).json(successResponse(artifact));
}));

router.get('/:id/file', asyncHandler(async (req, res) => {
  const artifact = await prisma.artifact.findUnique({ where: { id: req.params.id as string }, select: { projectId: true } });
  if (!artifact || !(await checkProjectOwnership(req.user!, artifact.projectId))) {
    res.status(403).json({ success: false, error: '无权访问该产物' });
    return;
  }
  const { stream, contentType, fileName } = await artifactService.getFileStream(req.params.id as string);

  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(fileName)}"`);

  stream.pipe(res);
}));

router.get('/:id/preview', asyncHandler(async (req, res) => {
  const artifact = await prisma.artifact.findUnique({ where: { id: req.params.id as string }, select: { projectId: true, filePath: true } });
  if (!artifact || !(await checkProjectOwnership(req.user!, artifact.projectId))) {
    res.status(403).json({ success: false, error: '无权访问该产物' });
    return;
  }
  const ext = artifact.filePath ? path.extname(artifact.filePath).toLowerCase() : '';

  if (ext !== '.doc') {
    throw AppError.badRequest('Preview only supported for .doc files');
  }

  const { stream } = await artifactService.getFileStream(req.params.id as string);

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

router.get('/', asyncHandler(async (req, res) => {
  const { projectId, type, keyword, page, pageSize } = req.query;
  const result = await artifactService.list({
    projectId: projectId as string,
    type: type as string,
    keyword: keyword as string,
    page: page ? Number(page) : undefined,
    pageSize: pageSize ? Number(pageSize) : undefined,
    ownerId: req.user!.id,
  });
  res.json(successResponse(result.data, { total: result.total, page: result.page, pageSize: result.pageSize }));
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const artifact = await artifactService.getById(req.params.id as string);
  if (!(await checkProjectOwnership(req.user!, artifact.projectId))) {
    res.status(403).json({ success: false, error: '无权访问该产物' });
    return;
  }
  res.json(successResponse(artifact));
}));

router.patch('/:id', requireRole('admin'), asyncHandler(async (req, res) => {
  const existing = await prisma.artifact.findUnique({ where: { id: req.params.id as string }, select: { projectId: true } });
  if (!existing || !(await checkProjectOwnership(req.user!, existing.projectId))) {
    res.status(403).json({ success: false, error: '无权操作该产物' });
    return;
  }
  const artifact = await artifactService.update(req.params.id as string, req.body);
  res.json(successResponse(artifact));
}));

router.delete('/:id', requireRole('admin'), asyncHandler(async (req, res) => {
  const existing = await prisma.artifact.findUnique({ where: { id: req.params.id as string }, select: { projectId: true } });
  if (!existing || !(await checkProjectOwnership(req.user!, existing.projectId))) {
    res.status(403).json({ success: false, error: '无权操作该产物' });
    return;
  }
  await artifactService.delete(req.params.id as string);
  res.status(204).send();
}));

router.post('/:id/share', requireRole('admin'), asyncHandler(async (req, res) => {
  const existing = await prisma.artifact.findUnique({ where: { id: req.params.id as string }, select: { projectId: true } });
  if (!existing || !(await checkProjectOwnership(req.user!, existing.projectId))) {
    res.status(403).json({ success: false, error: '无权操作该产物' });
    return;
  }
  const token = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  const artifact = await prisma.artifact.update({
    where: { id: req.params.id as string },
    data: { shareToken: token },
  });
  res.json(successResponse({ shareToken: artifact.shareToken }));
}));

router.delete('/:id/share', requireRole('admin'), asyncHandler(async (req, res) => {
  const existing = await prisma.artifact.findUnique({ where: { id: req.params.id as string }, select: { projectId: true } });
  if (!existing || !(await checkProjectOwnership(req.user!, existing.projectId))) {
    res.status(403).json({ success: false, error: '无权操作该产物' });
    return;
  }
  await prisma.artifact.update({
    where: { id: req.params.id as string },
    data: { shareToken: null },
  });
  res.status(204).send();
}));

export default router;
