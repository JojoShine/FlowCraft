import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { successResponse } from '../lib/response';
import { templateService } from '../services/templateService';
import { requireRole } from '../middleware/auth';
import { prisma } from '../lib/prisma';

const router = Router();

router.get('/', asyncHandler(async (req, res) => {
  const templates = await templateService.list(req.user!.id);
  res.json(successResponse(templates));
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const template = await templateService.getById(req.params.id as string);
  if (template.creatorId && template.creatorId !== req.user!.id) {
    res.status(403).json({ success: false, error: '无权访问该模版' });
    return;
  }
  res.json(successResponse(template));
}));

router.post('/', requireRole('admin'), asyncHandler(async (req, res) => {
  const template = await templateService.create({ ...req.body, creatorId: req.user!.id });
  res.status(201).json(successResponse(template));
}));

router.patch('/:id', requireRole('admin'), asyncHandler(async (req, res) => {
  const existing = await prisma.template.findUnique({ where: { id: req.params.id as string }, select: { creatorId: true } });
  if (!existing) {
    res.status(404).json({ success: false, error: '模版不存在' });
    return;
  }
  if (existing.creatorId && existing.creatorId !== req.user!.id) {
    res.status(403).json({ success: false, error: '无权修改该模版' });
    return;
  }
  const template = await templateService.update(req.params.id as string, req.body);
  res.json(successResponse(template));
}));

router.delete('/:id', requireRole('admin'), asyncHandler(async (req, res) => {
  const existing = await prisma.template.findUnique({ where: { id: req.params.id as string }, select: { creatorId: true } });
  if (!existing) {
    res.status(404).json({ success: false, error: '模版不存在' });
    return;
  }
  if (existing.creatorId && existing.creatorId !== req.user!.id) {
    res.status(403).json({ success: false, error: '无权删除该模版' });
    return;
  }
  await templateService.delete(req.params.id as string);
  res.json(successResponse({ deleted: true }));
}));

export default router;
