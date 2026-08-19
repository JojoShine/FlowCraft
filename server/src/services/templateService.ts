import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';

export const templateService = {
  async list(creatorId?: string) {
    const where: Record<string, unknown> = {};
    if (creatorId) where.creatorId = creatorId;
    return prisma.template.findMany({ where, orderBy: { updatedAt: 'desc' } });
  },

  async getById(id: string) {
    const template = await prisma.template.findUnique({ where: { id } });
    if (!template) throw AppError.notFound('Template not found');
    return template;
  },

  async create(data: { name: string; category: string; description?: string; content: string; fileType?: string; creatorId?: string }) {
    if (!data.name || !data.category || !data.content) {
      throw AppError.badRequest('name, category, and content are required');
    }
    return prisma.template.create({
      data: {
        name: data.name,
        category: data.category,
        description: data.description,
        content: data.content,
        fileType: data.fileType || 'html',
        creatorId: data.creatorId,
      },
    });
  },

  async update(id: string, data: { name?: string; category?: string; description?: string; content?: string; fileType?: string; usageCount?: number }) {
    const existing = await prisma.template.findUnique({ where: { id } });
    if (!existing) throw AppError.notFound('Template not found');
    return prisma.template.update({
      where: { id },
      data: {
        name: data.name,
        category: data.category,
        description: data.description,
        content: data.content,
        fileType: data.fileType,
        usageCount: data.usageCount,
      },
    });
  },

  async delete(id: string) {
    const existing = await prisma.template.findUnique({ where: { id } });
    if (!existing) throw AppError.notFound('Template not found');
    return prisma.template.delete({ where: { id } });
  },
};
