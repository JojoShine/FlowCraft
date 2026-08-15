import { Request, Response, NextFunction } from 'express';
import { logger } from '../lib/logger';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, AppError.prototype);
  }

  static badRequest(message: string) {
    return new AppError(message, 400);
  }

  static notFound(message: string) {
    return new AppError(message, 404);
  }

  static conflict(message: string) {
    return new AppError(message, 409);
  }

  static internal(message: string = 'Internal server error') {
    return new AppError(message, 500, false);
  }
}

export type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<void | Response>;

export function asyncHandler(fn: AsyncHandler) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export function notFoundHandler(req: Request, _res: Response, next: NextFunction) {
  next(AppError.notFound(`Route not found: ${req.method} ${req.path}`));
}

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    logger.warn(`[${req.method}] ${req.path} -> ${err.statusCode}: ${err.message}`, {
      path: req.path,
      method: req.method,
      statusCode: err.statusCode,
    });

    return res.status(err.statusCode).json({
      success: false,
      error: {
        message: err.message,
        code: err.statusCode,
      },
    });
  }

  logger.error(`Unhandled error: ${err.message}`, {
    path: req.path,
    method: req.method,
    stack: err.stack,
  });

  return res.status(500).json({
    success: false,
    error: {
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
      code: 500,
    },
  });
}
