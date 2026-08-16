import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; name: string | null; email: string | null; avatarUrl: string | null };
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: '未登录' });
    return;
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: string };
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, name: true, email: true, avatarUrl: true },
    });
    if (!user) {
      res.status(401).json({ success: false, error: '用户不存在' });
      return;
    }
    req.user = user;
    next();
  } catch {
    res.status(401).json({ success: false, error: '登录已过期' });
  }
}
