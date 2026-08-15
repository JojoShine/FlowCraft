import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';

export const userService = {
  async list() {
    return prisma.user.findMany();
  },

  async getById(id: string) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw AppError.notFound('User not found');
    return user;
  },
};
