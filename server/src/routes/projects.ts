import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { successResponse } from '../lib/response';
import { projectService } from '../services/projectService';

const router = Router();

router.get('/', asyncHandler(async (_req, res) => {
  const projects = await projectService.list();
  res.json(successResponse(projects));
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const project = await projectService.getById(req.params.id);
  res.json(successResponse(project));
}));

router.post('/', asyncHandler(async (req, res) => {
  const project = await projectService.create(req.body);
  res.status(201).json(successResponse(project));
}));

router.patch('/:id', asyncHandler(async (req, res) => {
  const project = await projectService.update(req.params.id, req.body);
  res.json(successResponse(project));
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  await projectService.delete(req.params.id);
  res.status(204).send();
}));

export default router;
