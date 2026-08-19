import { Router } from 'express';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { successResponse } from '../lib/response';
import { chatService } from '../services/chatService';
import { chatStream, type ChatMessage } from '../ai/llm';
import { prisma } from '../lib/prisma';

const router = Router();

router.post('/chat', asyncHandler(async (req, res) => {
  const { conversationId, message, projectId } = req.body;

  if (!message?.trim()) {
    throw AppError.badRequest('message is required');
  }

  let convId = conversationId;
  if (!convId) {
    const conv = await chatService.createConversation(projectId, req.user!.id);
    convId = conv.id;
    const title = message.length > 30 ? message.slice(0, 30) + '...' : message;
    await chatService.updateConversationTitle(convId, title);
  }

  await chatService.addUserMessage(convId, message);

  const conversation = await chatService.getConversation(convId);
  const history: ChatMessage[] = conversation.messages.map(m => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }));

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  let fullContent = '';

  try {
    for await (const token of chatStream(history)) {
      fullContent += token;
      res.write(`event: token\ndata: ${JSON.stringify({ content: token })}\n\n`);
    }

    const assistantMsg = await chatService.addAssistantMessage(convId, fullContent);

    res.write(`event: done\ndata: ${JSON.stringify({ messageId: assistantMsg.id, conversationId: convId })}\n\n`);
  } catch (err: any) {
    res.write(`event: error\ndata: ${JSON.stringify({ error: err.message || '生成失败' })}\n\n`);
  }

  res.end();
}));

router.get('/conversations', asyncHandler(async (req, res) => {
  const projectId = req.query.projectId as string | undefined;
  const conversations = await chatService.listConversations(projectId, req.user!.id);
  res.json(successResponse(conversations));
}));

router.post('/conversations', asyncHandler(async (req, res) => {
  const { projectId } = req.body;
  const conversation = await chatService.createConversation(projectId, req.user!.id);
  res.status(201).json(successResponse(conversation));
}));

router.get('/conversations/:id', asyncHandler(async (req, res) => {
  const conversation = await chatService.getConversation(req.params.id as string);
  if (conversation.userId && conversation.userId !== req.user!.id) {
    res.status(403).json({ success: false, error: '无权访问该对话' });
    return;
  }
  res.json(successResponse(conversation));
}));

router.delete('/conversations/:id', asyncHandler(async (req, res) => {
  const conversation = await prisma.conversation.findUnique({
    where: { id: req.params.id as string },
    select: { userId: true },
  });
  if (!conversation || (conversation.userId && conversation.userId !== req.user!.id)) {
    res.status(403).json({ success: false, error: '无权操作该对话' });
    return;
  }
  await chatService.deleteConversation(req.params.id as string);
  res.status(204).end();
}));

export default router;
