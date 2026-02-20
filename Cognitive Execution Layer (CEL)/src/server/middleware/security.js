/**
 * Security Middleware - Centralized security validation for all routes
 * @module src/server/middleware/security
 */

import { SecurityFramework } from '../../security/security-framework.js';

/**
 * Security middleware factory
 * @param {Object} options - Configuration options
 * @param {Object} options.formalSafetyModel - Safety model instance
 * @param {Object} options.resourceGovernor - Resource governor instance
 * @param {Object} options.inputValidator - Input validator instance
 * @param {Object} options.securityFramework - Security framework instance
 * @returns {Object} Middleware functions
 */
export function createSecurityMiddleware(options = {}) {
  const { formalSafetyModel, resourceGovernor, inputValidator, securityFramework } = options;

  /**
   * Request validation middleware
   * Validates request body, headers, and parameters
   */
  const validateRequest = (req, res, next) => {
    try {
      // Check content-type for POST/PUT/PATCH requests
      if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
        const contentType = req.headers['content-type'];
        if (!contentType || !contentType.includes('application/json')) {
          return res.status(415).json({
            error: {
              message: 'Content-Type must be application/json',
              type: 'invalid_request_error',
            },
          });
        }
      }

      // Validate request size (max 10MB)
      const contentLength = parseInt(req.headers['content-length'] || '0', 10);
      if (contentLength > 10 * 1024 * 1024) {
        return res.status(413).json({
          error: {
            message: 'Request body too large (max 10MB)',
            type: 'invalid_request_error',
          },
        });
      }

      next();
    } catch (error) {
      console.error('❌ Security middleware error:', error);
      res.status(500).json({
        error: {
          message: 'Security validation failed',
          type: 'internal_error',
        },
      });
    }
  };

  /**
   * Input sanitization middleware
   * Sanitizes user input to prevent injection attacks
   */
  const sanitizeInput = (req, res, next) => {
    try {
      // Sanitize body
      if (req.body && typeof req.body === 'object') {
        req.body = sanitizeObject(req.body);
      }

      // Sanitize query parameters
      if (req.query && typeof req.query === 'object') {
        req.query = sanitizeObject(req.query);
      }

      // Sanitize URL parameters
      if (req.params && typeof req.params === 'object') {
        req.params = sanitizeObject(req.params);
      }

      next();
    } catch (error) {
      console.error('❌ Sanitization error:', error);
      res.status(400).json({
        error: {
          message: 'Invalid input data',
          type: 'invalid_request_error',
        },
      });
    }
  };

  /**
   * Safety check middleware
   * Validates operations against safety model
   */
  const checkSafety = (operationType) => {
    return async (req, res, next) => {
      try {
        if (!formalSafetyModel) {
          console.warn('⚠️ Safety model not initialized, skipping safety check');
          return next();
        }

        const operation = {
          type: operationType,
          payload: {
            body: req.body,
            params: req.params,
            query: req.query,
            user: req.user,
          },
          metadata: {
            ip: req.ip,
            userAgent: req.headers['user-agent'],
            timestamp: new Date().toISOString(),
          },
        };

        const safetyCheck = formalSafetyModel.validateOperation(operation);

        if (!safetyCheck.safe) {
          console.warn(`🚨 Safety violation detected:`, safetyCheck.violations);
          return res.status(400).json({
            error: {
              message: `Safety check failed: ${safetyCheck.violations.join(', ')}`,
              type: 'safety_violation',
              violations: safetyCheck.violations,
              warnings: safetyCheck.warnings,
            },
          });
        }

        // Attach warnings to request for logging
        req.safetyWarnings = safetyCheck.warnings;

        next();
      } catch (error) {
        console.error('❌ Safety check error:', error);
        res.status(500).json({
          error: {
            message: 'Safety validation failed',
            type: 'internal_error',
          },
        });
      }
    };
  };

  /**
   * Resource limit middleware
   * Checks resource limits before processing
   */
  const checkResourceLimits = (resourceType) => {
    return async (req, res, next) => {
      try {
        if (!resourceGovernor) {
          console.warn('⚠️ Resource governor not initialized, skipping resource check');
          return next();
        }

        const resourceCheck = resourceGovernor.checkResourceLimits({
          type: resourceType,
          payload: req.body,
          user: req.user,
        });

        if (!resourceCheck.allowed) {
          console.warn(`📉 Resource limit exceeded:`, resourceCheck.reason);
          return res.status(429).json({
            error: {
              message: `Resource limit exceeded: ${resourceCheck.reason}`,
              type: 'rate_limit_error',
              retryAfter: resourceCheck.retryAfter,
            },
          });
        }

        next();
      } catch (error) {
        console.error('❌ Resource check error:', error);
        res.status(500).json({
          error: {
            message: 'Resource validation failed',
            type: 'internal_error',
          },
        });
      }
    };
  };

  /**
   * Authentication middleware
   * Validates API key or token
   */
  const authenticate = (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader) {
        // Allow unauthenticated access for health checks
        if (req.path === '/health' || req.path === '/live' || req.path === '/ready') {
          return next();
        }

        // Check for API key in headers
        const apiKey = req.headers['x-api-key'];
        if (!apiKey) {
          return res.status(401).json({
            error: {
              message: 'Authentication required',
              type: 'authentication_error',
            },
          });
        }

        // Validate API key
        if (securityFramework) {
          const isValid = securityFramework.validateApiKey(apiKey);
          if (!isValid) {
            return res.status(401).json({
              error: {
                message: 'Invalid API key',
                type: 'authentication_error',
              },
            });
          }
        }
      } else {
        // Bearer token validation
        const [bearer, token] = authHeader.split(' ');
        if (bearer !== 'Bearer' || !token) {
          return res.status(401).json({
            error: {
              message: 'Invalid authorization header format',
              type: 'authentication_error',
            },
          });
        }

        if (securityFramework) {
          const validationResult = securityFramework.validateToken(token);
          if (!validationResult.valid) {
            return res.status(401).json({
              error: {
                message: validationResult.error || 'Invalid token',
                type: 'authentication_error',
              },
            });
          }

          // Attach user info to request
          req.user = validationResult.user;
        }
      }

      next();
    } catch (error) {
      console.error('❌ Authentication error:', error);
      res.status(401).json({
        error: {
          message: 'Authentication failed',
          type: 'authentication_error',
        },
      });
    }
  };

  /**
   * Rate limiting middleware
   * Implements basic rate limiting
   */
  const rateLimit = (options = {}) => {
    const {
      windowMs = 60000, // 1 minute
      maxRequests = 100, // 100 requests per window
      keyGenerator = (req) => req.ip,
    } = options;

    const requests = new Map();

    // Cleanup old entries every minute
    setInterval(() => {
      const now = Date.now();
      for (const [key, value] of requests.entries()) {
        if (now - value.startTime > windowMs) {
          requests.delete(key);
        }
      }
    }, 60000);

    return (req, res, next) => {
      const key = keyGenerator(req);
      const now = Date.now();

      let requestInfo = requests.get(key);

      if (!requestInfo || now - requestInfo.startTime > windowMs) {
        requestInfo = {
          count: 0,
          startTime: now,
        };
        requests.set(key, requestInfo);
      }

      requestInfo.count++;

      if (requestInfo.count > maxRequests) {
        return res.status(429).json({
          error: {
            message: 'Too many requests, please try again later',
            type: 'rate_limit_error',
            retryAfter: Math.ceil((windowMs - (now - requestInfo.startTime)) / 1000),
          },
        });
      }

      // Add rate limit headers
      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', maxRequests - requestInfo.count);
      res.setHeader('X-RateLimit-Reset', new Date(requestInfo.startTime + windowMs).toISOString());

      next();
    };
  };

  /**
   * Request logging middleware
   * Logs all incoming requests
   */
  const logRequest = (req, res, next) => {
    const startTime = Date.now();

    // Log request
    console.log(`📥 ${req.method} ${req.path}`, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      contentLength: req.headers['content-length'],
    });

    // Log response on finish
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      console.log(`📤 ${req.method} ${req.path} ${res.statusCode} (${duration}ms)`);
    });

    next();
  };

  /**
   * Error handling middleware
   * Catches and formats errors
   */
  const handleError = (err, req, res, next) => {
    console.error('❌ Unhandled error:', err);

    // Don't expose internal errors to clients
    const statusCode = err.statusCode || err.status || 500;
    const message = statusCode === 500 ? 'Internal server error' : err.message;

    res.status(statusCode).json({
      error: {
        message,
        type: err.type || 'internal_error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
      },
    });
  };

  /**
   * CORS middleware
   * Handles Cross-Origin Resource Sharing
   */
  const cors = (options = {}) => {
    const {
      origin = '*',
      methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders = ['Content-Type', 'Authorization', 'X-API-Key'],
      exposedHeaders = ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
      credentials = true,
      maxAge = 86400, // 24 hours
    } = options;

    return (req, res, next) => {
      // Set CORS headers
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Methods', methods.join(', '));
      res.setHeader('Access-Control-Allow-Headers', allowedHeaders.join(', '));
      res.setHeader('Access-Control-Expose-Headers', exposedHeaders.join(', '));
      res.setHeader('Access-Control-Allow-Credentials', credentials.toString());
      res.setHeader('Access-Control-Max-Age', maxAge.toString());

      // Handle preflight requests
      if (req.method === 'OPTIONS') {
        return res.status(204).end();
      }

      next();
    };
  };

  /**
   * Security headers middleware
   * Adds security-related headers to responses
   */
  const securityHeaders = (req, res, next) => {
    // Prevent clickjacking
    res.setHeader('X-Frame-Options', 'DENY');

    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // XSS protection
    res.setHeader('X-XSS-Protection', '1; mode=block');

    // Content Security Policy
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self';"
    );

    // Referrer Policy
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Permissions Policy
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

    next();
  };

  return {
    validateRequest,
    sanitizeInput,
    checkSafety,
    checkResourceLimits,
    authenticate,
    rateLimit,
    logRequest,
    handleError,
    cors,
    securityHeaders,
  };
}

/**
 * Sanitize an object recursively
 * @param {Object} obj - Object to sanitize
 * @param {number} depth - Current recursion depth
 * @returns {Object} Sanitized object
 */
function sanitizeObject(obj, depth = 0) {
  // Prevent deep recursion
  if (depth > 10) {
    return null;
  }

  if (obj === null || typeof obj !== 'object') {
    if (typeof obj === 'string') {
      return sanitizeString(obj);
    }
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item, depth + 1));
  }

  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    // Sanitize key
    const sanitizedKey = sanitizeString(key);

    // Skip prototype pollution attempts
    if (sanitizedKey === '__proto__' || sanitizedKey === 'constructor' || sanitizedKey === 'prototype') {
      continue;
    }

    sanitized[sanitizedKey] = sanitizeObject(value, depth + 1);
  }

  return sanitized;
}

/**
 * Sanitize a string
 * @param {string} str - String to sanitize
 * @returns {string} Sanitized string
 */
function sanitizeString(str) {
  if (typeof str !== 'string') {
    return str;
  }

  // Remove null bytes
  let sanitized = str.replace(/\0/g, '');

  // Trim whitespace
  sanitized = sanitized.trim();

  return sanitized;
}

export default createSecurityMiddleware;
