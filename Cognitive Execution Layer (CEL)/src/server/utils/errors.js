/**
 * Error Handling Module - Centralized error management for CEL
 * @module src/server/utils/errors
 */

/**
 * Base application error class
 */
export class AppError extends Error {
  /**
   * Create an application error
   * @param {string} message - Error message
   * @param {Object} options - Error options
   * @param {number} options.statusCode - HTTP status code
   * @param {string} options.type - Error type
   * @param {string} options.code - Error code
   * @param {Object} options.details - Additional details
   * @param {Error} options.cause - Original error
   */
  constructor(message, options = {}) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = options.statusCode || 500;
    this.type = options.type || 'internal_error';
    this.code = options.code || 'INTERNAL_ERROR';
    this.details = options.details || {};
    this.cause = options.cause || null;
    this.timestamp = new Date().toISOString();

    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Convert error to JSON
   * @returns {Object} JSON representation
   */
  toJSON() {
    return {
      error: {
        message: this.message,
        type: this.type,
        code: this.code,
        details: this.details,
        timestamp: this.timestamp,
        ...(process.env.NODE_ENV === 'development' && { stack: this.stack }),
      },
    };
  }
}

/**
 * Validation error
 */
export class ValidationError extends AppError {
  constructor(message, details = {}) {
    super(message, {
      statusCode: 400,
      type: 'validation_error',
      code: 'VALIDATION_ERROR',
      details,
    });
  }
}

/**
 * Authentication error
 */
export class AuthenticationError extends AppError {
  constructor(message = 'Authentication required', details = {}) {
    super(message, {
      statusCode: 401,
      type: 'authentication_error',
      code: 'AUTHENTICATION_ERROR',
      details,
    });
  }
}

/**
 * Authorization error
 */
export class AuthorizationError extends AppError {
  constructor(message = 'Insufficient permissions', details = {}) {
    super(message, {
      statusCode: 403,
      type: 'authorization_error',
      code: 'AUTHORIZATION_ERROR',
      details,
    });
  }
}

/**
 * Not found error
 */
export class NotFoundError extends AppError {
  constructor(message = 'Resource not found', details = {}) {
    super(message, {
      statusCode: 404,
      type: 'not_found',
      code: 'NOT_FOUND',
      details,
    });
  }
}

/**
 * Conflict error
 */
export class ConflictError extends AppError {
  constructor(message = 'Resource conflict', details = {}) {
    super(message, {
      statusCode: 409,
      type: 'conflict',
      code: 'CONFLICT',
      details,
    });
  }
}

/**
 * Rate limit error
 */
export class RateLimitError extends AppError {
  constructor(message = 'Rate limit exceeded', details = {}) {
    super(message, {
      statusCode: 429,
      type: 'rate_limit_error',
      code: 'RATE_LIMIT_EXCEEDED',
      details,
    });
  }
}

/**
 * Service unavailable error
 */
export class ServiceUnavailableError extends AppError {
  constructor(message = 'Service temporarily unavailable', details = {}) {
    super(message, {
      statusCode: 503,
      type: 'service_unavailable',
      code: 'SERVICE_UNAVAILABLE',
      details,
    });
  }
}

/**
 * Safety violation error
 */
export class SafetyViolationError extends AppError {
  constructor(message, violations = [], warnings = []) {
    super(message, {
      statusCode: 400,
      type: 'safety_violation',
      code: 'SAFETY_VIOLATION',
      details: { violations, warnings },
    });
  }
}

/**
 * Resource limit error
 */
export class ResourceLimitError extends AppError {
  constructor(message, details = {}) {
    super(message, {
      statusCode: 429,
      type: 'resource_limit_error',
      code: 'RESOURCE_LIMIT_EXCEEDED',
      details,
    });
  }
}

/**
 * External API error
 */
export class ExternalApiError extends AppError {
  constructor(message, details = {}) {
    super(message, {
      statusCode: 502,
      type: 'external_api_error',
      code: 'EXTERNAL_API_ERROR',
      details,
    });
  }
}

/**
 * Timeout error
 */
export class TimeoutError extends AppError {
  constructor(message = 'Request timeout', details = {}) {
    super(message, {
      statusCode: 504,
      type: 'timeout_error',
      code: 'TIMEOUT',
      details,
    });
  }
}

/**
 * Error handler class
 */
export class ErrorHandler {
  /**
   * Create an error handler
   * @param {Object} options - Handler options
   * @param {Object} options.logger - Logger instance
   * @param {boolean} options.includeStackTrace - Include stack trace in response
   */
  constructor(options = {}) {
    this.logger = options.logger || console;
    this.includeStackTrace = options.includeStackTrace || process.env.NODE_ENV === 'development';
  }

  /**
   * Handle an error
   * @param {Error} error - Error to handle
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   * @param {Function} next - Next middleware
   */
  handle(error, req, res, next) {
    // Convert to AppError if needed
    const appError = this.normalizeError(error);

    // Log the error
    this.logError(appError, req);

    // Send response
    this.sendResponse(appError, res);
  }

  /**
   * Normalize an error to AppError
   * @param {Error} error - Error to normalize
   * @returns {AppError} Normalized error
   */
  normalizeError(error) {
    // Already an AppError
    if (error instanceof AppError) {
      return error;
    }

    // Handle specific error types
    if (error.name === 'ValidationError') {
      return new ValidationError(error.message, { errors: error.errors });
    }

    if (error.name === 'UnauthorizedError') {
      return new AuthenticationError(error.message);
    }

    if (error.name === 'ForbiddenError') {
      return new AuthorizationError(error.message);
    }

    if (error.name === 'NotFoundError') {
      return new NotFoundError(error.message);
    }

    if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
      return new TimeoutError(error.message);
    }

    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      return new ServiceUnavailableError(error.message);
    }

    // Generic error
    return new AppError(
      process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
      {
        statusCode: 500,
        type: 'internal_error',
        code: 'INTERNAL_ERROR',
        cause: error,
      }
    );
  }

  /**
   * Log an error
   * @param {AppError} error - Error to log
   * @param {Object} req - Express request
   */
  logError(error, req) {
    const logData = {
      error: {
        message: error.message,
        type: error.type,
        code: error.code,
        statusCode: error.statusCode,
        details: error.details,
        stack: error.stack,
      },
      request: {
        method: req.method,
        path: req.path,
        query: req.query,
        body: this.sanitizeBody(req.body),
        headers: this.sanitizeHeaders(req.headers),
        ip: req.ip,
        requestId: req.requestId,
      },
    };

    if (error.statusCode >= 500) {
      this.logger.error('Server error:', logData);
    } else if (error.statusCode >= 400) {
      this.logger.warn('Client error:', logData);
    }
  }

  /**
   * Send error response
   * @param {AppError} error - Error to send
   * @param {Object} res - Express response
   */
  sendResponse(error, res) {
    const response = error.toJSON();

    if (this.includeStackTrace) {
      response.error.stack = error.stack;
    }

    res.status(error.statusCode).json(response);
  }

  /**
   * Sanitize request body for logging
   * @param {Object} body - Request body
   * @returns {Object} Sanitized body
   */
  sanitizeBody(body) {
    if (!body || typeof body !== 'object') {
      return body;
    }

    const sanitized = { ...body };
    const sensitiveFields = ['password', 'token', 'apiKey', 'secret', 'authorization'];

    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  /**
   * Sanitize headers for logging
   * @param {Object} headers - Request headers
   * @returns {Object} Sanitized headers
   */
  sanitizeHeaders(headers) {
    if (!headers || typeof headers !== 'object') {
      return headers;
    }

    const sanitized = { ...headers };
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];

    for (const header of sensitiveHeaders) {
      if (sanitized[header]) {
        sanitized[header] = '[REDACTED]';
      }
    }

    return sanitized;
  }
}

/**
 * Create error handler middleware
 * @param {Object} options - Handler options
 * @returns {Function} Express middleware
 */
export function createErrorHandler(options = {}) {
  const handler = new ErrorHandler(options);
  return handler.handle.bind(handler);
}

/**
 * Async handler wrapper
 * Wraps async route handlers to catch errors
 * @param {Function} fn - Async route handler
 * @returns {Function} Wrapped handler
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Create a not found handler
 * @returns {Function} Express middleware
 */
export function notFoundHandler() {
  return (req, res, next) => {
    next(new NotFoundError(`Route ${req.method} ${req.path} not found`));
  };
}

export default {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  ServiceUnavailableError,
  SafetyViolationError,
  ResourceLimitError,
  ExternalApiError,
  TimeoutError,
  ErrorHandler,
  createErrorHandler,
  asyncHandler,
  notFoundHandler,
};
