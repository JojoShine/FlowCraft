import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { successResponse } from '../lib/response';
import { taskService } from '../services/taskService';

const router = Router();

router.get('/', asyncHandler(async (req, res) => {
  const { projectId, column } = req.query;
  const tasks = await taskService.list({
    projectId: projectId as string,
    column: column as string,
  });
  res.json(successResponse(tasks));
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const task = await taskService.getById(req.params.id);
  res.json(successResponse(task));
}));

router.post('/', asyncHandler(async (req, res) => {
  const task = await taskService.create(req.body);
  res.status(201).json(successResponse(task));
}));

router.patch('/:id', asyncHandler(async (req, res) => {
  const task = await taskService.update(req.params.id, req.body);
  res.json(successResponse(task));
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  await taskService.delete(req.params.id);
  res.status(204).send();
}));

export default router;
