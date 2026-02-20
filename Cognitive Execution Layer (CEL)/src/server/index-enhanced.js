/**
 * CEL Enhanced Server - Production-ready server with full middleware stack
 * @module src/server/index-enhanced
 */

import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';
import cors from 'cors';
import compression from 'compression';

import { createApiMiddleware, ApiError } from './middleware/api-middleware.js';
import { createSecurityMiddleware } from './middleware/security.js';
import { createAppContainer } from './container/index.js';
import { createLogger } from './utils/logger.js';

// Import routes
import { chatRoutes } from './routes/chat.js';
import { orchestrationRoutes } from './routes/orchestration.js';
import { cognitiveRoutes } from './routes/cognitive.js';
import { reliabilityRoutes } from './routes/reliability.js';
import { systemRoutes } from './routes/system.js';
import { xcodeRoutes } from './routes/xcode.js';

/**
 * Create and configure the CEL server
 * @param {Object} config - Server configuration
 * @returns {Object} Server instance and utilities
 */
export function createCELServer(config = {}) {
  const app = express();
  const server = http.createServer(app);

  // Initialize container
  const container = createAppContainer(config);

  // Initialize logger
  const logger = createLogger({
    level: config.LOG_LEVEL || 'info',
    format: 'json',
  });

  // Initialize middleware
  const apiMiddleware = createApiMiddleware({
    logger,
    securityFramework: container.resolve('securityFramework'),
  });

  const securityMiddleware = createSecurityMiddleware({
    formalSafetyModel: container.resolve('formalSafetyModel'),
    resourceGovernor: container.resolve('resourceGovernor'),
    inputValidator: container.resolve('inputValidator'),
    securityFramework: container.resolve('securityFramework'),
  });

  // =====================
  // Global Middleware
  // =====================

  // Trust proxy for rate limiting
  app.set('trust proxy', 1);

  // CORS
  app.use(cors({
    origin: config.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-API-Key',
      'X-Correlation-ID',
      'X-Idempotency-Key',
    ],
    exposedHeaders: [
      'X-Correlation-ID',
      'X-RateLimit-Limit',
      'X-RateLimit-Remaining',
      'X-RateLimit-Reset',
    ],
    credentials: true,
    maxAge: 86400,
  }));

  // Compression
  app.use(compression({ filter: apiMiddleware.shouldCompress }));

  // Security headers
  app.use(securityMiddleware.securityHeaders);

  // Request parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Correlation ID
  app.use(apiMiddleware.correlationId);

  // Request context
  app.use(apiMiddleware.requestContext);

  // Request logging
  app.use(securityMiddleware.logRequest);

  // Input sanitization
  app.use(securityMiddleware.sanitizeInput);

  // Request validation
  app.use(securityMiddleware.validateRequest);

  // Request timeout
  app.use(apiMiddleware.timeout(config.REQUEST_TIMEOUT || 30000));

  // Idempotency
  app.use(apiMiddleware.idempotency);

  // =====================
  // Health Endpoints (no auth required)
  // =====================

  app.get('/health', async (req, res) => {
    const usageTracker = container.resolve('usageTracker');
    const costOptimizer = container.resolve('costOptimizer');
    const stats = await usageTracker.getUsageStats();

    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: config.VERSION || '4.2.0',
      uptime: process.uptime(),
      correlationId: req.correlationId,
      usage: stats,
    });
  });

  app.get('/health/detailed', async (req, res) => {
    const usageTracker = container.resolve('usageTracker');
    const costOptimizer = container.resolve('costOptimizer');
    const formalSafetyModel = container.resolve('formalSafetyModel');
    const resourceGovernor = container.resolve('resourceGovernor');

    const stats = await usageTracker.getUsageStats();
    const costStats = costOptimizer.getUsageStats();
    const safetyStatus = formalSafetyModel.getSafetyStatus();
    const resourceStatus = resourceGovernor.getCurrentResourceStatus();

    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      correlationId: req.correlationId,
      components: {
        usageTracker: { status: 'operational', ...stats },
        costOptimizer: { status: 'operational', ...costStats },
        safetyModel: { status: 'operational', ...safetyStatus },
        resourceGovernor: { status: 'operational', ...resourceStatus },
      },
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
      },
    });
  });

  app.get('/live', (req, res) => {
    res.json({ alive: true, timestamp: new Date().toISOString() });
  });

  app.get('/ready', async (req, res) => {
    try {
      const usageTracker = container.resolve('usageTracker');
      const costOptimizer = container.resolve('costOptimizer');

      const checks = {
        usageTracker: usageTracker !== null,
        costOptimizer: costOptimizer !== null,
        container: container !== null,
      };

      const allReady = Object.values(checks).every(Boolean);

      res.status(allReady ? 200 : 503).json({
        ready: allReady,
        checks,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(503).json({
        ready: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  });

  // =====================
  // API Routes with Authentication
  // =====================

  // Optional auth for backward compatibility
  app.use('/v1', apiMiddleware.optionalAuth);

  // Rate limiting per endpoint type
  app.use('/v1/chat', apiMiddleware.rateLimits.chat);
  app.use('/v1/code-assist', apiMiddleware.rateLimits.codeAssist);
  app.use('/v1/orchestrate', apiMiddleware.rateLimits.orchestration);
  app.use('/v1/goals', apiMiddleware.rateLimits.orchestration);
  app.use('/v1/tasks', apiMiddleware.rateLimits.orchestration);

  // Register routes
  const deps = {
    usageTracker: container.resolve('usageTracker'),
    costOptimizer: container.resolve('costOptimizer'),
    formalSafetyModel: container.resolve('formalSafetyModel'),
    resourceGovernor: container.resolve('resourceGovernor'),
    stabilityEngine: container.resolve('stabilityEngine'),
    evolutionEngine: container.resolve('evolutionEngine'),
    orchestrationEngine: container.resolve('orchestrationEngine'),
    cognitiveWorkspaceCore: container.resolve('cognitiveWorkspaceCore'),
    projectKnowledgeGraph: container.resolve('projectKnowledgeGraph'),
    config,
  };

  chatRoutes(app, deps);
  orchestrationRoutes(app, deps);
  cognitiveRoutes(app, deps);
  reliabilityRoutes(app, deps);
  systemRoutes(app, deps);
  xcodeRoutes(app, deps);

  // =====================
  // Error Handling
  // =====================

  // 404 handler
  app.use(apiMiddleware.notFoundHandler);

  // Global error handler
  app.use(apiMiddleware.errorHandler);

  // =====================
  // WebSocket Server
  // =====================

  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws, req) => {
    const correlationId = req.headers['x-correlation-id'] ||
      `ws-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    ws.correlationId = correlationId;
    ws.isAlive = true;
    ws.authenticated = false;

    logger.log('info', 'WebSocket connected', { correlationId });

    // Send welcome message
    ws.send(JSON.stringify({
      type: 'connected',
      correlationId,
      timestamp: new Date().toISOString(),
    }));

    // Heartbeat
    ws.on('pong', () => {
      ws.isAlive = true;
    });

    // Message handling
    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        await handleWebSocketMessage(ws, message, container, logger);
      } catch (error) {
        logger.log('error', 'WebSocket message error', {
          correlationId: ws.correlationId,
          error: error.message,
        });
        ws.send(JSON.stringify({
          type: 'error',
          error: error.message,
          correlationId: ws.correlationId,
        }));
      }
    });

    // Close handling
    ws.on('close', () => {
      logger.log('info', 'WebSocket disconnected', { correlationId: ws.correlationId });
    });
  });

  // Heartbeat interval
  const heartbeatInterval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (!ws.isAlive) {
        return ws.terminate();
      }
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on('close', () => {
    clearInterval(heartbeatInterval);
  });

  // =====================
  // Graceful Shutdown
  // =====================

  const shutdown = async () => {
    logger.log('info', 'Shutting down server...');

    // Close WebSocket server
    wss.close(() => {
      logger.log('info', 'WebSocket server closed');
    });

    // Close HTTP server
    server.close(() => {
      logger.log('info', 'HTTP server closed');
      process.exit(0);
    });

    // Force close after timeout
    setTimeout(() => {
      logger.log('warn', 'Forcing shutdown...');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  return {
    app,
    server,
    wss,
    container,
    logger,
  };
}

/**
 * Handle WebSocket messages
 */
async function handleWebSocketMessage(ws, message, container, logger) {
  const { type, payload, requestId } = message;

  switch (type) {
    case 'auth': {
      const { token, apiKey } = payload;
      const securityFramework = container.resolve('securityFramework');

      if (apiKey) {
        const isValid = await securityFramework.validateApiKey(apiKey);
        if (isValid) {
          ws.authenticated = true;
          ws.send(JSON.stringify({
            type: 'auth_success',
            requestId,
            correlationId: ws.correlationId,
          }));
          return;
        }
      }

      if (token) {
        const result = await securityFramework.validateToken(token);
        if (result.valid) {
          ws.authenticated = true;
          ws.user = result.user;
          ws.send(JSON.stringify({
            type: 'auth_success',
            requestId,
            correlationId: ws.correlationId,
          }));
          return;
        }
      }

      ws.send(JSON.stringify({
        type: 'auth_failed',
        requestId,
        correlationId: ws.correlationId,
        error: 'Invalid credentials',
      }));
      break;
    }

    case 'chat': {
      if (!ws.authenticated) {
        ws.send(JSON.stringify({
          type: 'error',
          requestId,
          correlationId: ws.correlationId,
          error: 'Authentication required',
        }));
        return;
      }

      // Forward to chat completion logic
      // This would integrate with the chat routes
      ws.send(JSON.stringify({
        type: 'chat_response',
        requestId,
        correlationId: ws.correlationId,
        message: 'Chat processing not implemented in WebSocket',
      }));
      break;
    }

    case 'ping': {
      ws.send(JSON.stringify({
        type: 'pong',
        requestId,
        correlationId: ws.correlationId,
        timestamp: new Date().toISOString(),
      }));
      break;
    }

    case 'subscribe': {
      const { channel } = payload;
      ws.channels = ws.channels || [];
      ws.channels.push(channel);
      ws.send(JSON.stringify({
        type: 'subscribed',
        requestId,
        correlationId: ws.correlationId,
        channel,
      }));
      break;
    }

    default: {
      ws.send(JSON.stringify({
        type: 'error',
        requestId,
        correlationId: ws.correlationId,
        error: `Unknown message type: ${type}`,
      }));
    }
  }
}

/**
 * Start the server
 */
export async function startServer(config = {}) {
  const { server, logger } = createCELServer(config);

  const port = config.PORT || 3000;
  const host = config.HOST || '0.0.0.0';

  return new Promise((resolve) => {
    server.listen(port, host, () => {
      logger.log('info', `CEL Server started`, {
        port,
        host,
        version: config.VERSION || '4.2.0',
        nodeVersion: process.version,
      });
      console.log(`🚀 CEL Server running on http://${host}:${port}`);
      console.log(`📡 WebSocket available at ws://${host}:${port}/ws`);
      resolve({ server, logger });
    });
  });
}

export default createCELServer;
