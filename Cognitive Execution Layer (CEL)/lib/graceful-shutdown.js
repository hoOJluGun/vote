'use strict';

/**
 * Graceful Shutdown Module for Cognitive Execution Layer
 * Provides controlled shutdown with timeout management
 *
 * @module src/middleware/graceful-shutdown
 */

// ============================================================================
// SHUTDOWN STATE ENUM
// ============================================================================

const ShutdownState = {
  RUNNING: 'running',
  SHUTTING_DOWN: 'shutting_down',
  SHUTDOWN_COMPLETE: 'shutdown_complete',
  FORCE_KILLED: 'force_killed',
};

// ============================================================================
// GRACEFUL SHUTDOWN CLASS
// ============================================================================

/**
 * Graceful Shutdown Manager
 */
class GracefulShutdown {
  /**
   * Create shutdown manager
   * @param {Object} options - Configuration options
   */
  constructor(options = {}) {
    this.options = {
      timeout: 30000,
      forceExit: true,
      signals: ['SIGTERM', 'SIGINT'],
      logger: console,
      ...options,
    };

    this.state = ShutdownState.RUNNING;
    this.server = null;
    this.connections = new Set();
    this.shutdownHooks = [];
    this.isShuttingDown = false;
    this.activeRequests = 0;
  }

  /**
   * Initialize shutdown manager with server
   * @param {Object} server - HTTP server instance
   */
  init(server) {
    this.server = server;

    server.on('connection', (connection) => {
      this.connections.add(connection);
      connection.on('close', () => {
        this.connections.delete(connection);
      });
    });

    for (const signal of this.options.signals) {
      process.on(signal, () => this.handleSignal(signal));
    }

    this.options.logger.log('[GracefulShutdown] Initialized');
  }

  /**
   * Register a shutdown hook
   * @param {string} name - Hook name
   * @param {Function} hook - Async function to run during shutdown
   * @param {Object} options - Hook options
   */
  registerHook(name, hook, options = {}) {
    this.shutdownHooks.push({
      name,
      hook,
      priority: options.priority || 100,
      timeout: options.timeout || 5000,
    });

    this.shutdownHooks.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Track active request
   */
  requestStarted() {
    this.activeRequests++;
  }

  /**
   * Mark request as complete
   */
  requestFinished() {
    this.activeRequests--;
  }

  /**
   * Middleware to track active requests
   * @returns {Function} Express middleware
   */
  requestTrackerMiddleware() {
    return (req, res, next) => {
      if (this.isShuttingDown) {
        res.set('Connection', 'close');
        res.status(503).json({
          error: 'Server is shutting down',
        });
        return;
      }

      this.requestStarted();
      res.on('finish', () => {
        this.requestFinished();
      });

      next();
    };
  }

  /**
   * Handle shutdown signal
   * @param {string} signal - Signal name
   */
  async handleSignal(signal) {
    this.options.logger.log(`[GracefulShutdown] Received ${signal}`);

    if (this.isShuttingDown) {
      return;
    }

    await this.shutdown(signal);
  }

  /**
   * Perform graceful shutdown
   * @param {string} reason - Shutdown reason
   */
  async shutdown(reason = 'manual') {
    if (this.isShuttingDown) {
      return;
    }

    this.isShuttingDown = true;
    this.state = ShutdownState.SHUTTING_DOWN;

    this.options.logger.log(`[GracefulShutdown] Starting shutdown (reason: ${reason})`);

    const forceKillTimer = setTimeout(() => {
      this.options.logger.error('[GracefulShutdown] Force kill timeout reached');
      this.state = ShutdownState.FORCE_KILLED;
      process.exit(1);
    }, this.options.timeout);

    try {
      if (this.server) {
        await this.stopServer();
      }

      await this.runShutdownHooks();
      await this.closeConnections();

      clearTimeout(forceKillTimer);
      this.state = ShutdownState.SHUTDOWN_COMPLETE;

      this.options.logger.log('[GracefulShutdown] Shutdown complete');

      if (this.options.forceExit) {
        process.exit(0);
      }
    } catch (error) {
      clearTimeout(forceKillTimer);
      this.options.logger.error('[GracefulShutdown] Shutdown error:', error);
      process.exit(1);
    }
  }

  /**
   * Stop accepting new connections
   */
  async stopServer() {
    return new Promise((resolve) => {
      if (!this.server) {
        resolve();
        return;
      }

      this.server.close((err) => {
        if (err) {
          this.options.logger.error('[GracefulShutdown] Error closing server:', err);
        }
        resolve();
      });
    });
  }

  /**
   * Run all registered shutdown hooks
   */
  async runShutdownHooks() {
    for (const hookInfo of this.shutdownHooks) {
      try {
        await hookInfo.hook();
        this.options.logger.log(`[GracefulShutdown] Hook '${hookInfo.name}' completed`);
      } catch (error) {
        this.options.logger.error(`[GracefulShutdown] Hook '${hookInfo.name}' failed:`, error.message);
      }
    }
  }

  /**
   * Close all remaining connections
   */
  async closeConnections() {
    for (const connection of this.connections) {
      try {
        connection.end();
      } catch (error) {
        // Ignore
      }
    }

    await new Promise(resolve => setTimeout(resolve, 1000));

    for (const connection of this.connections) {
      try {
        connection.destroy();
      } catch (error) {
        // Ignore
      }
    }
  }

  /**
   * Get current shutdown status
   * @returns {Object} Status object
   */
  getStatus() {
    return {
      state: this.state,
      isShuttingDown: this.isShuttingDown,
      activeRequests: this.activeRequests,
      activeConnections: this.connections.size,
      registeredHooks: this.shutdownHooks.map(h => h.name),
    };
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let shutdownInstance = null;

/**
 * Get or create shutdown manager instance
 * @param {Object} options - Configuration options
 * @returns {GracefulShutdown} Shutdown manager instance
 */
function getGracefulShutdown(options = {}) {
  if (!shutdownInstance) {
    shutdownInstance = new GracefulShutdown(options);
  }
  return shutdownInstance;
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  ShutdownState,
  GracefulShutdown,
  getGracefulShutdown,
};
