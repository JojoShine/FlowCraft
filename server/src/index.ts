import dotenv from 'dotenv';
dotenv.config();

import app from './app';
import { logger } from './lib/logger';

const PORT = process.env.PORT || 3001;

const server = app.listen(PORT, () => {
  logger.info(`Server started on port ${PORT}`, { env: process.env.NODE_ENV || 'development' });
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
