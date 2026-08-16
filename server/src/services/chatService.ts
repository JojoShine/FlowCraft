import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';

export const chatService = {
  async createConversation(projectId?: string, userId?: string) {
    return prisma.conversation.create({
      data: { projectId, userId },
    });
  },

  async listConversations(projectId?: string) {
    const where: Record<string, unknown> = {};
    if (projectId) where.projectId = projectId;

    return prisma.conversation.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: { _count: { select: { messages: true } } },
    });
  },

  async getConversation(id: string) {
    const conversation = await prisma.conversation.findUnique({
      where: { id },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
    if (!conversation) throw AppError.notFound('Conversation not found');
    return conversation;
  },

  async deleteConversation(id: string) {
    const existing = await prisma.conversation.findUnique({ where: { id } });
    if (!existing) throw AppError.notFound('Conversation not found');
    await prisma.conversation.delete({ where: { id } });
  },

  async addUserMessage(conversationId: string, content: string) {
    return prisma.message.create({
      data: { conversationId, role: 'user', content },
    });
  },

  async addAssistantMessage(conversationId: string, content: string) {
    return prisma.message.create({
      data: { conversationId, role: 'assistant', content },
    });
  },

  async updateConversationTitle(id: string, title: string) {
    return prisma.conversation.update({ where: { id }, data: { title } });
  },
};
