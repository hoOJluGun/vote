'use strict';

/**
 * Error Handler Module for Cognitive Execution Layer
 * Provides centralized error handling with custom error classes
 *
 * @module src/middleware/error-handler
 */

// ============================================================================
// BASE ERROR CLASS
// ============================================================================

/**
 * Base application error class
 */
class AppError extends Error {
  /**
   * Create an AppError
   * @param {string} message - Error message
   * @param {number} [statusCode=500] - HTTP status code
   * @param {string} [code='INTERNAL_ERROR'] - Error code
   * @param {*} [details=null] - Additional details
   */
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details = null) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.timestamp = new Date().toISOString();
    this.isOperational = true;
  }

  /**
   * Convert to JSON
   * @returns {Object} JSON representation
   */
  toJSON() {
    return {
      error: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      timestamp: this.timestamp,
      ...(this.details && { details: this.details }),
    };
  }
}

// ============================================================================
// SPECIFIC ERROR CLASSES
// ============================================================================

/**
 * Bad Request Error (400)
 */
class BadRequestError extends AppError {
  constructor(message = 'Bad Request', details = null) {
    super(message, 400, 'BAD_REQUEST', details);
    this.name = 'BadRequestError';
  }
}

/**
 * Unauthorized Error (401)
 */
class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized', details = null) {
    super(message, 401, 'UNAUTHORIZED', details);
    this.name = 'UnauthorizedError';
  }
}

/**
 * Forbidden Error (403)
 */
class ForbiddenError extends AppError {
  constructor(message = 'Forbidden', details = null) {
    super(message, 403, 'FORBIDDEN', details);
    this.name = 'ForbiddenError';
  }
}

/**
 * Not Found Error (404)
 */
class NotFoundError extends AppError {
  constructor(resource = 'Resource', details = null) {
    super(`${resource} not found`, 404, 'NOT_FOUND', details);
    this.name = 'NotFoundError';
  }
}

/**
 * Rate Limit Error (429)
 */
class RateLimitError extends AppError {
  constructor(retryAfter = 60, details = null) {
    super('Too many requests', 429, 'RATE_LIMIT_EXCEEDED', details);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

// ============================================================================
// ERROR HANDLER CLASS
// ============================================================================

/**
 * Error Handler class with centralized handling logic
 */
class ErrorHandler {
  /**
   * Log error details
   * @param {Error} error - Error to log
   * @param {Object} context - Additional context
   */
  static log(error, context = {}) {
    const timestamp = new Date().toISOString();
    const errorInfo = {
      timestamp,
      name: error.name,
      message: error.message,
      code: error.code || 'UNKNOWN',
      stack: error.stack,
      ...context,
    };

    if (error instanceof AppError && error.statusCode < 500) {
      console.warn('[WARN]', JSON.stringify(errorInfo, null, 2));
    } else {
      console.error('[ERROR]', JSON.stringify(errorInfo, null, 2));
    }
  }

  /**
   * Convert any error to AppError
   * @param {Error} error - Original error
   * @returns {AppError} AppError instance
   */
  static normalize(error) {
    if (error instanceof AppError) {
      return error;
    }

    if (error.code === 'ENOENT') {
      return new NotFoundError('File or directory');
    }

    if (error.code === 'EACCES') {
      return new ForbiddenError('Permission denied');
    }

    return new AppError(
      process.env.NODE_ENV === 'production'
        ? 'An unexpected error occurred'
        : error.message,
      { originalError: error.message, stack: error.stack },
    );
  }

  /**
   * Create Express error handling middleware
   * @returns {Function} Express error middleware
   */
  static middleware() {
    return (err, req, res, next) => {
      const normalizedError = this.normalize(err);

      this.log(normalizedError, {
        method: req.method,
        url: req.originalUrl,
        ip: req.ip,
      });

      const response = {
        success: false,
        error: normalizedError.toJSON(),
      };

      if (normalizedError.retryAfter) {
        res.set('Retry-After', String(normalizedError.retryAfter));
      }

      res.status(normalizedError.statusCode).json(response);
    };
  }

  /**
   * Async handler wrapper for Express routes
   * @param {Function} fn - Async route handler
   * @returns {Function} Wrapped handler
   */
  static asyncHandler(fn) {
    return (req, res, next) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }

  /**
   * Handle uncaught exceptions
   */
  static handleUncaughtException() {
    process.on('uncaughtException', (error) => {
      this.log(error, { type: 'uncaughtException' });
      setTimeout(() => process.exit(1), 1000);
    });
  }

  /**
   * Handle unhandled promise rejections
   */
  static handleUnhandledRejection() {
    process.on('unhandledRejection', (reason) => {
      const error = reason instanceof Error ? reason : new Error(String(reason));
      this.log(error, { type: 'unhandledRejection' });
    });
  }

  /**
   * Initialize all error handlers
   */
  static initialize() {
    this.handleUncaughtException();
    this.handleUnhandledRejection();
    console.log('[ErrorHandler] Error handlers initialized');
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  AppError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  RateLimitError,
  ErrorHandler,
};
