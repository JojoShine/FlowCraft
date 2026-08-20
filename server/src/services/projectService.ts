import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';

export const projectService = {
  async list(ownerId: string) {
    return prisma.project.findMany({
      where: { ownerId },
      include: {
        phases: { orderBy: { order: 'asc' } },
      },
    });
  },

  async listForViewer(projectId: string | null) {
    if (!projectId) return [];
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        phases: { orderBy: { order: 'asc' } },
      },
    });
    return project ? [project] : [];
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
            phase: { select: { id: true, name: true, order: true } },
          },
        },
        artifacts: true,
      },
    });
    if (!project) throw AppError.notFound('Project not found');
    return project;
  },

  async getSummary(id: string) {
    const project = await prisma.project.findUnique({
      where: { id },
      select: {
        id: true, name: true, type: true, description: true,
        status: true, startDate: true, endDate: true,
        ownerId: true, createdAt: true, updatedAt: true,
        phases: {
          orderBy: { order: 'asc' },
          include: { _count: { select: { tasks: true } } },
        },
      },
    });
    if (!project) throw AppError.notFound('Project not found');
    return project;
  },

  async create(data: { name: string; type: string; description?: string; ownerId: string }) {
    if (!data.name || !data.type) {
      throw AppError.badRequest('name and type are required');
    }

    const DEFAULT_PHASES = [
      '项目线索', '调研梳理', '方案设计', '原型设计',
      '开发实施', '测试交付', '复盘归档',
    ];

    return prisma.$transaction(async (tx) => {
      const project = await tx.project.create({
        data: {
          name: data.name,
          type: data.type,
          description: data.description,
          ownerId: data.ownerId,
        },
      });

      await tx.phase.createMany({
        data: DEFAULT_PHASES.map((name, i) => ({
          name,
          order: i,
          projectId: project.id,
        })),
      });

      return tx.project.findUnique({
        where: { id: project.id },
        include: { phases: { orderBy: { order: 'asc' } } },
      }) as Promise<typeof project & { phases: any[] }>;
    });
  },

  async update(id: string, data: { name?: string; type?: string; description?: string; status?: string; startDate?: string; endDate?: string }) {
    const existing = await prisma.project.findUnique({ where: { id } });
    if (!existing) throw AppError.notFound('Project not found');

    return prisma.project.update({
      where: { id },
      data: {
        name: data.name,
        type: data.type,
        description: data.description,
        status: data.status,
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
