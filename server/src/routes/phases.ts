import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { successResponse } from '../lib/response';
import { phaseService } from '../services/phaseService';

const router = Router();

router.get('/', asyncHandler(async (req, res) => {
  const phases = await phaseService.list(req.query.projectId as string);
  res.json(successResponse(phases));
}));

router.post('/', asyncHandler(async (req, res) => {
  const phase = await phaseService.create(req.body);
  res.status(201).json(successResponse(phase));
}));

router.patch('/:id', asyncHandler(async (req, res) => {
  const phase = await phaseService.update(req.params.id, req.body);
  res.json(successResponse(phase));
}));

export default router;
