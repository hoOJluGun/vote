/**
 * API Middleware - Enhanced middleware for API Layer
 * Includes schema validation, correlation IDs, error handling, and rate limiting
 * @module src/server/middleware/api-middleware
 */

import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

/**
 * Schema validation rules
 */
const schemas = {
  chatCompletion: {
    messages: { type: 'array', required: true, minLength: 1 },
    model: { type: 'string', required: false },
    max_tokens: { type: 'number', min: 1, max: 8192 },
    temperature: { type: 'number', min: 0, max: 2 },
    stream: { type: 'boolean' },
  },
  codeAssist: {
    file: { type: 'string', required: true },
    selection: { type: 'string' },
    userIntent: { type: 'string' },
  },
  orchestrateGoal: {
    query: { type: 'string', required: true, minLength: 1, maxLength: 10000 },
    context: { type: 'object' },
  },
  createGoal: {
    description: { type: 'string', required: true, minLength: 1 },
    priority: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
    constraints: { type: 'object' },
  },
  createTask: {
    goalId: { type: 'string', required: true },
    action: { type: 'string', required: true },
    params: { type: 'object' },
  },
  checkSafety: {
    operation: { type: 'object', required: true },
  },
};

/**
 * Validate an object against a schema
 * @param {Object} data - Data to validate
 * @param {Object} schema - Schema definition
 * @returns {Object} Validation result { valid, errors }
 */
function validateSchema(data, schema) {
  const errors = [];

  for (const [field, rules] of Object.entries(schema)) {
    const value = data[field];

    // Check required
    if (rules.required && (value === undefined || value === null)) {
      errors.push({ field, message: `Field '${field}' is required` });
      continue;
    }

    // Skip further validation if value is not provided and not required
    if (value === undefined || value === null) {
      continue;
    }

    // Type validation
    if (rules.type) {
      const actualType = Array.isArray(value) ? 'array' : typeof value;
      if (actualType !== rules.type) {
        errors.push({ field, message: `Field '${field}' must be of type ${rules.type}, got ${actualType}` });
        continue;
      }
    }

    // String validations
    if (rules.type === 'string' && typeof value === 'string') {
      if (rules.minLength !== undefined && value.length < rules.minLength) {
        errors.push({ field, message: `Field '${field}' must be at least ${rules.minLength} characters` });
      }
      if (rules.maxLength !== undefined && value.length > rules.maxLength) {
        errors.push({ field, message: `Field '${field}' must be at most ${rules.maxLength} characters` });
      }
      if (rules.enum && !rules.enum.includes(value)) {
        errors.push({ field, message: `Field '${field}' must be one of: ${rules.enum.join(', ')}` });
      }
    }

    // Number validations
    if (rules.type === 'number' && typeof value === 'number') {
      if (rules.min !== undefined && value < rules.min) {
        errors.push({ field, message: `Field '${field}' must be at least ${rules.min}` });
      }
      if (rules.max !== undefined && value > rules.max) {
        errors.push({ field, message: `Field '${field}' must be at most ${rules.max}` });
      }
    }

    // Array validations
    if (rules.type === 'array' && Array.isArray(value)) {
      if (rules.minLength !== undefined && value.length < rules.minLength) {
        errors.push({ field, message: `Field '${field}' must have at least ${rules.minLength} items` });
      }
      if (rules.maxLength !== undefined && value.length > rules.maxLength) {
        errors.push({ field, message: `Field '${field}' must have at most ${rules.maxLength} items` });
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Create API middleware factory
 * @param {Object} options - Configuration options
 * @param {Object} options.logger - Logger instance
 * @param {Object} options.securityFramework - Security framework instance
 * @returns {Object} Middleware functions
 */
export function createApiMiddleware(options = {}) {
  const { logger = console, securityFramework } = options;

  /**
   * Correlation ID middleware
   * Adds a unique correlation ID to each request for tracing
   */
  const correlationId = (req, res, next) => {
    // Use existing correlation ID from header or generate new one
    const correlationId = req.headers['x-correlation-id'] || uuidv4();

    // Attach to request for use in handlers
    req.correlationId = correlationId;

    // Add to response headers
    res.setHeader('X-Correlation-ID', correlationId);

    next();
  };

  /**
   * Request context middleware
   * Builds a rich request context for logging and tracing
   */
  const requestContext = (req, res, next) => {
    req.context = {
      correlationId: req.correlationId,
      startTime: Date.now(),
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'],
      method: req.method,
      path: req.path,
      userId: req.user?.id || 'anonymous',
    };

    // Log request start
    logger.log('info', `→ ${req.method} ${req.path}`, {
      correlationId: req.correlationId,
      ip: req.context.ip,
    });

    // Log response on finish
    res.on('finish', () => {
      const duration = Date.now() - req.context.startTime;
      logger.log('info', `← ${req.method} ${req.path} ${res.statusCode}`, {
        correlationId: req.correlationId,
        duration: `${duration}ms`,
        statusCode: res.statusCode,
      });
    });

    next();
  };

  /**
   * Schema validation middleware factory
   * @param {string} schemaName - Name of the schema to validate against
   */
  const validateBody = (schemaName) => {
    const schema = schemas[schemaName];

    if (!schema) {
      throw new Error(`Unknown schema: ${schemaName}`);
    }

    return (req, res, next) => {
      const validation = validateSchema(req.body, schema);

      if (!validation.valid) {
        return res.status(400).json({
          error: {
            type: 'validation_error',
            message: 'Request validation failed',
            details: validation.errors,
            correlationId: req.correlationId,
          },
        });
      }

      next();
    };
  };

  /**
   * Enhanced authentication middleware
   * Supports API keys, Bearer tokens, and session-based auth
   */
  const authenticate = async (req, res, next) => {
    try {
      // Skip auth for health endpoints
      const publicPaths = ['/health', '/health/detailed', '/live', '/ready'];
      if (publicPaths.includes(req.path)) {
        return next();
      }

      // Check for API key in header
      const apiKey = req.headers['x-api-key'];
      const authHeader = req.headers.authorization;

      if (apiKey) {
        // Validate API key
        if (securityFramework) {
          const isValid = await securityFramework.validateApiKey(apiKey);
          if (!isValid) {
            return res.status(401).json({
              error: {
                type: 'authentication_error',
                message: 'Invalid API key',
                correlationId: req.correlationId,
              },
            });
          }
          req.user = { type: 'api_key', authenticated: true };
        }
        return next();
      }

      if (authHeader) {
        const [bearer, token] = authHeader.split(' ');

        if (bearer !== 'Bearer' || !token) {
          return res.status(401).json({
            error: {
              type: 'authentication_error',
              message: 'Invalid authorization header format. Expected: Bearer <token>',
              correlationId: req.correlationId,
            },
          });
        }

        if (securityFramework) {
          const validationResult = await securityFramework.validateToken(token);
          if (!validationResult.valid) {
            return res.status(401).json({
              error: {
                type: 'authentication_error',
                message: validationResult.error || 'Invalid or expired token',
                correlationId: req.correlationId,
              },
            });
          }
          req.user = validationResult.user || { type: 'bearer', authenticated: true };
        }
        return next();
      }

      // No authentication provided
      return res.status(401).json({
        error: {
          type: 'authentication_error',
          message: 'Authentication required. Provide X-API-Key header or Bearer token.',
          correlationId: req.correlationId,
        },
      });
    } catch (error) {
      logger.log('error', 'Authentication error', {
        correlationId: req.correlationId,
        error: error.message,
      });
      return res.status(500).json({
        error: {
          type: 'internal_error',
          message: 'Authentication failed',
          correlationId: req.correlationId,
        },
      });
    }
  };

  /**
   * Optional authentication - doesn't reject if no auth provided
   */
  const optionalAuth = async (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    const authHeader = req.headers.authorization;

    if (apiKey || authHeader) {
      return authenticate(req, res, next);
    }

    req.user = { type: 'anonymous', authenticated: false };
    next();
  };

  /**
   * Advanced rate limiting middleware
   * Implements sliding window rate limiting with different limits per endpoint
   */
  const rateLimitStore = new Map();

  const rateLimit = (options = {}) => {
    const {
      windowMs = 60000, // 1 minute
      maxRequests = 100,
      keyGenerator = (req) => req.user?.id || req.ip,
      skipCondition = (req) => false,
      handler = null,
    } = options;

    // Cleanup old entries periodically
    setInterval(() => {
      const now = Date.now();
      for (const [key, value] of rateLimitStore.entries()) {
        if (now - value.windowStart > windowMs * 2) {
          rateLimitStore.delete(key);
        }
      }
    }, windowMs);

    return (req, res, next) => {
      if (skipCondition(req)) {
        return next();
      }

      const key = keyGenerator(req);
      const now = Date.now();

      let rateLimitInfo = rateLimitStore.get(key);

      if (!rateLimitInfo || now - rateLimitInfo.windowStart > windowMs) {
        rateLimitInfo = {
          requests: [],
          windowStart: now,
        };
        rateLimitStore.set(key, rateLimitInfo);
      }

      // Remove old requests outside the window
      rateLimitInfo.requests = rateLimitInfo.requests.filter(
        (timestamp) => now - timestamp < windowMs
      );

      // Check limit
      if (rateLimitInfo.requests.length >= maxRequests) {
        const retryAfter = Math.ceil(
          (windowMs - (now - rateLimitInfo.requests[0])) / 1000
        );

        res.setHeader('X-RateLimit-Limit', maxRequests);
        res.setHeader('X-RateLimit-Remaining', 0);
        res.setHeader('X-RateLimit-Reset', new Date(now + retryAfter * 1000).toISOString());
        res.setHeader('Retry-After', retryAfter);

        if (handler) {
          return handler(req, res, next, { retryAfter });
        }

        return res.status(429).json({
          error: {
            type: 'rate_limit_error',
            message: 'Too many requests. Please try again later.',
            retryAfter,
            correlationId: req.correlationId,
          },
        });
      }

      // Add current request
      rateLimitInfo.requests.push(now);

      // Set headers
      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', maxRequests - rateLimitInfo.requests.length);
      res.setHeader('X-RateLimit-Reset', new Date(rateLimitInfo.windowStart + windowMs).toISOString());

      next();
    };
  };

  /**
   * Rate limit presets for different endpoint types
   */
  const rateLimits = {
    chat: rateLimit({ windowMs: 60000, maxRequests: 30 }),
    codeAssist: rateLimit({ windowMs: 60000, maxRequests: 20 }),
    orchestration: rateLimit({ windowMs: 60000, maxRequests: 50 }),
    system: rateLimit({ windowMs: 60000, maxRequests: 100 }),
    strict: rateLimit({ windowMs: 60000, maxRequests: 10 }),
  };

  /**
   * Error handling middleware
   * Catches all errors and returns consistent error responses
   */
  const errorHandler = (err, req, res, next) => {
    // Log error
    logger.log('error', 'Unhandled error', {
      correlationId: req.correlationId,
      error: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
    });

    // Determine status code
    const statusCode = err.statusCode || err.status || 500;

    // Build error response
    const errorResponse = {
      error: {
        type: err.type || 'internal_error',
        message: statusCode === 500 ? 'Internal server error' : err.message,
        correlationId: req.correlationId,
      },
    };

    // Add details in development
    if (process.env.NODE_ENV === 'development') {
      errorResponse.error.stack = err.stack;
      errorResponse.error.details = err.details;
    }

    // Add validation errors if present
    if (err.validationErrors) {
      errorResponse.error.validationErrors = err.validationErrors;
    }

    res.status(statusCode).json(errorResponse);
  };

  /**
   * 404 Not Found handler
   */
  const notFoundHandler = (req, res) => {
    res.status(404).json({
      error: {
        type: 'not_found_error',
        message: `Endpoint not found: ${req.method} ${req.path}`,
        correlationId: req.correlationId,
      },
    });
  };

  /**
   * Request timeout middleware
   */
  const timeout = (ms = 30000) => {
    return (req, res, next) => {
      const timer = setTimeout(() => {
        if (!res.headersSent) {
          res.status(408).json({
            error: {
              type: 'timeout_error',
              message: 'Request timeout',
              correlationId: req.correlationId,
            },
          });
        }
      }, ms);

      res.on('finish', () => clearTimeout(timer));
      res.on('close', () => clearTimeout(timer));

      next();
    };
  };

  /**
   * Request ID for idempotency
   */
  const idempotency = (req, res, next) => {
    const idempotencyKey = req.headers['x-idempotency-key'];

    if (idempotencyKey) {
      // Store the key for potential response caching
      req.idempotencyKey = idempotencyKey;
    }

    next();
  };

  /**
   * Compression middleware helper
   */
  const shouldCompress = (req, res) => {
    // Don't compress if already compressed or streaming
    if (req.headers['x-no-compression']) {
      return false;
    }
    return true;
  };

  return {
    correlationId,
    requestContext,
    validateBody,
    authenticate,
    optionalAuth,
    rateLimit,
    rateLimits,
    errorHandler,
    notFoundHandler,
    timeout,
    idempotency,
    shouldCompress,
    schemas,
  };
}

/**
 * Custom error classes
 */
export class ApiError extends Error {
  constructor(message, statusCode = 500, type = 'internal_error', details = null) {
    super(message);
    this.statusCode = statusCode;
    this.type = type;
    this.details = details;
    this.name = 'ApiError';
  }
}

export class ValidationError extends ApiError {
  constructor(message, errors = []) {
    super(message, 400, 'validation_error');
    this.validationErrors = errors;
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends ApiError {
  constructor(message = 'Authentication required') {
    super(message, 401, 'authentication_error');
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends ApiError {
  constructor(message = 'Insufficient permissions') {
    super(message, 403, 'authorization_error');
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends ApiError {
  constructor(message = 'Resource not found') {
    super(message, 404, 'not_found_error');
    this.name = 'NotFoundError';
  }
}

export class RateLimitError extends ApiError {
  constructor(retryAfter = 60) {
    super('Too many requests', 429, 'rate_limit_error');
    this.retryAfter = retryAfter;
    this.name = 'RateLimitError';
  }
}

export default createApiMiddleware;
