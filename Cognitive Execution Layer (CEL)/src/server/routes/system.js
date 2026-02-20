/**
 * System Routes - Handles health checks, metrics, and system status
 * @module src/server/routes/system
 */

/**
 * Create system routes
 * @param {Object} app - Express app instance
 * @param {Object} deps - Dependencies
 * @param {Object} deps.usageTracker - Usage tracker instance
 * @param {Object} deps.costOptimizer - Cost optimizer instance
 * @param {Object} deps.formalSafetyModel - Safety model instance
 * @param {Object} deps.resourceGovernor - Resource governor instance
 * @param {Object} deps.stabilityEngine - Stability engine instance
 * @param {Object} deps.config - Configuration object
 */
export function systemRoutes(app, deps) {
  const { usageTracker, costOptimizer, formalSafetyModel, resourceGovernor, stabilityEngine, config } = deps;
  const { FALLBACK_MODELS, USAGE_BUDGET_LIMIT } = config;

  /**
   * GET /health - Quick health check
   */
  app.get('/health', async (req, res) => {
    const stats = await usageTracker.getUsageStats();
    const costStats = costOptimizer.getUsageStats();
    const fallbackStats = costOptimizer.getFallbackStats();

    console.log(`🏥 Health check requested: ${stats.totalRequests} total requests`);

    const stabilityStatus = stabilityEngine ? stabilityEngine.getSystemStabilityStatus() : null;

    res.json({
      status: 'ok',
      usage: stats,
      costStats,
      fallbackStats,
      budgetExceeded: usageTracker.shouldDisableProxy(),
      activeModels: FALLBACK_MODELS,
      currentTokensUsed: usageTracker.currentTokensUsed,
      budgetLimit: USAGE_BUDGET_LIMIT,
      modelHealth: FALLBACK_MODELS.map((model) => ({
        model,
        health: costOptimizer.getModelHealth(model),
      })),
      stabilityStatus,
    });
  });

  /**
   * GET /health/detailed - Detailed health report
   */
  app.get('/health/detailed', async (req, res) => {
    try {
      const stats = await usageTracker.getUsageStats();
      const costStats = costOptimizer.getUsageStats();
      const safetyStatus = formalSafetyModel ? formalSafetyModel.getSafetyStatus() : null;
      const resourceStatus = resourceGovernor ? resourceGovernor.getCurrentResourceStatus() : null;
      const stabilityStatus = stabilityEngine ? stabilityEngine.getSystemStabilityStatus() : null;

      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        components: {
          usageTracker: {
            status: 'operational',
            ...stats,
          },
          costOptimizer: {
            status: 'operational',
            ...costStats,
          },
          safetyModel: {
            status: formalSafetyModel ? 'operational' : 'not_initialized',
            ...safetyStatus,
          },
          resourceGovernor: {
            status: resourceGovernor ? 'operational' : 'not_initialized',
            ...resourceStatus,
          },
          stabilityEngine: {
            status: stabilityEngine ? 'operational' : 'not_initialized',
            ...stabilityStatus,
          },
        },
        system: {
          nodeVersion: process.version,
          platform: process.platform,
          uptime: process.uptime(),
          memoryUsage: process.memoryUsage(),
        },
      });
    } catch (error) {
      console.error('❌ Error in /health/detailed:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to get detailed health report',
      });
    }
  });

  /**
   * GET /ready - Readiness probe
   */
  app.get('/ready', async (req, res) => {
    try {
      // Check if all critical components are ready
      const checks = {
        usageTracker: usageTracker !== null,
        costOptimizer: costOptimizer !== null,
      };

      const allReady = Object.values(checks).every((v) => v);

      if (allReady) {
        res.json({
          ready: true,
          checks,
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(503).json({
          ready: false,
          checks,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      res.status(503).json({
        ready: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  });

  /**
   * GET /live - Liveness probe
   */
  app.get('/live', (req, res) => {
    res.json({
      alive: true,
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * GET /usage - Get usage statistics
   */
  app.get('/usage', async (req, res) => {
    const stats = await usageTracker.getUsageStats();
    const costStats = costOptimizer.getUsageStats();
    const fallbackStats = costOptimizer.getFallbackStats();
    const history = usageTracker.getHistory(24);

    console.log(`📊 Usage stats requested: ${stats.totalRequests} total requests`);

    res.json({
      stats,
      costStats,
      fallbackStats,
      recentActivity: history,
      budgetLimit: USAGE_BUDGET_LIMIT,
      currentUsage: usageTracker.currentTokensUsed,
      budgetExceeded: usageTracker.shouldDisableProxy(),
    });
  });

  /**
   * GET /metrics/requests - Get request metrics
   */
  app.get('/metrics/requests', async (req, res) => {
    const stats = await usageTracker.getUsageStats();
    res.json({
      metrics: stats,
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * GET /recommend-model/:taskType/:tokens - Get model recommendation
   */
  app.get('/recommend-model/:taskType/:tokens', (req, res) => {
    const taskType = req.params.taskType;
    const tokens = parseInt(req.params.tokens);
    const remainingBudget = USAGE_BUDGET_LIMIT
      ? USAGE_BUDGET_LIMIT - usageTracker.currentTokensUsed
      : Infinity;

    const recommendation = costOptimizer.recommendModel(taskType, tokens, remainingBudget);

    if (recommendation) {
      console.log(`🔍 Model recommendation: ${recommendation.model} for ${taskType} task with ${tokens} tokens`);
      res.json(recommendation);
    } else {
      res.status(400).json({ error: 'No suitable model found within budget constraints' });
    }
  });

  /**
   * GET /v1/resource-status - Get resource status
   */
  app.get('/v1/resource-status', async (req, res) => {
    try {
      if (!resourceGovernor) {
        return res.status(503).json({
          error: {
            message: 'Resource governor not initialized',
            type: 'service_unavailable',
          },
        });
      }

      const status = resourceGovernor.getCurrentResourceStatus();

      res.json({
        status: status,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('❌ Error in /v1/resource-status:', error);
      res.status(500).json({
        error: {
          message: 'Failed to get resource status',
          type: 'invalid_request_error',
        },
      });
    }
  });

  /**
   * GET /v1/safety-status - Get safety status
   */
  app.get('/v1/safety-status', async (req, res) => {
    try {
      if (!formalSafetyModel) {
        return res.status(503).json({
          error: {
            message: 'Safety model not initialized',
            type: 'service_unavailable',
          },
        });
      }

      const status = formalSafetyModel.getSafetyStatus();

      res.json({
        status: status,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('❌ Error in /v1/safety-status:', error);
      res.status(500).json({
        error: {
          message: 'Failed to get safety status',
          type: 'invalid_request_error',
        },
      });
    }
  });

  /**
   * POST /v1/check-safety - Check operation safety
   */
  app.post('/v1/check-safety', async (req, res) => {
    try {
      const { operation } = req.body;

      if (!operation) {
        return res.status(400).json({
          error: {
            message: 'Operation object is required',
            type: 'invalid_request_error',
          },
        });
      }

      if (!formalSafetyModel) {
        return res.status(503).json({
          error: {
            message: 'Safety model not initialized',
            type: 'service_unavailable',
          },
        });
      }

      const safetyCheck = formalSafetyModel.validateOperation(operation);

      res.json({
        safe: safetyCheck.safe,
        violations: safetyCheck.violations,
        warnings: safetyCheck.warnings,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('❌ Error in /v1/check-safety:', error);
      res.status(500).json({
        error: {
          message: 'Failed to check operation safety',
          type: 'invalid_request_error',
        },
      });
    }
  });

  /**
   * GET /v1/evolution-level - Get evolution level
   */
  app.get('/v1/evolution-level', async (req, res) => {
    try {
      const { evolutionEngine } = deps;
      if (!evolutionEngine) {
        return res.status(503).json({
          error: {
            message: 'Evolution engine not initialized',
            type: 'service_unavailable',
          },
        });
      }

      const level = evolutionEngine.getChangeStatistics();

      res.json({
        level: level,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('❌ Error in /v1/evolution-level:', error);
      res.status(500).json({
        error: {
          message: 'Failed to get evolution level',
          type: 'invalid_request_error',
        },
      });
    }
  });

  /**
   * GET /v1/change-statistics - Get change statistics
   */
  app.get('/v1/change-statistics', async (req, res) => {
    try {
      const { evolutionEngine } = deps;
      if (!evolutionEngine) {
        return res.status(503).json({
          error: {
            message: 'Evolution engine not initialized',
            type: 'service_unavailable',
          },
        });
      }

      const stats = evolutionEngine.getChangeStatistics();

      res.json({
        statistics: stats,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('❌ Error in /v1/change-statistics:', error);
      res.status(500).json({
        error: {
          message: 'Failed to get change statistics',
          type: 'invalid_request_error',
        },
      });
    }
  });

  /**
   * POST /v1/calculate-change-vector - Calculate change vector
   */
  app.post('/v1/calculate-change-vector', async (req, res) => {
    try {
      const { changeData } = req.body;

      if (!changeData) {
        return res.status(400).json({
          error: {
            message: 'Change data object is required',
            type: 'invalid_request_error',
          },
        });
      }

      const { evolutionEngine } = deps;
      if (!evolutionEngine) {
        return res.status(503).json({
          error: {
            message: 'Evolution engine not initialized',
            type: 'service_unavailable',
          },
        });
      }

      const vector = evolutionEngine.calculateChangeVector(changeData);

      res.json({
        vector: vector,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('❌ Error in /v1/calculate-change-vector:', error);
      res.status(500).json({
        error: {
          message: 'Failed to calculate change vector',
          type: 'invalid_request_error',
        },
      });
    }
  });

  /**
   * GET /v1/trend-analysis - Get trend analysis
   */
  app.get('/v1/trend-analysis', async (req, res) => {
    try {
      const { evolutionEngine } = deps;
      if (!evolutionEngine) {
        return res.status(503).json({
          error: {
            message: 'Evolution engine not initialized',
            type: 'service_unavailable',
          },
        });
      }

      const analysis = evolutionEngine.analyzeTrends();

      res.json({
        analysis: analysis,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('❌ Error in /v1/trend-analysis:', error);
      res.status(500).json({
        error: {
          message: 'Failed to get trend analysis',
          type: 'invalid_request_error',
        },
      });
    }
  });
}
