import { Request, Response, NextFunction } from 'express';
import { logger } from '../lib/logger';

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.http(req.method, req.path, res.statusCode, duration, {
      query: Object.keys(req.query).length > 0 ? req.query : undefined,
      userAgent: req.get('user-agent'),
    });
  });

  next();
}