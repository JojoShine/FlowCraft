import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { successResponse } from '../lib/response';
import { templateService } from '../services/templateService';

const router = Router();

router.get('/', asyncHandler(async (_req, res) => {
  const templates = await templateService.list();
  res.json(successResponse(templates));
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const template = await templateService.getById(req.params.id);
  res.json(successResponse(template));
}));

router.post('/', asyncHandler(async (req, res) => {
  const template = await templateService.create(req.body);
  res.status(201).json(successResponse(template));
}));

router.patch('/:id', asyncHandler(async (req, res) => {
  const template = await templateService.update(req.params.id, req.body);
  res.json(successResponse(template));
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  await templateService.delete(req.params.id);
  res.json(successResponse({ deleted: true }));
}));

export default router;
