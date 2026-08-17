import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { successResponse } from '../lib/response';
import { reportService } from '../services/reportService';
import { requireRole, scopeViewer } from '../middleware/auth';

const router = Router();

router.get('/', scopeViewer(), asyncHandler(async (req, res) => {
  const { projectId, type, year, month } = req.query;
  const reports = await reportService.list({
    projectId: projectId as string,
    type: type as string,
    year: year ? Number(year) : undefined,
    month: month ? Number(month) : undefined,
  });
  res.json(successResponse(reports));
}));

router.post('/generate', requireRole('admin'), asyncHandler(async (req, res) => {
  const { type, projectId, date, weekStart } = req.body;
  const report = await reportService.generate({ type, projectId, date, weekStart });
  res.status(201).json(successResponse(report));
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const report = await reportService.getById(req.params.id as string);
  res.json(successResponse(report));
}));

router.post('/', requireRole('admin'), asyncHandler(async (req, res) => {
  const report = await reportService.create(req.body);
  res.status(201).json(successResponse(report));
}));

router.delete('/:id', requireRole('admin'), asyncHandler(async (req, res) => {
  await reportService.delete(req.params.id as string);
  res.status(204).send();
}));

export default router;
