/**
 * Enhanced Configuration Manager with Advanced Features
 * Provides centralized configuration management with validation, encryption, and hot-reloading
 */

import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { EnhancedSecurityFramework } from './enhanced-security-framework.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class EnhancedConfigManager {
  constructor(options = {}) {
    this.configPath = options.configPath || path.join(__dirname, '../config/cel-config.json');
    this.encryptionEnabled = options.encryption !== false;
    this.validationEnabled = options.validation !== false;
    this.hotReloadEnabled = options.hotReload !== false;
    this.backupEnabled = options.backup !== false;
    
    this.config = new Map();
    this.schema = new Map();
    this.watchers = new Map();
    this.changeListeners = [];
    this.securityFramework = new EnhancedSecurityFramework();
    
    // Default configuration schema
    this.initializeSchema();
    
    // Load configuration
    this.loadConfiguration();
    
    // Set up hot reload if enabled
    if (this.hotReloadEnabled) {
      this.setupHotReload();
    }
    
    // Set up automatic backups
    if (this.backupEnabled) {
      this.setupAutomaticBackups();
    }
  }

  /**
   * Initialize configuration schema with validation rules
   */
  initializeSchema() {
    // Server configuration
    this.schema.set('server', {
      port: { type: 'number', min: 1, max: 65535, default: 3000 },
      host: { type: 'string', pattern: /^(\d{1,3}\.){3}\d{1,3}$|^localhost$/, default: '127.0.0.1' },
      timeout: { type: 'number', min: 1000, max: 300000, default: 30000 },
      maxConnections: { type: 'number', min: 1, max: 10000, default: 1000 }
    });
    
    // Database configuration
    this.schema.set('database', {
      type: { type: 'string', enum: ['mongodb', 'postgresql', 'mysql', 'sqlite'], default: 'sqlite' },
      host: { type: 'string', default: 'localhost' },
      port: { type: 'number', min: 1, max: 65535, default: 5432 },
      name: { type: 'string', minLength: 1, default: 'cel' },
      ssl: { type: 'boolean', default: false },
      poolSize: { type: 'number', min: 1, max: 100, default: 10 }
    });
    
    // Security configuration
    this.schema.set('security', {
      enableEncryption: { type: 'boolean', default: true },
      sessionTimeout: { type: 'number', min: 300000, max: 86400000, default: 3600000 },
      maxFailedAttempts: { type: 'number', min: 3, max: 10, default: 5 },
      lockoutDuration: { type: 'number', min: 60000, max: 3600000, default: 900000 },
      requireMFA: { type: 'boolean', default: false },
      passwordMinLength: { type: 'number', min: 8, max: 64, default: 12 },
      enableRateLimiting: { type: 'boolean', default: true },
      rateLimitWindow: { type: 'number', min: 60000, max: 3600000, default: 900000 },
      rateLimitMax: { type: 'number', min: 10, max: 1000, default: 100 }
    });
    
    // AI/LLM configuration
    this.schema.set('ai', {
      defaultProvider: { type: 'string', enum: ['openrouter', 'ollama', 'local'], default: 'openrouter' },
      fallbackProviders: { type: 'array', items: 'string', default: ['ollama'] },
      maxTokens: { type: 'number', min: 1, max: 128000, default: 4096 },
      temperature: { type: 'number', min: 0, max: 2, default: 0.7 },
      enableCaching: { type: 'boolean', default: true },
      cacheSize: { type: 'number', min: 100, max: 10000, default: 1000 },
      cacheTTL: { type: 'number', min: 300000, max: 86400000, default: 86400000 }
    });
    
    // Performance configuration
    this.schema.set('performance', {
      enableMonitoring: { type: 'boolean', default: true },
      metricsInterval: { type: 'number', min: 1000, max: 300000, default: 5000 },
      enableAutoOptimization: { type: 'boolean', default: false },
      responseTimeThreshold: { type: 'number', min: 100, max: 30000, default: 5000 },
      memoryThreshold: { type: 'number', min: 50, max: 95, default: 80 },
      cpuThreshold: { type: 'number', min: 50, max: 95, default: 70 }
    });
    
    // Logging configuration
    this.schema.set('logging', {
      level: { type: 'string', enum: ['error', 'warn', 'info', 'debug'], default: 'info' },
      enableFileLogging: { type: 'boolean', default: true },
      enableConsoleLogging: { type: 'boolean', default: true },
      logRotation: { type: 'boolean', default: true },
      maxLogSize: { type: 'number', min: 1048576, max: 1073741824, default: 104857600 },
      logRetention: { type: 'number', min: 1, max: 365, default: 30 },
      enableStructuredLogging: { type: 'boolean', default: true }
    });
    
    // Feature flags
    this.schema.set('features', {
      enableXcodeIntegration: { type: 'boolean', default: true },
      enableCLI: { type: 'boolean', default: true },
      enableWebIDE: { type: 'boolean', default: true },
      enableAPI: { type: 'boolean', default: true },
      enableMonitoring: { type: 'boolean', default: true },
      enableSelfHealing: { type: 'boolean', default: true },
      enableSemanticCache: { type: 'boolean', default: true },
      enableRAGEngine: { type: 'boolean', default: true }
    });
  }

  /**
   * Load configuration from file with validation and decryption
   */
  async loadConfiguration() {
    try {
      // Ensure config directory exists
      await fs.mkdir(path.dirname(this.configPath), { recursive: true });
      
      // Check if config file exists
      const configExists = await fs.access(this.configPath).then(() => true).catch(() => false);
      
      if (!configExists) {
        console.log('[ConfigManager] Configuration file not found, creating default configuration');
        await this.createDefaultConfiguration();
        return;
      }
      
      // Read configuration file
      const configData = await fs.readFile(this.configPath, 'utf8');
      let parsedConfig;
      
      // Try to parse as JSON
      try {
        parsedConfig = JSON.parse(configData);
      } catch (parseError) {
        throw new Error(`Invalid JSON in configuration file: ${parseError.message}`);
      }
      
      // Decrypt if encryption is enabled
      if (this.encryptionEnabled && parsedConfig.encrypted) {
        parsedConfig = await this.securityFramework.decryptData(parsedConfig);
      }
      
      // Validate configuration
      if (this.validationEnabled) {
        const validationResult = this.validateConfiguration(parsedConfig);
        if (!validationResult.valid) {
          console.error('[ConfigManager] Configuration validation failed:', validationResult.errors);
          throw new Error(`Invalid configuration: ${validationResult.errors.join(', ')}`);
        }
      }
      
      // Load configuration into memory
      for (const [section, values] of Object.entries(parsedConfig)) {
        this.config.set(section, values);
      }
      
      console.log('[ConfigManager] Configuration loaded successfully');
      
      // Notify listeners
      this.notifyChangeListeners('load', { config: parsedConfig });
      
    } catch (error) {
      console.error('[ConfigManager] Failed to load configuration:', error.message);
      throw error;
    }
  }

  /**
   * Save configuration to file with validation and encryption
   */
  async saveConfiguration() {
    try {
      // Convert config Map to plain object
      const configObject = Object.fromEntries(this.config);
      
      // Validate before saving
      if (this.validationEnabled) {
        const validationResult = this.validateConfiguration(configObject);
        if (!validationResult.valid) {
          throw new Error(`Cannot save invalid configuration: ${validationResult.errors.join(', ')}`);
        }
      }
      
      // Encrypt if encryption is enabled
      let dataToSave = configObject;
      if (this.encryptionEnabled) {
        dataToSave = await this.securityFramework.encryptData(configObject);
      }
      
      // Create backup before saving
      if (this.backupEnabled) {
        await this.createBackup();
      }
      
      // Save to file
      const jsonData = JSON.stringify(dataToSave, null, 2);
      await fs.writeFile(this.configPath, jsonData, 'utf8');
      
      console.log('[ConfigManager] Configuration saved successfully');
      
      // Notify listeners
      this.notifyChangeListeners('save', { config: configObject });
      
    } catch (error) {
      console.error('[ConfigManager] Failed to save configuration:', error.message);
      throw error;
    }
  }

  /**
   * Get configuration value with dot notation support
   */
  get(key, defaultValue = undefined) {
    const keys = key.split('.');
    let current = Object.fromEntries(this.config);
    
    for (const k of keys) {
      if (current && typeof current === 'object' && k in current) {
        current = current[k];
      } else {
        return defaultValue;
      }
    }
    
    return current;
  }

  /**
   * Set configuration value with validation and change notification
   */
  async set(key, value, options = {}) {
    const keys = key.split('.');
    const section = keys[0];
    const property = keys.slice(1).join('.');
    
    // Validate the value
    if (this.validationEnabled) {
      const validationResult = this.validateValue(section, property, value);
      if (!validationResult.valid) {
        throw new Error(`Invalid value for ${key}: ${validationResult.error}`);
      }
    }
    
    // Get current value for comparison
    const oldValue = this.get(key);
    
    // Set the value
    if (!this.config.has(section)) {
      this.config.set(section, {});
    }
    
    const sectionConfig = this.config.get(section);
    this.setNestedValue(sectionConfig, property, value);
    
    // Auto-save if enabled
    if (options.autoSave !== false) {
      await this.saveConfiguration();
    }
    
    // Notify listeners
    this.notifyChangeListeners('change', {
      key,
      oldValue,
      newValue: value,
      section,
      property
    });
    
    console.log(`[ConfigManager] Configuration updated: ${key} = ${value}`);
  }

  /**
   * Validate entire configuration object
   */
  validateConfiguration(config) {
    const errors = [];
    const warnings = [];
    
    for (const [section, schema] of this.schema.entries()) {
      if (config[section]) {
        const sectionValidation = this.validateSection(config[section], schema, section);
        errors.push(...sectionValidation.errors);
        warnings.push(...sectionValidation.warnings);
      } else {
        warnings.push(`Missing configuration section: ${section}`);
      }
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate a configuration section
   */
  validateSection(sectionConfig, schema, sectionName) {
    const errors = [];
    const warnings = [];
    
    for (const [property, rules] of Object.entries(schema)) {
      const value = sectionConfig[property];
      
      // Check if required property is missing
      if (value === undefined && rules.required) {
        errors.push(`Missing required property: ${sectionName}.${property}`);
        continue;
      }
      
      // Skip validation if property is not present
      if (value === undefined) {
        continue;
      }
      
      // Type validation
      if (rules.type && typeof value !== rules.type) {
        errors.push(`Invalid type for ${sectionName}.${property}: expected ${rules.type}, got ${typeof value}`);
        continue;
      }
      
      // Enum validation
      if (rules.enum && !rules.enum.includes(value)) {
        errors.push(`Invalid value for ${sectionName}.${property}: must be one of ${rules.enum.join(', ')}`);
        continue;
      }
      
      // Pattern validation
      if (rules.pattern && typeof value === 'string' && !rules.pattern.test(value)) {
        errors.push(`Invalid format for ${sectionName}.${property}: does not match required pattern`);
        continue;
      }
      
      // Range validation
      if (rules.min !== undefined && value < rules.min) {
        errors.push(`Value too low for ${sectionName}.${property}: minimum is ${rules.min}`);
      }
      
      if (rules.max !== undefined && value > rules.max) {
        errors.push(`Value too high for ${sectionName}.${property}: maximum is ${rules.max}`);
      }
      
      // String length validation
      if (rules.minLength !== undefined && typeof value === 'string' && value.length < rules.minLength) {
        errors.push(`Value too short for ${sectionName}.${property}: minimum length is ${rules.minLength}`);
      }
      
      // Array validation
      if (rules.items && Array.isArray(value)) {
        for (let i = 0; i < value.length; i++) {
          if (typeof value[i] !== rules.items) {
            errors.push(`Invalid item type in ${sectionName}.${property}[${i}]: expected ${rules.items}`);
          }
        }
      }
    }
    
    return { errors, warnings };
  }

  /**
   * Validate a single value
   */
  validateValue(section, property, value) {
    const schema = this.schema.get(section);
    if (!schema || !schema[property]) {
      return { valid: true }; // No schema validation available
    }
    
    const rules = schema[property];
    const sectionConfig = this.config.get(section) || {};
    
    // Create temporary config for validation
    const tempConfig = { ...sectionConfig, [property]: value };
    const validation = this.validateSection(tempConfig, { [property]: rules }, section);
    
    return {
      valid: validation.errors.length === 0,
      error: validation.errors[0] || null
    };
  }

  /**
   * Set nested value in object using dot notation
   */
  setNestedValue(obj, path, value) {
    const keys = path.split('.');
    let current = obj;
    
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!(key in current) || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }
    
    current[keys[keys.length - 1]] = value;
  }

  /**
   * Create default configuration
   */
  async createDefaultConfiguration() {
    const defaultConfig = {};
    
    for (const [section, schema] of this.schema.entries()) {
      defaultConfig[section] = {};
      
      for (const [property, rules] of Object.entries(schema)) {
        if (rules.default !== undefined) {
          defaultConfig[section][property] = rules.default;
        }
      }
    }
    
    // Save default configuration
    const jsonData = JSON.stringify(defaultConfig, null, 2);
    await fs.writeFile(this.configPath, jsonData, 'utf8');
    
    console.log('[ConfigManager] Default configuration created');
  }

  /**
   * Set up hot reloading of configuration
   */
  setupHotReload() {
    if (this.watchers.has(this.configPath)) {
      return; // Already watching
    }
    
    try {
      const watcher = fs.watch(this.configPath, (eventType, filename) => {
        if (eventType === 'change') {
          console.log('[ConfigManager] Configuration file changed, reloading...');
          this.loadConfiguration().catch(error => {
            console.error('[ConfigManager] Failed to reload configuration:', error.message);
          });
        }
      });
      
      this.watchers.set(this.configPath, watcher);
      console.log('[ConfigManager] Hot reload enabled');
    } catch (error) {
      console.error('[ConfigManager] Failed to enable hot reload:', error.message);
    }
  }

  /**
   * Set up automatic backups
   */
  setupAutomaticBackups() {
    // Create backup every hour
    setInterval(async () => {
      try {
        await this.createBackup();
      } catch (error) {
        console.error('[ConfigManager] Failed to create automatic backup:', error.message);
      }
    }, 3600000); // 1 hour
    
    console.log('[ConfigManager] Automatic backups enabled');
  }

  /**
   * Create backup of current configuration
   */
  async createBackup() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = this.configPath.replace('.json', `.backup.${timestamp}.json`);
    
    try {
      // Copy current config to backup
      const configData = await fs.readFile(this.configPath, 'utf8');
      await fs.writeFile(backupPath, configData, 'utf8');
      
      // Clean up old backups (keep last 10)
      await this.cleanupOldBackups();
      
      console.log(`[ConfigManager] Backup created: ${backupPath}`);
    } catch (error) {
      console.error('[ConfigManager] Failed to create backup:', error.message);
    }
  }

  /**
   * Clean up old backup files
   */
  async cleanupOldBackups() {
    try {
      const configDir = path.dirname(this.configPath);
      const files = await fs.readdir(configDir);
      const backupFiles = files
        .filter(file => file.includes('.backup.') && file.endsWith('.json'))
        .map(file => ({
          name: file,
          path: path.join(configDir, file),
          time: new Date(file.split('.backup.')[1].replace('.json', '').replace(/-/g, ':'))
        }))
        .sort((a, b) => b.time - a.time);
      
      // Keep only the last 10 backups
      const filesToDelete = backupFiles.slice(10);
      
      for (const file of filesToDelete) {
        await fs.unlink(file.path);
        console.log(`[ConfigManager] Deleted old backup: ${file.name}`);
      }
    } catch (error) {
      console.error('[ConfigManager] Failed to cleanup old backups:', error.message);
    }
  }

  /**
   * Add change listener
   */
  addChangeListener(listener) {
    this.changeListeners.push(listener);
  }

  /**
   * Remove change listener
   */
  removeChangeListener(listener) {
    const index = this.changeListeners.indexOf(listener);
    if (index > -1) {
      this.changeListeners.splice(index, 1);
    }
  }

  /**
   * Notify all change listeners
   */
  notifyChangeListeners(event, data) {
    for (const listener of this.changeListeners) {
      try {
        listener(event, data);
      } catch (error) {
        console.error('[ConfigManager] Error in change listener:', error.message);
      }
    }
  }

  /**
   * Get configuration schema
   */
  getSchema(section = null) {
    if (section) {
      return this.schema.get(section);
    }
    return Object.fromEntries(this.schema);
  }

  /**
   * Get all configuration
   */
  getAllConfiguration() {
    return Object.fromEntries(this.config);
  }

  /**
   * Reset configuration to defaults
   */
  async resetToDefaults() {
    for (const [section, schema] of this.schema.entries()) {
      const defaultSection = {};
      
      for (const [property, rules] of Object.entries(schema)) {
        if (rules.default !== undefined) {
          defaultSection[property] = rules.default;
        }
      }
      
      this.config.set(section, defaultSection);
    }
    
    await this.saveConfiguration();
    console.log('[ConfigManager] Configuration reset to defaults');
  }

  /**
   * Export configuration to file
   */
  async exportConfiguration(filePath, options = {}) {
    try {
      const config = options.includeDefaults 
        ? this.getAllConfiguration()
        : Object.fromEntries(this.config);
      
      const jsonData = JSON.stringify(config, null, 2);
      await fs.writeFile(filePath, jsonData, 'utf8');
      
      console.log(`[ConfigManager] Configuration exported to: ${filePath}`);
    } catch (error) {
      console.error('[ConfigManager] Failed to export configuration:', error.message);
      throw error;
    }
  }

  /**
   * Import configuration from file
   */
  async importConfiguration(filePath, options = {}) {
    try {
      const importData = await fs.readFile(filePath, 'utf8');
      const importedConfig = JSON.parse(importData);
      
      // Validate imported configuration
      if (this.validationEnabled) {
        const validationResult = this.validateConfiguration(importedConfig);
        if (!validationResult.valid) {
          throw new Error(`Invalid imported configuration: ${validationResult.errors.join(', ')}`);
        }
      }
      
      // Merge with existing configuration if requested
      if (options.merge) {
        const existingConfig = this.getAllConfiguration();
        const mergedConfig = this.mergeConfigurations(existingConfig, importedConfig);
        
        for (const [section, values] of Object.entries(mergedConfig)) {
          this.config.set(section, values);
        }
      } else {
        // Replace entire configuration
        for (const [section, values] of Object.entries(importedConfig)) {
          this.config.set(section, values);
        }
      }
      
      await this.saveConfiguration();
      console.log(`[ConfigManager] Configuration imported from: ${filePath}`);
    } catch (error) {
      console.error('[ConfigManager] Failed to import configuration:', error.message);
      throw error;
    }
  }

  /**
   * Merge two configuration objects
   */
  mergeConfigurations(config1, config2) {
    const merged = JSON.parse(JSON.stringify(config1)); // Deep clone
    
    for (const [section, values] of Object.entries(config2)) {
      if (merged[section]) {
        // Merge section objects
        merged[section] = { ...merged[section], ...values };
      } else {
        merged[section] = values;
      }
    }
    
    return merged;
  }

  /**
   * Get configuration statistics
   */
  getConfigurationStats() {
    const stats = {
      totalSections: this.config.size,
      sectionCounts: {},
      lastModified: null,
      backupCount: 0,
      watchersActive: this.watchers.size,
      changeListeners: this.changeListeners.length
    };
    
    // Count properties in each section
    for (const [section, values] of this.config.entries()) {
      stats.sectionCounts[section] = typeof values === 'object' ? Object.keys(values).length : 1;
    }
    
    return stats;
  }
}

export default EnhancedConfigManager;
