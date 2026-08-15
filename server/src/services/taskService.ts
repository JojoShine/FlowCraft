import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';

export const taskService = {
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

    const isCompleting = data.status === 'completed' || data.column === 'done';
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
