import { Router } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { AppError, asyncHandler } from '../middleware/errorHandler';
import { successResponse } from '../lib/response';
import { projectService } from '../services/projectService';
import { requireRole } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { parse } from './contentHttp';

const router = Router();
const collaboratorPermissions = z.strictObject({
  canEditDocuments: z.boolean().optional(),
  canEditDrawings: z.boolean().optional(),
});
const collaboratorFields = { id: true, username: true, name: true, createdAt: true, canEditDocuments: true, canEditDrawings: true } as const;

router.get('/', asyncHandler(async (req, res) => {
  const projects = req.user?.role === 'viewer'
    ? await projectService.listForViewer(req.user.projectId)
    : await projectService.list(req.user!.id);
  res.json(successResponse(projects));
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const project = (req.query.view as string) === 'summary'
    ? await projectService.getSummary(req.params.id as string)
    : await projectService.getById(req.params.id as string);
  if (project.ownerId !== req.user!.id) {
    res.status(403).json({ success: false, error: '无权访问该项目' });
    return;
  }
  res.json(successResponse(project));
}));

router.post('/', requireRole('admin'), asyncHandler(async (req, res) => {
  const project = await projectService.create({ ...req.body, ownerId: req.user!.id });
  res.status(201).json(successResponse(project));
}));

router.patch('/:id', requireRole('admin'), asyncHandler(async (req, res) => {
  const existing = await prisma.project.findUnique({ where: { id: req.params.id as string } });
  if (!existing) {
    res.status(404).json({ success: false, error: '项目不存在' });
    return;
  }
  if (existing.ownerId !== req.user!.id) {
    res.status(403).json({ success: false, error: '无权修改该项目' });
    return;
  }
  const project = await projectService.update(req.params.id as string, req.body);
  res.json(successResponse(project));
}));

router.delete('/:id', requireRole('admin'), asyncHandler(async (req, res) => {
  const existing = await prisma.project.findUnique({ where: { id: req.params.id as string } });
  if (!existing) {
    res.status(404).json({ success: false, error: '项目不存在' });
    return;
  }
  if (existing.ownerId !== req.user!.id) {
    res.status(403).json({ success: false, error: '无权删除该项目' });
    return;
  }
  await projectService.delete(req.params.id as string);
  res.status(204).send();
}));

router.post('/:id/invite', requireRole('admin'), asyncHandler(async (req, res) => {
  const projectId = req.params.id as string;
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) {
    res.status(404).json({ success: false, error: '项目不存在' });
    return;
  }
  if (project.ownerId !== req.user!.id) {
    res.status(403).json({ success: false, error: '无权操作该项目' });
    return;
  }

  const permissions = parse(collaboratorPermissions, req.body ?? {});
  const suffix = crypto.randomBytes(4).toString('hex');
  const username = `viewer_${suffix}`;
  const password = crypto.randomBytes(6).toString('base64url');
  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      username,
      passwordHash,
      name: `临时用户`,
      role: 'viewer',
      projectId,
      ...permissions,
    },
  });

  res.status(201).json(successResponse({ id: user.id, username, password }));
}));

router.get('/:id/viewers', requireRole('admin'), asyncHandler(async (req, res) => {
  const projectId = req.params.id as string;
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project || project.ownerId !== req.user!.id) {
    res.status(403).json({ success: false, error: '无权访问该项目' });
    return;
  }
  const viewers = await prisma.user.findMany({
    where: { projectId, role: 'viewer' },
    select: collaboratorFields,
    orderBy: { createdAt: 'desc' },
  });
  res.json(successResponse(viewers));
}));

router.patch('/:id/viewers/:userId', requireRole('admin'), asyncHandler(async (req, res) => {
  const projectId = req.params.id as string;
  const project = await prisma.project.findUnique({ where: { id: projectId }, select: { ownerId: true } });
  if (project?.ownerId !== req.user!.id) throw new AppError('无权操作该项目', 403);

  const data = parse(collaboratorPermissions, req.body);
  if (data.canEditDocuments === undefined && data.canEditDrawings === undefined) throw AppError.badRequest('请选择要更新的协作者权限');
  const [viewer] = await prisma.user.updateManyAndReturn({
    where: { id: req.params.userId as string, projectId, role: 'viewer' },
    data,
    select: collaboratorFields,
  });
  if (!viewer) throw AppError.notFound('用户不存在');
  res.json(successResponse(viewer));
}));

router.delete('/:id/invite/:userId', requireRole('admin'), asyncHandler(async (req, res) => {
  const projectId = req.params.id as string;
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project || project.ownerId !== req.user!.id) {
    res.status(403).json({ success: false, error: '无权操作该项目' });
    return;
  }
  const deleted = await prisma.user.deleteMany({ where: { id: req.params.userId as string, projectId, role: 'viewer' } });
  if (!deleted.count) {
    res.status(404).json({ success: false, error: '用户不存在' });
    return;
  }
  res.status(204).send();
}));

export default router;
