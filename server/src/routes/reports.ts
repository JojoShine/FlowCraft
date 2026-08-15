import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { successResponse } from '../lib/response';
import { reportService } from '../services/reportService';

const router = Router();

router.get('/', asyncHandler(async (req, res) => {
  const { projectId, type, year, month } = req.query;
  const reports = await reportService.list({
    projectId: projectId as string,
    type: type as string,
    year: year ? Number(year) : undefined,
    month: month ? Number(month) : undefined,
  });
  res.json(successResponse(reports));
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const report = await reportService.getById(req.params.id);
  res.json(successResponse(report));
}));

router.post('/', asyncHandler(async (req, res) => {
  const report = await reportService.create(req.body);
  res.status(201).json(successResponse(report));
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  await reportService.delete(req.params.id);
  res.status(204).send();
}));

export default router;
