/**
 * Logger Module - Structured logging for CEL
 * @module src/server/utils/logger
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Log levels
 */
export const LogLevel = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  FATAL: 4,
};

/**
 * Log level names for output
 */
const LOG_LEVEL_NAMES = ['DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL'];

/**
 * Logger class with structured logging
 */
export class Logger {
  /**
   * Create a logger instance
   * @param {Object} options - Logger options
   * @param {string} options.name - Logger name
   * @param {number} options.level - Minimum log level
   * @param {boolean} options.console - Output to console
   * @param {string} options.file - Output file path
   * @param {boolean} options.json - Output in JSON format
   */
  constructor(options = {}) {
    this.name = options.name || 'CEL';
    this.level = options.level ?? LogLevel.INFO;
    this.console = options.console ?? true;
    this.json = options.json ?? false;
    this.file = options.file || null;

    if (this.file) {
      this.fileStream = fs.createWriteStream(this.file, { flags: 'a' });
    }
  }

  /**
   * Format a log entry
   * @param {string} level - Log level name
   * @param {string} message - Log message
   * @param {Object} data - Additional data
   * @returns {string} Formatted log entry
   */
  formatEntry(level, message, data = {}) {
    const timestamp = new Date().toISOString();
    const entry = {
      timestamp,
      level,
      logger: this.name,
      message,
      ...data,
    };

    if (this.json) {
      return JSON.stringify(entry);
    }

    // Human-readable format
    const dataStr = Object.keys(data).length > 0 ? ` ${JSON.stringify(data)}` : '';
    return `[${timestamp}] [${level}] [${this.name}] ${message}${dataStr}`;
  }

  /**
   * Write log entry to outputs
   * @param {string} level - Log level name
   * @param {string} message - Log message
   * @param {Object} data - Additional data
   */
  write(level, message, data = {}) {
    const levelIndex = LogLevel[level] ?? LogLevel.INFO;
    if (levelIndex < this.level) {
      return;
    }

    const entry = this.formatEntry(level, message, data);

    if (this.console) {
      const emoji = this.getEmoji(level);
      console.log(`${emoji} ${entry}`);
    }

    if (this.fileStream) {
      this.fileStream.write(entry + '\n');
    }
  }

  /**
   * Get emoji for log level
   * @param {string} level - Log level
   * @returns {string} Emoji
   */
  getEmoji(level) {
    const emojis = {
      DEBUG: '🔍',
      INFO: 'ℹ️',
      WARN: '⚠️',
      ERROR: '❌',
      FATAL: '💀',
    };
    return emojis[level] || '📝';
  }

  /**
   * Log debug message
   * @param {string} message - Log message
   * @param {Object} data - Additional data
   */
  debug(message, data = {}) {
    this.write('DEBUG', message, data);
  }

  /**
   * Log info message
   * @param {string} message - Log message
   * @param {Object} data - Additional data
   */
  info(message, data = {}) {
    this.write('INFO', message, data);
  }

  /**
   * Log warning message
   * @param {string} message - Log message
   * @param {Object} data - Additional data
   */
  warn(message, data = {}) {
    this.write('WARN', message, data);
  }

  /**
   * Log error message
   * @param {string} message - Log message
   * @param {Object} data - Additional data
   */
  error(message, data = {}) {
    this.write('ERROR', message, data);
  }

  /**
   * Log fatal message
   * @param {string} message - Log message
   * @param {Object} data - Additional data
   */
  fatal(message, data = {}) {
    this.write('FATAL', message, data);
  }

  /**
   * Create a child logger with additional context
   * @param {string} name - Child logger name
   * @param {Object} context - Additional context
   * @returns {Logger} Child logger
   */
  child(name, context = {}) {
    const childLogger = new Logger({
      name: `${this.name}:${name}`,
      level: this.level,
      console: this.console,
      file: this.file,
      json: this.json,
    });
    childLogger.context = { ...this.context, ...context };
    return childLogger;
  }

  /**
   * Close the logger
   */
  close() {
    if (this.fileStream) {
      this.fileStream.end();
    }
  }
}

/**
 * Request logger middleware
 * @param {Logger} logger - Logger instance
 * @returns {Function} Express middleware
 */
export function requestLogger(logger) {
  return (req, res, next) => {
    const startTime = Date.now();
    const requestId = generateRequestId();

    // Attach request ID to request
    req.requestId = requestId;

    // Log request
    logger.info(`→ ${req.method} ${req.path}`, {
      requestId,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      contentLength: req.headers['content-length'],
    });

    // Log response on finish
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const level = res.statusCode >= 400 ? 'warn' : 'info';

      logger[level](`← ${req.method} ${req.path} ${res.statusCode}`, {
        requestId,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        contentLength: res.getHeader('content-length'),
      });
    });

    next();
  };
}

/**
 * Generate a unique request ID
 * @returns {string} Request ID
 */
function generateRequestId() {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create a configured logger instance
 * @param {Object} options - Logger options
 * @returns {Logger} Configured logger
 */
export function createLogger(options = {}) {
  const level = process.env.LOG_LEVEL?.toUpperCase() || 'INFO';
  const levelMap = {
    DEBUG: LogLevel.DEBUG,
    INFO: LogLevel.INFO,
    WARN: LogLevel.WARN,
    ERROR: LogLevel.ERROR,
    FATAL: LogLevel.FATAL,
  };

  return new Logger({
    name: options.name || 'CEL',
    level: levelMap[level] ?? LogLevel.INFO,
    console: options.console ?? true,
    file: options.file || process.env.LOG_FILE,
    json: options.json ?? process.env.LOG_FORMAT === 'json',
  });
}

// Default logger instance
let defaultLogger = null;

/**
 * Get the default logger instance
 * @returns {Logger} Default logger
 */
export function getLogger() {
  if (!defaultLogger) {
    defaultLogger = createLogger();
  }
  return defaultLogger;
}

/**
 * Initialize the default logger
 * @param {Object} options - Logger options
 * @returns {Logger} Initialized logger
 */
export function initializeLogger(options = {}) {
  defaultLogger = createLogger(options);
  return defaultLogger;
}

export default Logger;
