/**
 * API Middleware Unit Tests
 * @module __tests__/unit/api-middleware.test.js
 */

import { vi, describe, it, test, expect, beforeEach, afterEach } from 'vitest';

// Mock uuid
vi.mock('uuid', () => ({
  v4: vi.fn(() => 'test-correlation-id-1234'),
}));

import { createApiMiddleware, ApiError, ValidationError, AuthenticationError, NotFoundError, RateLimitError } from '../../src/server/middleware/api-middleware.js';

describe('API Middleware', () => {
  let middleware;
  let mockLogger;
  let mockSecurityFramework;
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    mockLogger = {
      log: vi.fn(),
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
    };

    mockSecurityFramework = {
      validateApiKey: vi.fn().mockResolvedValue(true),
      validateToken: vi.fn().mockResolvedValue({ valid: true, user: { id: 'user-123' } }),
    };

    middleware = createApiMiddleware({
      logger: mockLogger,
      securityFramework: mockSecurityFramework,
    });

    mockReq = {
      headers: {},
      ip: '127.0.0.1',
      method: 'GET',
      path: '/test',
      connection: { remoteAddress: '127.0.0.1' },
    };

    mockRes = {
      setHeader: vi.fn(),
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
      on: vi.fn(),
    };

    mockNext = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('correlationId middleware', () => {
    test('should generate correlation ID if not provided', () => {
      middleware.correlationId(mockReq, mockRes, mockNext);

      expect(mockReq.correlationId).toBe('test-correlation-id-1234');
      expect(mockRes.setHeader).toHaveBeenCalledWith('X-Correlation-ID', 'test-correlation-id-1234');
      expect(mockNext).toHaveBeenCalled();
    });

    test('should use existing correlation ID from header', () => {
      mockReq.headers['x-correlation-id'] = 'existing-correlation-id';

      middleware.correlationId(mockReq, mockRes, mockNext);

      expect(mockReq.correlationId).toBe('existing-correlation-id');
      expect(mockRes.setHeader).toHaveBeenCalledWith('X-Correlation-ID', 'existing-correlation-id');
    });
  });

  describe('requestContext middleware', () => {
    test('should build request context', () => {
      mockReq.correlationId = 'test-correlation-id';
      mockReq.user = { id: 'user-123' };

      middleware.requestContext(mockReq, mockRes, mockNext);

      expect(mockReq.context).toEqual({
        correlationId: 'test-correlation-id',
        startTime: expect.any(Number),
        ip: '127.0.0.1',
        userAgent: undefined,
        method: 'GET',
        path: '/test',
        userId: 'user-123',
      });

      expect(mockLogger.log).toHaveBeenCalledWith('info', '→ GET /test', expect.any(Object));
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('validateBody middleware', () => {
    test('should pass validation with valid data', () => {
      mockReq.body = {
        messages: [{ role: 'user', content: 'Hello' }],
        model: 'gpt-4',
      };

      const validate = middleware.validateBody('chatCompletion');
      validate(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    test('should fail validation with missing required field', () => {
      mockReq.body = {
        model: 'gpt-4',
      };
      mockReq.correlationId = 'test-correlation-id';

      const validate = middleware.validateBody('chatCompletion');
      validate(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: {
          type: 'validation_error',
          message: 'Request validation failed',
          details: expect.arrayContaining([
            expect.objectContaining({ field: 'messages' }),
          ]),
          correlationId: 'test-correlation-id',
        },
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should fail validation with invalid type', () => {
      mockReq.body = {
        messages: 'not an array',
      };
      mockReq.correlationId = 'test-correlation-id';

      const validate = middleware.validateBody('chatCompletion');
      validate(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: {
          type: 'validation_error',
          message: 'Request validation failed',
          details: expect.arrayContaining([
            expect.objectContaining({ field: 'messages', message: expect.stringContaining('type') }),
          ]),
          correlationId: 'test-correlation-id',
        },
      });
    });

    test('should throw for unknown schema', () => {
      expect(() => middleware.validateBody('unknownSchema')).toThrow('Unknown schema: unknownSchema');
    });
  });

  describe('authenticate middleware', () => {
    test('should skip auth for public paths', async () => {
      mockReq.path = '/health';

      await middleware.authenticate(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockSecurityFramework.validateApiKey).not.toHaveBeenCalled();
    });

    test('should authenticate with valid API key', async () => {
      mockReq.headers['x-api-key'] = 'valid-api-key';
      mockReq.correlationId = 'test-correlation-id';

      await middleware.authenticate(mockReq, mockRes, mockNext);

      expect(mockSecurityFramework.validateApiKey).toHaveBeenCalledWith('valid-api-key');
      expect(mockReq.user).toEqual({ type: 'api_key', authenticated: true });
      expect(mockNext).toHaveBeenCalled();
    });

    test('should reject with invalid API key', async () => {
      mockSecurityFramework.validateApiKey.mockResolvedValueOnce(false);
      mockReq.headers['x-api-key'] = 'invalid-api-key';
      mockReq.correlationId = 'test-correlation-id';

      await middleware.authenticate(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: {
          type: 'authentication_error',
          message: 'Invalid API key',
          correlationId: 'test-correlation-id',
        },
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should authenticate with valid Bearer token', async () => {
      mockReq.headers.authorization = 'Bearer valid-token';
      mockReq.correlationId = 'test-correlation-id';

      await middleware.authenticate(mockReq, mockRes, mockNext);

      expect(mockSecurityFramework.validateToken).toHaveBeenCalledWith('valid-token');
      expect(mockReq.user).toEqual({ id: 'user-123' });
      expect(mockNext).toHaveBeenCalled();
    });

    test('should reject with invalid Bearer format', async () => {
      mockReq.headers.authorization = 'InvalidFormat token';
      mockReq.correlationId = 'test-correlation-id';

      await middleware.authenticate(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: {
          type: 'authentication_error',
          message: 'Invalid authorization header format. Expected: Bearer <token>',
          correlationId: 'test-correlation-id',
        },
      });
    });

    test('should reject when no auth provided', async () => {
      mockReq.path = '/protected';
      mockReq.correlationId = 'test-correlation-id';

      await middleware.authenticate(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: {
          type: 'authentication_error',
          message: 'Authentication required. Provide X-API-Key header or Bearer token.',
          correlationId: 'test-correlation-id',
        },
      });
    });
  });

  describe('optionalAuth middleware', () => {
    test('should call authenticate if auth headers present', async () => {
      mockReq.headers['x-api-key'] = 'valid-api-key';

      await middleware.optionalAuth(mockReq, mockRes, mockNext);

      expect(mockSecurityFramework.validateApiKey).toHaveBeenCalled();
    });

    test('should set anonymous user if no auth headers', async () => {
      await middleware.optionalAuth(mockReq, mockRes, mockNext);

      expect(mockReq.user).toEqual({ type: 'anonymous', authenticated: false });
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('rateLimit middleware', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    test('should allow requests within limit', () => {
      const rateLimit = middleware.rateLimit({ windowMs: 60000, maxRequests: 5 });
      mockReq.ip = '127.0.0.1';

      rateLimit(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', 5);
      expect(mockRes.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', 4);
    });

    test('should reject requests exceeding limit', () => {
      const rateLimit = middleware.rateLimit({ windowMs: 60000, maxRequests: 2 });
      mockReq.ip = '127.0.0.1';
      mockReq.correlationId = 'test-correlation-id';

      // Make 3 requests
      rateLimit(mockReq, mockRes, mockNext);
      rateLimit(mockReq, mockRes, mockNext);
      rateLimit(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(429);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: {
          type: 'rate_limit_error',
          message: 'Too many requests. Please try again later.',
          retryAfter: expect.any(Number),
          correlationId: 'test-correlation-id',
        },
      });
    });

    test('should skip if condition met', () => {
      const rateLimit = middleware.rateLimit({
        windowMs: 60000,
        maxRequests: 1,
        skipCondition: (req) => req.path === '/health',
      });
      mockReq.path = '/health';

      rateLimit(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('errorHandler middleware', () => {
    test('should handle generic errors', () => {
      const error = new Error('Test error');
      mockReq.correlationId = 'test-correlation-id';

      middleware.errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: {
          type: 'internal_error',
          message: 'Internal server error',
          correlationId: 'test-correlation-id',
        },
      });
    });

    test('should handle ApiError with custom status', () => {
      const error = new ApiError('Custom error', 400, 'custom_error');
      mockReq.correlationId = 'test-correlation-id';

      middleware.errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: {
          type: 'custom_error',
          message: 'Custom error',
          correlationId: 'test-correlation-id',
        },
      });
    });

    test('should include validation errors', () => {
      const error = new ValidationError('Validation failed', [{ field: 'name', message: 'Required' }]);
      mockReq.correlationId = 'test-correlation-id';

      middleware.errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: {
          type: 'validation_error',
          message: 'Validation failed',
          correlationId: 'test-correlation-id',
          validationErrors: [{ field: 'name', message: 'Required' }],
        },
      });
    });
  });

  describe('notFoundHandler middleware', () => {
    test('should return 404 with correct format', () => {
      mockReq.method = 'POST';
      mockReq.path = '/nonexistent';
      mockReq.correlationId = 'test-correlation-id';

      middleware.notFoundHandler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: {
          type: 'not_found_error',
          message: 'Endpoint not found: POST /nonexistent',
          correlationId: 'test-correlation-id',
        },
      });
    });
  });

  describe('timeout middleware', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    test('should call next immediately', () => {
      const timeout = middleware.timeout(5000);

      timeout(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    test('should timeout after specified time', () => {
      const timeout = middleware.timeout(5000);
      mockReq.correlationId = 'test-correlation-id';

      timeout(mockReq, mockRes, mockNext);

      vi.advanceTimersByTime(5000);

      expect(mockRes.status).toHaveBeenCalledWith(408);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: {
          type: 'timeout_error',
          message: 'Request timeout',
          correlationId: 'test-correlation-id',
        },
      });
    });
  });

  describe('idempotency middleware', () => {
    test('should attach idempotency key from header', () => {
      mockReq.headers['x-idempotency-key'] = 'idem-key-123';

      middleware.idempotency(mockReq, mockRes, mockNext);

      expect(mockReq.idempotencyKey).toBe('idem-key-123');
      expect(mockNext).toHaveBeenCalled();
    });

    test('should work without idempotency key', () => {
      middleware.idempotency(mockReq, mockRes, mockNext);

      expect(mockReq.idempotencyKey).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
    });
  });
});

describe('Error Classes', () => {
  test('ApiError should have correct properties', () => {
    const error = new ApiError('Test error', 400, 'test_error', { detail: 'info' });

    expect(error.message).toBe('Test error');
    expect(error.statusCode).toBe(400);
    expect(error.type).toBe('test_error');
    expect(error.details).toEqual({ detail: 'info' });
    expect(error.name).toBe('ApiError');
  });

  test('ValidationError should have validation errors', () => {
    const errors = [{ field: 'name', message: 'Required' }];
    const error = new ValidationError('Validation failed', errors);

    expect(error.statusCode).toBe(400);
    expect(error.type).toBe('validation_error');
    expect(error.validationErrors).toEqual(errors);
    expect(error.name).toBe('ValidationError');
  });

  test('AuthenticationError should have correct defaults', () => {
    const error = new AuthenticationError();

    expect(error.statusCode).toBe(401);
    expect(error.type).toBe('authentication_error');
    expect(error.message).toBe('Authentication required');
    expect(error.name).toBe('AuthenticationError');
  });

  test('NotFoundError should have correct defaults', () => {
    const error = new NotFoundError('User not found');

    expect(error.statusCode).toBe(404);
    expect(error.type).toBe('not_found_error');
    expect(error.message).toBe('User not found');
    expect(error.name).toBe('NotFoundError');
  });

  test('RateLimitError should have retryAfter', () => {
    const error = new RateLimitError(120);

    expect(error.statusCode).toBe(429);
    expect(error.type).toBe('rate_limit_error');
    expect(error.retryAfter).toBe(120);
    expect(error.name).toBe('RateLimitError');
  });
});

describe('Schema Validation', () => {
  let middleware;

  beforeEach(() => {
    middleware = createApiMiddleware({});
  });

  test('should have schemas defined', () => {
    expect(middleware.schemas).toBeDefined();
    expect(middleware.schemas.chatCompletion).toBeDefined();
    expect(middleware.schemas.codeAssist).toBeDefined();
    expect(middleware.schemas.orchestrateGoal).toBeDefined();
    expect(middleware.schemas.createGoal).toBeDefined();
    expect(middleware.schemas.createTask).toBeDefined();
    expect(middleware.schemas.checkSafety).toBeDefined();
  });

  test('chatCompletion schema should validate correctly', () => {
    const validate = middleware.validateBody('chatCompletion');

    // Valid request
    const validReq = {
      body: { messages: [{ role: 'user', content: 'Hello' }] },
      correlationId: 'test',
    };
    const validRes = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const validNext = vi.fn();

    validate(validReq, validRes, validNext);
    expect(validNext).toHaveBeenCalled();
  });

  test('orchestrateGoal schema should require query', () => {
    const validate = middleware.validateBody('orchestrateGoal');

    const invalidReq = {
      body: { context: {} },
      correlationId: 'test',
    };
    const invalidRes = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const invalidNext = vi.fn();

    validate(invalidReq, invalidRes, invalidNext);
    expect(invalidRes.status).toHaveBeenCalledWith(400);
  });
});
