import dotenv from 'dotenv';
dotenv.config();

import app from './app';
import { logger } from './lib/logger';
import { prisma } from './lib/prisma';
import { minioClient, BUCKET_NAME } from './lib/minio';
import { aiConfig } from './ai/config';
import axios from 'axios';

const PORT = process.env.PORT || 3001;

async function checkDatabase(): Promise<boolean> {
  try {
    await prisma.$connect();
    logger.info('✓ Database connection successful');
    return true;
  } catch (error) {
    logger.error('✗ Database connection failed', { error: String(error) });
    return false;
  }
}

async function checkMinIO(): Promise<boolean> {
  try {
    const client = minioClient();
    const bucket = BUCKET_NAME();
    const exists = await client.bucketExists(bucket);
    if (exists) {
      logger.info('✓ MinIO connection successful, bucket accessible');
    } else {
      logger.warn('⚠ MinIO connection successful, but bucket does not exist (will be created on first use)');
    }
    return true;
  } catch (error) {
    logger.error('✗ MinIO connection failed', { error: String(error) });
    return false;
  }
}

async function checkLLM(): Promise<boolean> {
  try {
    if (!aiConfig.apiKey) {
      logger.warn('⚠ LLM API key not configured');
      return false;
    }
    
    await axios.get(`${aiConfig.baseURL}/v1/models`, {
      headers: {
        'Authorization': `Bearer ${aiConfig.apiKey}`,
      },
      timeout: 5000,
    });
    
    logger.info('✓ LLM connection successful', { model: aiConfig.model });
    return true;
  } catch (error) {
    logger.error('✗ LLM connection failed', { error: String(error) });
    return false;
  }
}

async function startServer() {
  logger.info('Running startup health checks...');
  
  const [dbOk, minioOk, llmOk] = await Promise.all([
    checkDatabase(),
    checkMinIO(),
    checkLLM(),
  ]);
  
  if (!dbOk) {
    logger.error('Cannot start server: database connection failed');
    process.exit(1);
  }
  
  const server = app.listen(PORT, () => {
    logger.info(`Server started on port ${PORT}`, { env: process.env.NODE_ENV || 'development' });
    logger.info('Service status', {
      database: dbOk ? '✓' : '✗',
      minio: minioOk ? '✓' : '✗',
      llm: llmOk ? '✓' : '✗',
    });
  });

  process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully');
    server.close(() => {
      logger.info('Server closed');
      process.exit(0);
    });
  });

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled rejection', { reason: String(reason) });
  });
}

startServer();
