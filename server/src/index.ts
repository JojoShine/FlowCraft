import dotenv from 'dotenv';
dotenv.config();

import app from './app';
import { logger } from './lib/logger';
import { prisma } from './lib/prisma';
import { minioClient, BUCKET_NAME } from './lib/minio';
import { aiConfig } from './ai/config';
import { startScheduler } from './services/reportScheduler';
import { indexAllProjects } from './ai/indexing/orchestrator';
import { getCollectionStats } from './ai/vectorstore';
import axios from 'axios';

const PORT = process.env.PORT || 3800;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    ),
  ]);
}

async function checkDatabase(): Promise<boolean> {
  try {
    await withTimeout(prisma.$connect(), 5000, 'Database');
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
    await withTimeout(client.bucketExists(bucket), 5000, 'MinIO');
    logger.info('✓ MinIO connection successful');
    return true;
  } catch (error) {
    logger.error('✗ MinIO connection failed', { error: String(error) });
    return false;
  }
}

async function checkLLM(): Promise<boolean> {
  try {
    if (!aiConfig.deepseek.apiKey) {
      logger.warn('⚠ LLM API key not configured');
      return false;
    }
    
    await axios.get(`${aiConfig.deepseek.baseURL}/v1/models`, {
      headers: {
        'Authorization': `Bearer ${aiConfig.deepseek.apiKey}`,
      },
      timeout: 5000,
    });
    
    logger.info('✓ LLM connection successful', { model: aiConfig.deepseek.model });
    return true;
  } catch (error) {
    logger.error('✗ LLM connection failed', { error: String(error) });
    return false;
  }
}

async function autoIndexVectorStore() {
  try {
    const stats = await getCollectionStats();
    if (stats.documentCount > 0) {
      logger.info(`✓ Vector store has ${stats.documentCount} documents, skipping auto-index`);
      return;
    }
    logger.info('Vector store is empty, starting auto-index...');
    const results = await indexAllProjects();
    const total = results.reduce((sum, r) => sum + r.indexed, 0);
    logger.info(`✓ Auto-index complete: ${total} documents indexed across ${results.length} projects`);
  } catch (error) {
    logger.warn('⚠ Auto-index failed (vector store may be unavailable)', { error: String(error) });
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
    startScheduler();
    autoIndexVectorStore();
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
