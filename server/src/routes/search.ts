import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { asyncHandler } from '../middleware/errorHandler';
import { successResponse } from '../lib/response';

const router = Router();

router.get('/', asyncHandler(async (req, res) => {
  const q = (req.query.q as string || '').trim();
  const projectId = req.query.projectId as string | undefined;
  const userId = req.user!.id;

  if (!q) {
    return res.json(successResponse({ tasks: [], artifacts: [], templates: [] }));
  }

  const projectFilter = projectId
    ? { projectId }
    : req.user!.role === 'viewer'
      ? (req.user!.projectId ? { projectId: req.user!.projectId } : { projectId: '__none__' })
      : { project: { ownerId: userId } };

  const like = { contains: q };

  const [tasks, artifacts, templates] = await Promise.all([
    prisma.task.findMany({
      where: { ...projectFilter, OR: [{ title: like }, { description: like }] },
      select: { id: true, title: true, type: true, status: true, column: true, projectId: true, project: { select: { name: true } } },
      take: 10,
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.artifact.findMany({
      where: { ...projectFilter, name: like },
      select: { id: true, name: true, type: true, status: true, projectId: true, project: { select: { name: true } } },
      take: 10,
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.template.findMany({
      where: { creatorId: userId, OR: [{ name: like }, { description: like }] },
      select: { id: true, name: true, category: true, description: true, fileType: true },
      take: 10,
      orderBy: { updatedAt: 'desc' },
    }),
  ]);

  res.json(successResponse({ tasks, artifacts, templates }));
}));

export default router;
