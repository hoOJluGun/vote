'use strict';

/**
 * Configuration Module for Cognitive Execution Layer
 * Provides centralized configuration management with validation
 *
 * @module src/middleware/config
 */

// ============================================================================
// DEFAULT CONFIGURATION
// ============================================================================

const DEFAULT_CONFIG = {
  server: {
    port: 3000,
    host: '0.0.0.0',
    environment: 'development',
    trustProxy: false,
    maxRequestBody: '10mb',
    timeout: 30000,
  },
  rateLimit: {
    enabled: true,
    windowMs: 15 * 60 * 1000,
    maxRequests: 100,
  },
  logging: {
    level: 'info',
    format: 'json',
  },
  features: {
    selfHealing: true,
    autoRollback: true,
    chaosEngineering: false,
  },
};

// ============================================================================
// CONFIG CLASS
// ============================================================================

/**
 * Configuration manager class
 */
class Config {
  /**
   * Create a Config instance
   */
  constructor() {
    this.config = { ...DEFAULT_CONFIG };
    this.loaded = false;
  }

  /**
   * Load configuration from multiple sources
   * @param {Object} options - Load options
   * @returns {Config} This instance
   */
  load(options = {}) {
    const { envPrefix = 'CEL_' } = options;

    // Load from environment variables
    this.loadFromEnv(envPrefix);

    this.loaded = true;
    console.log('[Config] Configuration loaded');

    return this;
  }

  /**
   * Load configuration from environment variables
   * @param {string} prefix - Environment variable prefix
   */
  loadFromEnv(prefix) {
    const envMappings = {
      [`${prefix}PORT`]: 'server.port',
      [`${prefix}HOST`]: 'server.host',
      [`${prefix}NODE_ENV`]: 'server.environment',
      [`${prefix}TRUST_PROXY`]: 'server.trustProxy',
      [`${prefix}RATE_LIMIT_ENABLED`]: 'rateLimit.enabled',
      [`${prefix}RATE_LIMIT_MAX`]: 'rateLimit.maxRequests',
      [`${prefix}LOG_LEVEL`]: 'logging.level',
    };

    for (const [envVar, configPath] of Object.entries(envMappings)) {
      const value = process.env[envVar];
      if (value !== undefined) {
        this.setNestedValue(this.config, configPath, this.parseEnvValue(value));
      }
    }
  }

  /**
   * Parse environment variable value to appropriate type
   * @param {string} value - Environment variable value
   * @returns {*} Parsed value
   */
  parseEnvValue(value) {
    if (value.toLowerCase() === 'true') {
      return true;
    }
    if (value.toLowerCase() === 'false') {
      return false;
    }
    if (/^\d+$/.test(value)) {
      return parseInt(value, 10);
    }
    if (/^\d+\.\d+$/.test(value)) {
      return parseFloat(value);
    }
    return value;
  }

  /**
   * Set nested value in object
   * @param {Object} obj - Target object
   * @param {string} path - Dot-separated path
   * @param {*} value - Value to set
   */
  setNestedValue(obj, path, value) {
    const parts = path.split('.');
    let current = obj;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!(part in current)) {
        current[part] = {};
      }
      current = current[part];
    }

    current[parts[parts.length - 1]] = value;
  }

  /**
   * Get nested value from object
   * @param {Object} obj - Source object
   * @param {string} path - Dot-separated path
   * @param {*} defaultValue - Default value if not found
   * @returns {*} Value at path
   */
  getNestedValue(obj, path, defaultValue = undefined) {
    const parts = path.split('.');
    let current = obj;

    for (const part of parts) {
      if (current === null || current === undefined || !(part in current)) {
        return defaultValue;
      }
      current = current[part];
    }

    return current;
  }

  /**
   * Get configuration value
   * @param {string} path - Dot-separated path
   * @param {*} defaultValue - Default value
   * @returns {*} Configuration value
   */
  get(path, defaultValue = undefined) {
    return this.getNestedValue(this.config, path, defaultValue);
  }

  /**
   * Get entire configuration object
   * @returns {Object} Configuration object
   */
  getAll() {
    return { ...this.config };
  }

  /**
   * Get environment
   * @returns {string} Current environment
   */
  get environment() {
    return this.get('server.environment', 'development');
  }

  /**
   * Check if running in production
   * @returns {boolean} True if production
   */
  get isProduction() {
    return this.environment === 'production';
  }

  /**
   * Check if running in development
   * @returns {boolean} True if development
   */
  get isDevelopment() {
    return this.environment === 'development';
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let configInstance = null;

/**
 * Get or create configuration instance
 * @param {Object} options - Configuration options
 * @returns {Config} Configuration instance
 */
function getConfig(options = {}) {
  if (!configInstance) {
    configInstance = new Config();
    if (options.load !== false) {
      configInstance.load(options);
    }
  }
  return configInstance;
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  Config,
  getConfig,
  DEFAULT_CONFIG,
};
