import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { successResponse } from '../lib/response';
import { phaseService } from '../services/phaseService';
import { requireRole, checkProjectOwnership } from '../middleware/auth';
import { prisma } from '../lib/prisma';

const router = Router();

router.get('/', asyncHandler(async (req, res) => {
  const phases = await phaseService.list(req.query.projectId as string);
  res.json(successResponse(phases));
}));

router.post('/', requireRole('admin'), asyncHandler(async (req, res) => {
  if (!(await checkProjectOwnership(req.user!, req.body.projectId))) {
    res.status(403).json({ success: false, error: '无权操作该项目' });
    return;
  }
  const phase = await phaseService.create(req.body);
  res.status(201).json(successResponse(phase));
}));

router.patch('/:id', requireRole('admin'), asyncHandler(async (req, res) => {
  const existing = await prisma.phase.findUnique({ where: { id: req.params.id as string }, select: { projectId: true } });
  if (!existing || !(await checkProjectOwnership(req.user!, existing.projectId))) {
    res.status(403).json({ success: false, error: '无权操作该项目' });
    return;
  }
  const phase = await phaseService.update(req.params.id as string, req.body);
  res.json(successResponse(phase));
}));

export default router;
