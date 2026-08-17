import { Router } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { asyncHandler } from '../middleware/errorHandler';
import { successResponse } from '../lib/response';
import { projectService } from '../services/projectService';
import { requireRole } from '../middleware/auth';
import { prisma } from '../lib/prisma';

const router = Router();

router.get('/', asyncHandler(async (req, res) => {
  const projects = req.user?.role === 'viewer'
    ? await projectService.listForViewer(req.user.projectId)
    : await projectService.list();
  res.json(successResponse(projects));
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const project = (req.query.view as string) === 'summary'
    ? await projectService.getSummary(req.params.id as string)
    : await projectService.getById(req.params.id as string);
  res.json(successResponse(project));
}));

router.post('/', requireRole('admin'), asyncHandler(async (req, res) => {
  const project = await projectService.create({ ...req.body, ownerId: req.user!.id });
  res.status(201).json(successResponse(project));
}));

router.patch('/:id', requireRole('admin'), asyncHandler(async (req, res) => {
  const project = await projectService.update(req.params.id as string, req.body);
  res.json(successResponse(project));
}));

router.delete('/:id', requireRole('admin'), asyncHandler(async (req, res) => {
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
    },
  });

  res.status(201).json(successResponse({ id: user.id, username, password }));
}));

router.get('/:id/viewers', requireRole('admin'), asyncHandler(async (req, res) => {
  const projectId = req.params.id as string;
  const viewers = await prisma.user.findMany({
    where: { projectId, role: 'viewer' },
    select: { id: true, username: true, name: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json(successResponse(viewers));
}));

router.delete('/:id/invite/:userId', requireRole('admin'), asyncHandler(async (req, res) => {
  const userId = req.params.userId as string;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.role !== 'viewer') {
    res.status(404).json({ success: false, error: '用户不存在' });
    return;
  }
  await prisma.user.delete({ where: { id: userId } });
  res.status(204).send();
}));

export default router;
