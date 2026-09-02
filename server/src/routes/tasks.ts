import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { successResponse } from '../lib/response';
import { taskService } from '../services/taskService';
import { requireRole, checkProjectOwnership } from '../middleware/auth';
import { prisma } from '../lib/prisma';

const router = Router();

router.get('/count', asyncHandler(async (req, res) => {
  const projectId = req.query.projectId as string;
  if (!projectId) {
    res.status(400).json({ error: 'projectId required' });
    return;
  }
  if (!(await checkProjectOwnership(req.user!, projectId))) {
    res.status(403).json({ success: false, error: '无权访问该项目' });
    return;
  }
  const count = await taskService.countByProject(projectId);
  res.json(successResponse(count));
}));

router.get('/overdue-count', asyncHandler(async (req, res) => {
  const userProjects = req.user?.role === 'viewer'
    ? (req.user?.projectId ? [req.user.projectId] : [])
    : (await prisma.project.findMany({ where: { ownerId: req.user!.id }, select: { id: true } })).map((p: { id: string }) => p.id);
  const map = await taskService.countOverdueByProject(userProjects);
  res.json(successResponse(map));
}));

router.get('/overdue', asyncHandler(async (req, res) => {
  const projectId = req.query.projectId as string;
  if (!projectId) {
    res.status(400).json({ error: 'projectId required' });
    return;
  }
  if (!(await checkProjectOwnership(req.user!, projectId))) {
    res.status(403).json({ success: false, error: '无权访问该项目' });
    return;
  }
  const tasks = await taskService.listOverdue(projectId);
  res.json(successResponse(tasks));
}));

router.get('/', asyncHandler(async (req, res) => {
  const { projectId, column, phaseId } = req.query;
  if (phaseId) {
    const phase = await prisma.phase.findUnique({ where: { id: phaseId as string }, select: { projectId: true } });
    if (!phase || !(await checkProjectOwnership(req.user!, phase.projectId))) {
      res.status(403).json({ success: false, error: '无权访问该项目' });
      return;
    }
    const tasks = await taskService.listForPhase(phaseId as string);
    res.json(successResponse(tasks));
    return;
  }
  const tasks = await taskService.list({
    projectId: projectId as string,
    column: column as string,
    ownerId: req.user!.id,
  });
  res.json(successResponse(tasks));
}));

router.get('/options', asyncHandler(async (req, res) => {
  const projectId = req.query.projectId as string;
  if (!projectId) {
    res.status(400).json({ error: 'projectId required' });
    return;
  }
  if (!(await checkProjectOwnership(req.user!, projectId))) {
    res.status(403).json({ success: false, error: '无权访问该项目' });
    return;
  }
  const options = await taskService.listOptions(projectId);
  res.json(successResponse(options));
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const task = await taskService.getById(req.params.id as string);
  if (!(await checkProjectOwnership(req.user!, task.projectId))) {
    res.status(403).json({ success: false, error: '无权访问该项目' });
    return;
  }
  res.json(successResponse(task));
}));

router.post('/', requireRole('admin'), asyncHandler(async (req, res) => {
  if (!(await checkProjectOwnership(req.user!, req.body.projectId))) {
    res.status(403).json({ success: false, error: '无权操作该项目' });
    return;
  }
  const task = await taskService.create(req.body);
  res.status(201).json(successResponse(task));
}));

router.patch('/:id', requireRole('admin'), asyncHandler(async (req, res) => {
  const existing = await prisma.task.findUnique({ where: { id: req.params.id as string }, select: { projectId: true } });
  if (!existing || !(await checkProjectOwnership(req.user!, existing.projectId))) {
    res.status(403).json({ success: false, error: '无权操作该项目' });
    return;
  }
  const task = await taskService.update(req.params.id as string, req.body);
  res.json(successResponse(task));
}));

router.delete('/:id', requireRole('admin'), asyncHandler(async (req, res) => {
  const existing = await prisma.task.findUnique({ where: { id: req.params.id as string }, select: { projectId: true } });
  if (!existing || !(await checkProjectOwnership(req.user!, existing.projectId))) {
    res.status(403).json({ success: false, error: '无权操作该项目' });
    return;
  }
  await taskService.delete(req.params.id as string);
  res.status(204).send();
}));

export default router;
