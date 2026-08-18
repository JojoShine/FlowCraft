import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { successResponse } from '../lib/response';
import { taskService } from '../services/taskService';
import { requireRole, scopeViewer } from '../middleware/auth';

const router = Router();

router.get('/count', scopeViewer(), asyncHandler(async (req, res) => {
  const projectId = req.query.projectId as string;
  if (!projectId) {
    res.status(400).json({ error: 'projectId required' });
    return;
  }
  const count = await taskService.countByProject(projectId);
  res.json(successResponse(count));
}));

router.get('/', scopeViewer(), asyncHandler(async (req, res) => {
  const { projectId, column, phaseId } = req.query;
  const tasks = phaseId
    ? await taskService.listForPhase(phaseId as string)
    : await taskService.list({
        projectId: projectId as string,
        column: column as string,
      });
  res.json(successResponse(tasks));
}));

router.get('/options', scopeViewer(), asyncHandler(async (req, res) => {
  const projectId = req.query.projectId as string;
  if (!projectId) {
    res.status(400).json({ error: 'projectId required' });
    return;
  }
  const options = await taskService.listOptions(projectId);
  res.json(successResponse(options));
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const task = await taskService.getById(req.params.id as string);
  res.json(successResponse(task));
}));

router.post('/', requireRole('admin'), asyncHandler(async (req, res) => {
  const task = await taskService.create(req.body);
  res.status(201).json(successResponse(task));
}));

router.patch('/:id', requireRole('admin'), asyncHandler(async (req, res) => {
  const task = await taskService.update(req.params.id as string, req.body);
  res.json(successResponse(task));
}));

router.delete('/:id', requireRole('admin'), asyncHandler(async (req, res) => {
  await taskService.delete(req.params.id as string);
  res.status(204).send();
}));

export default router;
