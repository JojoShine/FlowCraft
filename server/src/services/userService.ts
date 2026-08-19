import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';

const safeUserSelect = {
  id: true, username: true, name: true, email: true, avatarUrl: true, role: true, createdAt: true,
} as const;

export const userService = {
  async list() {
    return prisma.user.findMany({
      select: safeUserSelect,
    });
  },

  async getById(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: safeUserSelect,
    });
    if (!user) throw AppError.notFound('User not found');
    return user;
  },
};
