import { Router } from 'express';
import multer from 'multer';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { successResponse } from '../lib/response';
import { chatService } from '../services/chatService';
import { type ChatMessage } from '../ai/llm';
import { runAgent } from '../ai/agent';
import { prisma } from '../lib/prisma';
import {requireRole} from '../middleware/auth';
import {taskBreakdownService} from '../services/taskBreakdownService';

const router = Router();
const taskFiles=multer({storage:multer.memoryStorage(),defParamCharset:'utf8',limits:{fileSize:5*1024*1024,files:3,fields:4,fieldSize:128*1024}}).array('files',3);
const taskUpload:import('express').RequestHandler=(req,res,next)=>taskFiles(req,res,error=>{if(error instanceof multer.MulterError) return next(new AppError(error.code==='LIMIT_FILE_SIZE'?'每个附件不能超过 5 MB':'最多添加 3 个附件，上传参数无效',error.code==='LIMIT_FILE_SIZE'?413:400));next(error);});
router.post('/task-breakdown',requireRole('admin'),taskUpload,asyncHandler(async(req,res)=>{
 const files=(req.files as Express.Multer.File[]|undefined)||[];
 const controller=new AbortController();const close=()=>{if(!res.writableEnded) controller.abort();};res.on('close',close);
 try {res.json(successResponse(await taskBreakdownService.preview(req.user!,req.body,controller.signal,files)));}finally{res.off('close',close);}
}));
router.post('/task-breakdown/import',requireRole('admin'),asyncHandler(async(req,res)=>{
 res.json(successResponse(await taskBreakdownService.import(req.user!,req.body)));
}));


router.post('/chat', asyncHandler(async (req, res) => {
  const { conversationId, message, projectId, templateIds } = req.body;

  if (!message?.trim()) {
    throw AppError.badRequest('message is required');
  }

  let templateContext: string | undefined;
  if (Array.isArray(templateIds) && templateIds.length > 0) {
    const templates = await prisma.template.findMany({
      where: { id: { in: templateIds } },
      select: { name: true, content: true },
    });
    if (templates.length > 0) {
      templateContext = templates.map(t => `【${t.name}】\n${t.content}`).join('\n\n');
    }
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
    for await (const event of runAgent(message, projectId, history, templateContext)) {
      if (event.type === 'token') {
        fullContent += event.content;
        res.write(`event: token\ndata: ${JSON.stringify({ content: event.content })}\n\n`);
      } else if (event.type === 'tool_call') {
        res.write(`event: tool_call\ndata: ${JSON.stringify({ name: event.name, args: event.args, result: event.result })}\n\n`);
      }
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

router.delete('/conversations', asyncHandler(async (req, res) => {
  await chatService.clearAllConversations(req.user!.id);
  res.status(204).end();
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
