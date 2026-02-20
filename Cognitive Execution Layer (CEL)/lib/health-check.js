'use strict';

/**
 * Health Check Module for Cognitive Execution Layer
 * Provides comprehensive health monitoring and diagnostics
 *
 * @module src/middleware/health-check
 */

// ============================================================================
// HEALTH STATUS ENUM
// ============================================================================

const HealthStatus = {
  HEALTHY: 'healthy',
  DEGRADED: 'degraded',
  UNHEALTHY: 'unhealthy',
  UNKNOWN: 'unknown',
};

// ============================================================================
// HEALTH CHECK RESULT CLASS
// ============================================================================

/**
 * Individual health check result
 */
class HealthCheckResult {
  constructor(name, status, details = {}, error = null) {
    this.name = name;
    this.status = status;
    this.details = details;
    this.error = error;
    this.timestamp = new Date().toISOString();
    this.duration = null;
  }

  toJSON() {
    return {
      name: this.name,
      status: this.status,
      details: this.details,
      error: this.error,
      timestamp: this.timestamp,
      duration: this.duration ? `${this.duration}ms` : null,
    };
  }
}

// ============================================================================
// HEALTH CHECK MANAGER CLASS
// ============================================================================

/**
 * Health Check Manager
 */
class HealthCheckManager {
  /**
   * Create health check manager
   * @param {Object} options - Configuration options
   */
  constructor(options = {}) {
    this.options = {
      timeout: 5000,
      ...options,
    };

    this.subsystemStatus = new Map();
    this.lastCheck = null;
    this.startTime = Date.now();
  }

  /**
   * Register a subsystem for health tracking
   * @param {string} name - Subsystem name
   * @param {Object} info - Subsystem info
   */
  registerSubsystem(name, info = {}) {
    this.subsystemStatus.set(name, {
      status: HealthStatus.HEALTHY,
      lastUpdate: new Date().toISOString(),
      ...info,
    });
  }

  /**
   * Check memory health
   * @returns {Promise<HealthCheckResult>}
   */
  async checkMemory() {
    const os = require('os');
    const total = os.totalmem();
    const free = os.freemem();
    const used = total - free;
    const usedPercent = (used / total) * 100;

    const processMemory = process.memoryUsage();

    let status = HealthStatus.HEALTHY;
    if (usedPercent >= 95) {
      status = HealthStatus.UNHEALTHY;
    } else if (usedPercent >= 80) {
      status = HealthStatus.DEGRADED;
    }

    return new HealthCheckResult('memory', status, {
      system: {
        total: `${Math.round(total / 1024 / 1024)}MB`,
        used: `${Math.round(used / 1024 / 1024)}MB`,
        usedPercent: `${usedPercent.toFixed(1)}%`,
      },
      process: {
        rss: `${Math.round(processMemory.rss / 1024 / 1024)}MB`,
        heapUsed: `${Math.round(processMemory.heapUsed / 1024 / 1024)}MB`,
      },
    });
  }

  /**
   * Check subsystems health
   * @returns {Promise<HealthCheckResult>}
   */
  async checkSubsystems() {
    const subsystems = [];

    for (const [name, info] of this.subsystemStatus) {
      subsystems.push({
        name,
        status: info.status,
        lastUpdate: info.lastUpdate,
      });
    }

    const unhealthyCount = subsystems.filter(s => s.status === HealthStatus.UNHEALTHY).length;
    const degradedCount = subsystems.filter(s => s.status === HealthStatus.DEGRADED).length;

    let status = HealthStatus.HEALTHY;
    if (unhealthyCount > 0) {
      status = HealthStatus.UNHEALTHY;
    } else if (degradedCount > 0) {
      status = HealthStatus.DEGRADED;
    }

    return new HealthCheckResult('subsystems', status, { subsystems });
  }

  /**
   * Run all health checks
   * @returns {Promise<Object>} Complete health report
   */
  async runAllChecks() {
    const startTime = Date.now();
    const results = [];

    results.push(await this.checkMemory());
    results.push(await this.checkSubsystems());

    const statusCounts = {
      [HealthStatus.HEALTHY]: 0,
      [HealthStatus.DEGRADED]: 0,
      [HealthStatus.UNHEALTHY]: 0,
      [HealthStatus.UNKNOWN]: 0,
    };

    for (const result of results) {
      statusCounts[result.status]++;
    }

    let overallStatus = HealthStatus.HEALTHY;
    if (statusCounts[HealthStatus.UNHEALTHY] > 0) {
      overallStatus = HealthStatus.UNHEALTHY;
    } else if (statusCounts[HealthStatus.DEGRADED] > 0) {
      overallStatus = HealthStatus.DEGRADED;
    }

    const report = {
      status: overallStatus,
      version: process.env.npm_package_version || '1.0.0',
      uptime: `${Math.round((Date.now() - this.startTime) / 1000)}s`,
      timestamp: new Date().toISOString(),
      duration: `${Date.now() - startTime}ms`,
      checks: results.map(r => r.toJSON()),
      summary: {
        total: results.length,
        healthy: statusCounts[HealthStatus.HEALTHY],
        degraded: statusCounts[HealthStatus.DEGRADED],
        unhealthy: statusCounts[HealthStatus.UNHEALTHY],
      },
    };

    this.lastCheck = report;
    return report;
  }

  /**
   * Get quick health status
   * @returns {Object} Quick health status
   */
  getQuickStatus() {
    return {
      status: this.lastCheck?.status || HealthStatus.UNKNOWN,
      uptime: `${Math.round((Date.now() - this.startTime) / 1000)}s`,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Create Express middleware for health endpoint
   * @param {Object} options - Middleware options
   * @returns {Function} Express middleware
   */
  middleware(options = {}) {
    const { detailed = false, path = '/health' } = options;

    return async (req, res, next) => {
      if (req.path !== path) {
        return next();
      }

      try {
        if (detailed || req.query.detailed === 'true') {
          const report = await this.runAllChecks();
          const statusCode = report.status === HealthStatus.HEALTHY ? 200 : 503;
          res.status(statusCode).json(report);
        } else {
          const status = this.getQuickStatus();
          const statusCode = status.status === HealthStatus.HEALTHY ? 200 : 503;
          res.status(statusCode).json(status);
        }
      } catch (error) {
        res.status(503).json({
          status: HealthStatus.UNHEALTHY,
          error: error.message,
        });
      }
    };
  }

  /**
   * Create readiness probe middleware
   * @returns {Function} Express middleware
   */
  readinessMiddleware() {
    return async (req, res, next) => {
      if (req.path !== '/ready') {
        return next();
      }

      try {
        const report = await this.runAllChecks();
        const isReady = report.status !== HealthStatus.UNHEALTHY;

        res.status(isReady ? 200 : 503).json({
          ready: isReady,
          status: report.status,
        });
      } catch (error) {
        res.status(503).json({
          ready: false,
          error: error.message,
        });
      }
    };
  }

  /**
   * Create liveness probe middleware
   * @returns {Function} Express middleware
   */
  livenessMiddleware() {
    return (req, res, next) => {
      if (req.path !== '/live') {
        return next();
      }

      res.status(200).json({
        alive: true,
        uptime: `${Math.round((Date.now() - this.startTime) / 1000)}s`,
      });
    };
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let healthCheckInstance = null;

/**
 * Get or create health check instance
 * @param {Object} options - Configuration options
 * @returns {HealthCheckManager} Health check instance
 */
function getHealthCheck(options = {}) {
  if (!healthCheckInstance) {
    healthCheckInstance = new HealthCheckManager(options);
  }
  return healthCheckInstance;
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  HealthStatus,
  HealthCheckResult,
  HealthCheckManager,
  getHealthCheck,
};
