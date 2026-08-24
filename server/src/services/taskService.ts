import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';

export const taskService = {
  async countByProject(projectId: string) {
    const grouped = await prisma.task.groupBy({
      by: ['column'],
      where: { projectId },
      _count: { id: true },
    });
    const total = grouped.reduce((sum, t) => sum + t._count.id, 0);
    return { total, byColumn: Object.fromEntries(grouped.map(t => [t.column, t._count.id])) };
  },

  async countOverdueByProject(projectIds: string[]) {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const tasks = await prisma.task.findMany({
      where: {
        status: { not: 'completed' },
        dueDate: { not: null, lt: startOfToday },
        projectId: { in: projectIds },
      },
      select: { projectId: true },
    });
    const map: Record<string, number> = {};
    for (const t of tasks) {
      map[t.projectId] = (map[t.projectId] || 0) + 1;
    }
    return map;
  },

  async list(filters?: { projectId?: string; column?: string; ownerId?: string }) {
    const where: Record<string, unknown> = {};
    if (filters?.projectId) where.projectId = filters.projectId;
    if (filters?.column) where.column = filters.column;
    if (filters?.ownerId && !filters?.projectId) where.project = { ownerId: filters.ownerId };

    const tasks = await prisma.task.findMany({
      where,
      include: {
        phase: { select: { id: true, name: true, order: true } },
        assignee: { select: { id: true, name: true } },
      },
    });

    return tasks.sort((a, b) => {
      const aDone = a.column === 'done' || a.status === 'completed';
      const bDone = b.column === 'done' || b.status === 'completed';
      if (aDone !== bDone) return aDone ? 1 : -1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  },

  async listOptions(projectId: string) {
    return prisma.task.findMany({
      where: { projectId },
      select: { id: true, title: true },
      orderBy: { createdAt: 'desc' },
    });
  },

  async listForPhase(phaseId: string) {
    const tasks = await prisma.task.findMany({
      where: { phaseId },
      include: {
        phase: { select: { id: true, name: true, order: true } },
        assignee: { select: { id: true, name: true } },
        artifacts: {
          select: {
            id: true, name: true, type: true, status: true,
            filePath: true, content: true, shareToken: true, taskId: true, projectId: true,
            creatorId: true, createdAt: true, updatedAt: true,
          },
        },
      },
    });

    return tasks.sort((a, b) => {
      const aCompleted = a.status === 'completed';
      const bCompleted = b.status === 'completed';

      if (aCompleted !== bCompleted) {
        return aCompleted ? 1 : -1;
      }

      const aDue = a.dueDate ? new Date(a.dueDate).getTime() : 0;
      const bDue = b.dueDate ? new Date(b.dueDate).getTime() : 0;
      return bDue - aDue;
    });
  },

  async getById(id: string) {
    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        phase: { select: { id: true, name: true, order: true } },
        assignee: { select: { id: true, name: true } },
        artifacts: true,
      },
    });
    if (!task) throw AppError.notFound('Task not found');
    return task;
  },

  async create(data: {
    title: string;
    type: string;
    projectId: string;
    description?: string;
    priority?: string;
    status?: string;
    dueDate?: string;
    startDate?: string;
    phaseId?: string;
    assigneeId?: string;
    column?: string;
  }) {
    if (!data.title || !data.type || !data.projectId) {
      throw AppError.badRequest('title, type, and projectId are required');
    }
    const isCompleted = data.column === 'done' || data.status === 'completed';
    return prisma.task.create({
      data: {
        title: data.title,
        description: data.description,
        type: data.type,
        priority: data.priority || 'med',
        status: data.status || 'todo',
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        projectId: data.projectId,
        phaseId: data.phaseId,
        assigneeId: data.assigneeId,
        column: data.column || 'todo',
        completedAt: isCompleted ? new Date() : undefined,
      },
    });
  },

  async update(id: string, data: {
    title?: string;
    description?: string;
    type?: string;
    priority?: string;
    status?: string;
    dueDate?: string;
    startDate?: string;
    phaseId?: string | null;
    assigneeId?: string | null;
    column?: string;
  }) {
    const existing = await prisma.task.findUnique({ where: { id } });
    if (!existing) throw AppError.notFound('Task not found');

    let resolvedStatus = data.status;
    if (!data.status && data.column && data.column !== existing.column) {
      resolvedStatus = data.column === 'done' ? 'completed' : 'todo';
    }

    const isCompleting = resolvedStatus === 'completed' && existing.status !== 'completed';
    const isUncompleting = resolvedStatus && resolvedStatus !== 'completed' && existing.status === 'completed';

    return prisma.task.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        type: data.type,
        priority: data.priority,
        status: resolvedStatus,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        phaseId: data.phaseId,
        assigneeId: data.assigneeId,
        column: data.column,
        completedAt: isCompleting ? new Date() : isUncompleting ? null : undefined,
      },
    });
  },

  async delete(id: string) {
    const existing = await prisma.task.findUnique({ where: { id } });
    if (!existing) throw AppError.notFound('Task not found');
    await prisma.task.delete({ where: { id } });
  },
};
