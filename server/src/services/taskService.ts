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

  async countOverdueByProject() {
    const now = new Date();
    const tasks = await prisma.task.findMany({
      where: {
        column: { not: 'done' },
        dueDate: { not: null, lt: now },
      },
      select: { projectId: true },
    });
    const map: Record<string, number> = {};
    for (const t of tasks) {
      map[t.projectId] = (map[t.projectId] || 0) + 1;
    }
    return map;
  },

  async list(filters?: { projectId?: string; column?: string }) {
    const where: Record<string, unknown> = {};
    if (filters?.projectId) where.projectId = filters.projectId;
    if (filters?.column) where.column = filters.column;

    return prisma.task.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        phase: { select: { id: true, name: true, order: true, status: true } },
        assignee: { select: { id: true, name: true } },
      },
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
        phase: { select: { id: true, name: true, order: true, status: true } },
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
        phase: { select: { id: true, name: true, order: true, status: true } },
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

    const isCompleting = (data.status === 'completed' || data.column === 'done') &&
                         existing.status !== 'completed' && existing.column !== 'done';
    const isUncompleting = (data.status && data.status !== 'completed' && existing.status === 'completed') ||
                           (data.column && data.column !== 'done' && existing.column === 'done');

    return prisma.task.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        type: data.type,
        priority: data.priority,
        status: data.status,
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
