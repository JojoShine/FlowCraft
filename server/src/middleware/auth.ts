import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; name: string | null; email: string | null; avatarUrl: string | null; role: string; projectId: string | null };
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  let token: string | undefined;

  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.slice(7);
  } else if (typeof req.query.token === 'string' && req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    res.status(401).json({ success: false, error: '未登录' });
    return;
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: string };
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, name: true, email: true, avatarUrl: true, role: true, projectId: true },
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

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ success: false, error: '无权限' });
      return;
    }
    next();
  };
}

export async function checkProjectOwnership(user: { id: string; role: string; projectId: string | null }, projectId: string): Promise<boolean> {
  if (user.role === 'viewer') return user.projectId === projectId;
  const project = await prisma.project.findUnique({ where: { id: projectId }, select: { ownerId: true } });
  return project?.ownerId === user.id;
}

export function scopeProject() {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      next();
      return;
    }
    if (req.user.role === 'viewer') {
      if (req.user.projectId) {
        req.query.projectId = req.user.projectId;
      }
      next();
      return;
    }
    const projectId = req.query.projectId as string | undefined;
    if (projectId) {
      const owned = await checkProjectOwnership(req.user, projectId);
      if (!owned) {
        res.status(403).json({ success: false, error: '无权访问该项目' });
        return;
      }
    }
    next();
  };
}
