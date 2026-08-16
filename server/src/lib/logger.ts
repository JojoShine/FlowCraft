import fs from 'fs';
import path from 'path';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const currentLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';

const LOG_DIR = path.join(process.cwd(), 'logs');

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

function getLogFileName(level?: 'error'): string {
  const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const suffix = level === 'error' ? '.error' : '';
  return path.join(LOG_DIR, `${date}${suffix}.log`);
}

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel];
}

function formatMessage(level: LogLevel, message: string, meta?: Record<string, unknown>): string {
  const timestamp = new Date().toISOString();
  const base = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
  if (meta && Object.keys(meta).length > 0) {
    return `${base} ${JSON.stringify(meta)}`;
  }
  return base;
}

function writeToFile(formattedMessage: string, level?: LogLevel): void {
  try {
    const logFile = getLogFileName();
    fs.appendFileSync(logFile, formattedMessage + '\n');
    
    if (level === 'error') {
      const errorLogFile = getLogFileName('error');
      fs.appendFileSync(errorLogFile, formattedMessage + '\n');
    }
  } catch (err) {
    console.error('Failed to write to log file:', err);
  }
}

export const logger = {
  debug(message: string, meta?: Record<string, unknown>) {
    if (shouldLog('debug')) {
      const formatted = formatMessage('debug', message, meta);
      console.debug(formatted);
      writeToFile(formatted, 'debug');
    }
  },

  info(message: string, meta?: Record<string, unknown>) {
    if (shouldLog('info')) {
      const formatted = formatMessage('info', message, meta);
      console.log(formatted);
      writeToFile(formatted, 'info');
    }
  },

  warn(message: string, meta?: Record<string, unknown>) {
    if (shouldLog('warn')) {
      const formatted = formatMessage('warn', message, meta);
      console.warn(formatted);
      writeToFile(formatted, 'warn');
    }
  },

  error(message: string, meta?: Record<string, unknown>) {
    if (shouldLog('error')) {
      const formatted = formatMessage('error', message, meta);
      console.error(formatted);
      writeToFile(formatted, 'error');
    }
  },

  http(method: string, path: string, statusCode: number, durationMs: number, meta?: Record<string, unknown>) {
    const level: LogLevel = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';
    if (shouldLog(level)) {
      const msg = `${method} ${path} ${statusCode} ${durationMs}ms`;
      const formatted = formatMessage(level, msg, meta);
      if (level === 'error') {
        console.error(formatted);
      } else if (level === 'warn') {
        console.warn(formatted);
      } else {
        console.log(formatted);
      }
      writeToFile(formatted, level);
    }
  },
};
