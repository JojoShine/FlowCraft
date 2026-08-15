import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { utc8MonthRange } from '../lib/timezone';

export const reportService = {
  async list(filters?: { projectId?: string; type?: string; year?: number; month?: number }) {
    const where: Record<string, unknown> = {};
    if (filters?.projectId) where.projectId = filters.projectId;
    if (filters?.type) where.type = filters.type;
    if (filters?.year && filters?.month) {
      const { start, end } = utc8MonthRange(filters.year, filters.month);
      where.date = { gte: start, lte: end };
    }
    return prisma.report.findMany({ where, orderBy: { date: 'desc' } });
  },

  async getById(id: string) {
    const report = await prisma.report.findUnique({ where: { id } });
    if (!report) throw AppError.notFound('Report not found');
    return report;
  },

  async create(data: { type: string; label: string; content: string; date: string; projectId: string }) {
    if (!data.type || !data.label || !data.content || !data.date || !data.projectId) {
      throw AppError.badRequest('type, label, content, date, and projectId are required');
    }
    return prisma.report.create({
      data: {
        type: data.type,
        label: data.label,
        content: data.content,
        date: new Date(data.date),
        projectId: data.projectId,
      },
    });
  },

  async delete(id: string) {
    const existing = await prisma.report.findUnique({ where: { id } });
    if (!existing) throw AppError.notFound('Report not found');
    await prisma.report.delete({ where: { id } });
  },
};
