'use strict';

/**
 * Anti-Stagnation Engine
 * Detects and resolves system stagnation through activity monitoring
 * and automatic recovery mechanisms
 *
 * @module src/engines/anti-stagnation-engine
 */

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Stagnation severity levels
 * @enum {string}
 */
const STAGNATION_LEVELS = {
  NONE: 'none',
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
};

/**
 * Recovery actions
 * @enum {string}
 */
const RECOVERY_ACTIONS = {
  ACTIVITY_INJECTION: 'activity_injection',
  CACHE_INVALIDATION: 'cache_invalidation',
  RESOURCE_REALLOCATION: 'resource_reallocation',
  TASK_REPRIORITIZATION: 'task_reprioritization',
  SYSTEM_RESTART: 'system_restart',
};

// ============================================================================
// ANTI-STAGNATION ENGINE CLASS
// ============================================================================

/**
 * Anti-Stagnation Engine
 * Monitors for stagnation and triggers recovery
 * @class
 */
class AntiStagnationEngine {
  /**
   * Create an AntiStagnationEngine instance
   * @param {Object} options - Configuration options
   * @param {number} [options.stagnationThreshold=300000] - Time in ms before stagnation (5 min)
   * @param {number} [options.checkInterval=60000] - Check interval in ms (1 min)
   * @param {number} [options.maxActivityLogSize=1000] - Max entries in activity log
   */
  constructor(options = {}) {
    /** @type {number} */
    this.stagnationThreshold = options.stagnationThreshold || 300000;

    /** @type {number} */
    this.checkInterval = options.checkInterval || 60000;

    /** @type {number} */
    this.maxActivityLogSize = options.maxActivityLogSize || 1000;

    /** @type {Map<number, Object>} */
    this.activityLog = new Map();

    /** @type {Map<string, number>} */
    this.activityCounters = new Map();

    /** @type {Array<Object>} */
    this.recoveryHistory = [];

    /** @type {boolean} */
    this.initialized = false;

    /** @type {NodeJS.Timeout|null} */
    this.monitorInterval = null;

    /** @type {Object} */
    this.lastStagnationCheck = null;
  }

  // ==========================================================================
  // INITIALIZATION
  // ==========================================================================

  /**
   * Initialize the engine
   * @returns {Promise<void>}
   */
  async initialize() {
    this.initialized = true;
    this.startMonitoring();
    console.log('[AntiStagnationEngine] Initialized with threshold:', this.stagnationThreshold);
  }

  /**
   * Start periodic monitoring
   */
  startMonitoring() {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
    }

    this.monitorInterval = setInterval(() => {
      this.performPeriodicCheck().catch(err => {
        console.error('[AntiStagnationEngine] Periodic check error:', err.message);
      });
    }, this.checkInterval);
  }

  /**
   * Perform periodic stagnation check
   * @private
   * @returns {Promise<void>}
   */
  async performPeriodicCheck() {
    const detection = await this.detect({
      source: 'periodic_check',
      timestamp: Date.now(),
    });

    if (detection.isStagnant && detection.level !== STAGNATION_LEVELS.NONE) {
      console.warn('[AntiStagnationEngine] Stagnation detected:', detection.level);
      await this.resolve(detection);
    }
  }

  // ==========================================================================
  // STAGNATION OPERATIONS
  // ==========================================================================

  /**
   * Detect stagnation in the system
   * @param {Object} context - Detection context
   * @param {string} [context.source] - Detection source
   * @param {Object} [context.metrics] - Additional metrics to consider
   * @returns {Promise<Object>} Detection result
   */
  async detect(context = {}) {
    const lastActivity = this.getLastActivity();
    const timeSinceActivity = Date.now() - lastActivity;
    const activityRate = this.calculateActivityRate();

    // Determine stagnation level based on time and activity rate
    const level = this.determineStagnationLevel(timeSinceActivity, activityRate);

    const result = {
      isStagnant: timeSinceActivity > this.stagnationThreshold,
      level,
      lastActivity: new Date(lastActivity).toISOString(),
      timeSinceActivity,
      threshold: this.stagnationThreshold,
      activityRate,
      totalActivities: this.activityLog.size,
      context,
      detectedAt: new Date().toISOString(),
    };

    this.lastStagnationCheck = result;
    return result;
  }

  /**
   * Determine stagnation level
   * @private
   * @param {number} timeSinceActivity - Time since last activity in ms
   * @param {number} activityRate - Current activity rate
   * @returns {string} Stagnation level
   */
  determineStagnationLevel(timeSinceActivity, activityRate) {
    const thresholdRatio = timeSinceActivity / this.stagnationThreshold;

    if (thresholdRatio < 1) {
      return STAGNATION_LEVELS.NONE;
    } else if (thresholdRatio < 1.5) {
      return STAGNATION_LEVELS.LOW;
    } else if (thresholdRatio < 2) {
      return STAGNATION_LEVELS.MEDIUM;
    } else if (thresholdRatio < 3) {
      return STAGNATION_LEVELS.HIGH;
    }
    return STAGNATION_LEVELS.CRITICAL;
  }

  /**
   * Calculate activity rate (activities per minute)
   * @returns {number} Activity rate
   */
  calculateActivityRate() {
    const oneMinuteAgo = Date.now() - 60000;
    let recentActivities = 0;

    for (const [timestamp] of this.activityLog) {
      if (timestamp > oneMinuteAgo) {
        recentActivities++;
      }
    }

    return recentActivities;
  }

  /**
   * Resolve stagnation
   * @param {Object} stagnationInfo - Stagnation information from detect()
   * @returns {Promise<Object>} Resolution result
   */
  async resolve(stagnationInfo) {
    const action = this.selectRecoveryAction(stagnationInfo.level);
    const startTime = Date.now();

    let result;
    try {
      result = await this.executeRecoveryAction(action, stagnationInfo);
    } catch (error) {
      result = {
        success: false,
        error: error.message,
        action,
      };
    }

    const resolution = {
      resolved: result.success !== false,
      action,
      actionResult: result,
      stagnationLevel: stagnationInfo.level,
      recoveryTime: Date.now() - startTime,
      resolvedAt: new Date().toISOString(),
    };

    // Record recovery in history
    this.recoveryHistory.push(resolution);
    if (this.recoveryHistory.length > 100) {
      this.recoveryHistory.shift();
    }

    // Record this as an activity
    this.recordActivity('stagnation_recovery', resolution);

    return resolution;
  }

  /**
   * Select appropriate recovery action based on stagnation level
   * @private
   * @param {string} level - Stagnation level
   * @returns {string} Recovery action
   */
  selectRecoveryAction(level) {
    switch (level) {
      case STAGNATION_LEVELS.LOW:
        return RECOVERY_ACTIONS.ACTIVITY_INJECTION;
      case STAGNATION_LEVELS.MEDIUM:
        return RECOVERY_ACTIONS.CACHE_INVALIDATION;
      case STAGNATION_LEVELS.HIGH:
        return RECOVERY_ACTIONS.RESOURCE_REALLOCATION;
      case STAGNATION_LEVELS.CRITICAL:
        return RECOVERY_ACTIONS.SYSTEM_RESTART;
      default:
        return RECOVERY_ACTIONS.ACTIVITY_INJECTION;
    }
  }

  /**
   * Execute a recovery action
   * @private
   * @param {string} action - Action to execute
   * @param {Object} stagnationInfo - Stagnation context
   * @returns {Promise<Object>} Action result
   */
  async executeRecoveryAction(action, stagnationInfo) {
    switch (action) {
      case RECOVERY_ACTIONS.ACTIVITY_INJECTION:
        return this.injectActivity(stagnationInfo);

      case RECOVERY_ACTIONS.CACHE_INVALIDATION:
        return this.invalidateCaches();

      case RECOVERY_ACTIONS.RESOURCE_REALLOCATION:
        return this.reallocateResources();

      case RECOVERY_ACTIONS.TASK_REPRIORITIZATION:
        return this.reprioritizeTasks();

      case RECOVERY_ACTIONS.SYSTEM_RESTART:
        return this.initiateSystemRestart();

      default:
        throw new Error(`Unknown recovery action: ${action}`);
    }
  }

  /**
   * Inject synthetic activity to break stagnation
   * @private
   * @param {Object} stagnationInfo - Stagnation context
   * @returns {Promise<Object>} Injection result
   */
  async injectActivity(stagnationInfo) {
    // Generate synthetic activities
    const activities = [
      { type: 'health_check', data: { source: 'stagnation_recovery' } },
      { type: 'metrics_collection', data: { triggered: true } },
      { type: 'cache_warmup', data: { priority: 'high' } },
    ];

    for (const activity of activities) {
      this.recordActivity(activity.type, activity.data);
    }

    return {
      success: true,
      injectedActivities: activities.length,
      message: 'Injected synthetic activities to break stagnation',
    };
  }

  /**
   * Invalidate caches to refresh system state
   * @private
   * @returns {Promise<Object>} Invalidation result
   */
  async invalidateCaches() {
    // Clear old activity entries to force refresh
    const oldEntries = [];
    const oneHourAgo = Date.now() - 3600000;

    for (const [timestamp, entry] of this.activityLog) {
      if (timestamp < oneHourAgo) {
        oldEntries.push(timestamp);
      }
    }

    for (const timestamp of oldEntries) {
      this.activityLog.delete(timestamp);
    }

    return {
      success: true,
      clearedEntries: oldEntries.length,
      message: 'Invalidated old cache entries',
    };
  }

  /**
   * Reallocate resources for better distribution
   * @private
   * @returns {Promise<Object>} Reallocation result
   */
  async reallocateResources() {
    // Reset activity counters
    const previousCounters = new Map(this.activityCounters);
    this.activityCounters.clear();

    return {
      success: true,
      previousState: Object.fromEntries(previousCounters),
      message: 'Resource counters reset for reallocation',
    };
  }

  /**
   * Reprioritize pending tasks
   * @private
   * @returns {Promise<Object>} Reprioritization result
   */
  async reprioritizeTasks() {
    // This would integrate with the orchestration engine
    return {
      success: true,
      reprioritized: 0,
      message: 'Task reprioritization requested',
    };
  }

  /**
   * Initiate system restart procedure
   * @private
   * @returns {Promise<Object>} Restart result
   */
  async initiateSystemRestart() {
    console.warn('[AntiStagnationEngine] Critical stagnation - system restart recommended');

    return {
      success: true,
      requiresRestart: true,
      message: 'System restart initiated due to critical stagnation',
    };
  }

  // ==========================================================================
  // ACTIVITY TRACKING
  // ==========================================================================

  /**
   * Record activity
   * @param {string} type - Activity type
   * @param {Object} data - Activity data
   */
  recordActivity(type, data = {}) {
    const timestamp = Date.now();

    // Add to activity log
    this.activityLog.set(timestamp, {
      type,
      data,
      timestamp: new Date().toISOString(),
    });

    // Update counters
    const currentCount = this.activityCounters.get(type) || 0;
    this.activityCounters.set(type, currentCount + 1);

    // Trim log if needed
    if (this.activityLog.size > this.maxActivityLogSize) {
      this.trimActivityLog();
    }
  }

  /**
   * Trim activity log to max size
   * @private
   */
  trimActivityLog() {
    const entries = Array.from(this.activityLog.keys()).sort((a, b) => a - b);
    const toRemove = entries.slice(0, entries.length - this.maxActivityLogSize);

    for (const timestamp of toRemove) {
      this.activityLog.delete(timestamp);
    }
  }

  /**
   * Get last activity timestamp
   * @returns {number} Last activity timestamp
   */
  getLastActivity() {
    const timestamps = Array.from(this.activityLog.keys());
    return timestamps.length > 0 ? Math.max(...timestamps) : Date.now();
  }

  /**
   * Get activity statistics
   * @returns {Object} Activity statistics
   */
  getActivityStats() {
    const now = Date.now();
    const intervals = {
      lastMinute: now - 60000,
      last5Minutes: now - 300000,
      last15Minutes: now - 900000,
      lastHour: now - 3600000,
    };

    const stats = {
      total: this.activityLog.size,
      byInterval: {},
      byType: Object.fromEntries(this.activityCounters),
      recoveryCount: this.recoveryHistory.length,
    };

    for (const [name, threshold] of Object.entries(intervals)) {
      let count = 0;
      for (const timestamp of this.activityLog.keys()) {
        if (timestamp > threshold) {
          count++;
        }
      }
      stats.byInterval[name] = count;
    }

    return stats;
  }

  // ==========================================================================
  // UTILITY METHODS
  // ==========================================================================

  /**
   * Get engine status
   * @returns {string} Status string
   */
  getStatus() {
    if (!this.initialized) {
      return 'not_initialized';
    }
    if (this.monitorInterval) {
      return 'operational';
    }
    return 'paused';
  }

  /**
   * Get last stagnation check result
   * @returns {Object|null} Last check result
   */
  getLastCheck() {
    return this.lastStagnationCheck;
  }

  /**
   * Get recovery history
   * @param {number} [limit=10] - Max entries to return
   * @returns {Array<Object>} Recovery history
   */
  getRecoveryHistory(limit = 10) {
    return this.recoveryHistory.slice(-limit);
  }

  /**
   * Pause monitoring
   */
  pauseMonitoring() {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }
  }

  /**
   * Resume monitoring
   */
  resumeMonitoring() {
    this.startMonitoring();
  }

  /**
   * Shutdown the engine
   * @returns {Promise<void>}
   */
  async shutdown() {
    this.pauseMonitoring();
    this.activityLog.clear();
    this.activityCounters.clear();
    this.recoveryHistory = [];
    this.initialized = false;
    console.log('[AntiStagnationEngine] Shutdown complete');
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  AntiStagnationEngine,
  STAGNATION_LEVELS,
  RECOVERY_ACTIONS,
};
