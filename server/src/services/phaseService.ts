import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';

export const phaseService = {
  async list(projectId?: string) {
    const where: Record<string, unknown> = {};
    if (projectId) where.projectId = projectId;

    return prisma.phase.findMany({
      where,
      orderBy: { order: 'asc' },
      include: {
        _count: { select: { tasks: true } },
      },
    });
  },

  async create(data: {
    projectId: string;
    name: string;
    order: number;
    startDate?: string;
    endDate?: string;
  }) {
    if (!data.projectId || !data.name || data.order === undefined) {
      throw AppError.badRequest('projectId, name, and order are required');
    }
    return prisma.phase.create({
      data: {
        projectId: data.projectId,
        name: data.name,
        order: data.order,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
      },
    });
  },

  async update(id: string, data: {
    name?: string;
    order?: number;
    startDate?: string;
    endDate?: string;
  }) {
    const existing = await prisma.phase.findUnique({ where: { id } });
    if (!existing) throw AppError.notFound('Phase not found');
    return prisma.phase.update({
      where: { id },
      data: {
        name: data.name,
        order: data.order,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
      },
    });
  },
};
