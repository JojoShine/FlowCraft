import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { successResponse } from '../lib/response';
import { reportService } from '../services/reportService';
import { requireRole, checkProjectOwnership } from '../middleware/auth';
import { prisma } from '../lib/prisma';

const router = Router();

router.get('/', asyncHandler(async (req, res) => {
  const { projectId, type, year, month } = req.query;
  const reports = await reportService.list({
    projectId: projectId as string,
    type: type as string,
    year: year ? Number(year) : undefined,
    month: month ? Number(month) : undefined,
    ownerId: req.user!.id,
  });
  res.json(successResponse(reports));
}));

router.post('/generate', requireRole('admin'), asyncHandler(async (req, res) => {
  const { type, projectId, date, weekStart } = req.body;
  if (!(await checkProjectOwnership(req.user!, projectId))) {
    res.status(403).json({ success: false, error: '无权操作该项目' });
    return;
  }
  const report = await reportService.generate({ type, projectId, date, weekStart });
  res.status(201).json(successResponse(report));
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const report = await reportService.getById(req.params.id as string);
  if (!(await checkProjectOwnership(req.user!, report.projectId))) {
    res.status(403).json({ success: false, error: '无权访问该汇报' });
    return;
  }
  res.json(successResponse(report));
}));

router.post('/', requireRole('admin'), asyncHandler(async (req, res) => {
  if (!(await checkProjectOwnership(req.user!, req.body.projectId))) {
    res.status(403).json({ success: false, error: '无权操作该项目' });
    return;
  }
  const report = await reportService.create(req.body);
  res.status(201).json(successResponse(report));
}));

router.delete('/:id', requireRole('admin'), asyncHandler(async (req, res) => {
  const existing = await prisma.report.findUnique({ where: { id: req.params.id as string }, select: { projectId: true } });
  if (!existing || !(await checkProjectOwnership(req.user!, existing.projectId))) {
    res.status(403).json({ success: false, error: '无权操作该汇报' });
    return;
  }
  await reportService.delete(req.params.id as string);
  res.status(204).send();
}));

export default router;
