import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';

export const projectService = {
  async list() {
    return prisma.project.findMany({
      include: {
        phases: { orderBy: { order: 'asc' } },
        tasks: true,
      },
    });
  },

  async getById(id: string) {
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        phases: { orderBy: { order: 'asc' } },
        tasks: {
          orderBy: { createdAt: 'desc' },
          include: {
            artifacts: true,
            assignee: { select: { id: true, name: true } },
            phase: { select: { id: true, name: true, order: true, status: true } },
          },
        },
        artifacts: true,
      },
    });
    if (!project) throw AppError.notFound('Project not found');
    return project;
  },

  async create(data: { name: string; type: string; description?: string; ownerId?: string }) {
    if (!data.name || !data.type) {
      throw AppError.badRequest('name and type are required');
    }
    return prisma.project.create({
      data: {
        name: data.name,
        type: data.type,
        description: data.description,
        ownerId: data.ownerId || 'seed-user-id',
      },
    });
  },

  async update(id: string, data: { name?: string; type?: string; description?: string; status?: string; progress?: number; startDate?: string; endDate?: string }) {
    const existing = await prisma.project.findUnique({ where: { id } });
    if (!existing) throw AppError.notFound('Project not found');
    return prisma.project.update({
      where: { id },
      data: {
        name: data.name,
        type: data.type,
        description: data.description,
        status: data.status,
        progress: data.progress,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
      },
    });
  },

  async delete(id: string) {
    const existing = await prisma.project.findUnique({ where: { id } });
    if (!existing) throw AppError.notFound('Project not found');
    await prisma.project.delete({ where: { id } });
  },
};
