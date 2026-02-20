'use strict';

/**
 * Request Logger Module for Cognitive Execution Layer
 * Provides comprehensive request/response logging with sanitization
 *
 * @module src/middleware/request-logger
 */

// ============================================================================
// SENSITIVE FIELDS
// ============================================================================

/**
 * Sensitive fields that should be redacted in logs
 */
const SENSITIVE_FIELDS = [
  'password',
  'token',
  'accessToken',
  'refreshToken',
  'apiKey',
  'secret',
  'authorization',
  'credentials',
  'privateKey',
  'sessionId',
  'cookie',
];

// ============================================================================
// REQUEST LOGGER CLASS
// ============================================================================

/**
 * Request Logger class
 */
class RequestLogger {
  /**
   * Create a request logger
   * @param {Object} options - Logger options
   */
  constructor(options = {}) {
    this.options = {
      logRequests: true,
      logResponses: true,
      logBody: true,
      sensitiveFields: SENSITIVE_FIELDS,
      maxBodyLength: 1000,
      excludePaths: ['/health', '/metrics', '/favicon.ico'],
      ...options,
    };

    this.stats = {
      totalRequests: 0,
      errors: 0,
      slowRequests: 0,
      byMethod: {},
      byPath: {},
    };
  }

  /**
   * Redact sensitive fields from an object
   * @param {*} obj - Object to redact
   * @param {number} depth - Current recursion depth
   * @returns {*} Redacted object
   */
  redact(obj, depth = 0) {
    if (depth > 10) {
      return '[MAX_DEPTH]';
    }
    if (obj === null || obj === undefined) {
      return obj;
    }
    if (typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.redact(item, depth + 1));
    }

    const redacted = {};
    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();

      if (this.options.sensitiveFields.some(f => lowerKey.includes(f.toLowerCase()))) {
        redacted[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        redacted[key] = this.redact(value, depth + 1);
      } else {
        redacted[key] = value;
      }
    }

    return redacted;
  }

  /**
   * Generate unique request ID
   * @returns {string} Request ID
   */
  generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Get client IP from request
   * @param {Object} req - Express request
   * @returns {string} Client IP
   */
  getClientIp(req) {
    return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      req.headers['x-real-ip'] ||
      req.connection?.remoteAddress ||
      'unknown';
  }

  /**
   * Update statistics
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   * @param {number} duration - Request duration in ms
   */
  updateStats(req, res, duration) {
    this.stats.totalRequests++;

    const method = req.method;
    this.stats.byMethod[method] = (this.stats.byMethod[method] || 0) + 1;

    if (res.statusCode >= 400) {
      this.stats.errors++;
    }

    if (duration > 1000) {
      this.stats.slowRequests++;
    }
  }

  /**
   * Get current statistics
   * @returns {Object} Statistics object
   */
  getStats() {
    return {
      ...this.stats,
      errorRate: this.stats.totalRequests > 0
        ? ((this.stats.errors / this.stats.totalRequests) * 100).toFixed(2) + '%'
        : '0%',
    };
  }

  /**
   * Create Express middleware
   * @returns {Function} Express middleware
   */
  middleware() {
    return (req, res, next) => {
      if (this.options.excludePaths.some(p => req.path.startsWith(p))) {
        return next();
      }

      const requestId = this.generateRequestId();
      const startTime = Date.now();
      const clientIp = this.getClientIp(req);

      req.requestId = requestId;
      req.startTime = startTime;

      if (this.options.logRequests) {
        const logData = {
          id: requestId,
          type: 'REQUEST',
          method: req.method,
          url: req.originalUrl,
          ip: clientIp,
          timestamp: new Date().toISOString(),
        };

        if (this.options.logBody && req.body && Object.keys(req.body).length > 0) {
          logData.body = this.redact(req.body);
        }

        console.log(JSON.stringify(logData));
      }

      res.on('finish', () => {
        const duration = Date.now() - startTime;
        this.updateStats(req, res, duration);

        if (this.options.logResponses) {
          const logData = {
            id: requestId,
            type: 'RESPONSE',
            statusCode: res.statusCode,
            duration: `${duration}ms`,
            timestamp: new Date().toISOString(),
          };

          if (res.statusCode >= 500) {
            console.error(JSON.stringify(logData));
          } else if (res.statusCode >= 400) {
            console.warn(JSON.stringify(logData));
          } else {
            console.log(JSON.stringify(logData));
          }
        }
      });

      next();
    };
  }
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/**
 * Create logging middleware with default options
 * @param {Object} options - Logger options
 * @returns {Function} Express middleware
 */
function requestLoggerMiddleware(options = {}) {
  const logger = new RequestLogger(options);
  return logger.middleware();
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  RequestLogger,
  requestLoggerMiddleware,
};
