import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { successResponse } from '../lib/response';
import { phaseService } from '../services/phaseService';
import { requireRole, scopeViewer } from '../middleware/auth';

const router = Router();

router.get('/', scopeViewer(), asyncHandler(async (req, res) => {
  const phases = await phaseService.list(req.query.projectId as string);
  res.json(successResponse(phases));
}));

router.post('/', requireRole('admin'), asyncHandler(async (req, res) => {
  const phase = await phaseService.create(req.body);
  res.status(201).json(successResponse(phase));
}));

router.patch('/:id', requireRole('admin'), asyncHandler(async (req, res) => {
  const phase = await phaseService.update(req.params.id as string, req.body);
  res.json(successResponse(phase));
}));

export default router;
