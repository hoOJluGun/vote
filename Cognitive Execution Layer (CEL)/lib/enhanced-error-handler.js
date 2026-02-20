/**
 * Enhanced Error Handler with Advanced Recovery Mechanisms
 * Provides comprehensive error classification, recovery strategies, and resilience patterns
 */

import { FormalSafetyModel } from './formal-safety-model.js';
import { SelfHealingLayer } from './self-healing-layer.js';
import { ResourceGovernor } from './resource-governor.js';

export class EnhancedErrorHandler {
  constructor(options = {}) {
    this.safetyModel = new FormalSafetyModel();
    this.selfHealingLayer = new SelfHealingLayer();
    this.resourceGovernor = new ResourceGovernor();
    
    this.errorCategories = new Map([
      ['NETWORK', { severity: 'medium', retryable: true, maxRetries: 3 }],
      ['PERMISSION', { severity: 'high', retryable: false, requiresAuth: true }],
      ['VALIDATION', { severity: 'low', retryable: false, userFixable: true }],
      ['SYSTEM', { severity: 'high', retryable: true, maxRetries: 2 }],
      ['TIMEOUT', { severity: 'medium', retryable: true, maxRetries: 5 }],
      ['RATE_LIMIT', { severity: 'medium', retryable: true, backoff: 'exponential' }],
      ['CRITICAL', { severity: 'critical', retryable: false, requiresIntervention: true }]
    ]);
    
    this.errorHistory = [];
    this.maxHistorySize = 1000;
    this.circuitBreakers = new Map();
    this.retryStrategies = new Map();
    
    // Performance metrics
    this.metrics = {
      totalErrors: 0,
      resolvedErrors: 0,
      escalatedErrors: 0,
      averageResolutionTime: 0,
      errorRate: 0
    };
  }

  /**
   * Main error handling entry point
   */
  async handleError(error, context = {}) {
    const errorId = this.generateErrorId();
    const startTime = Date.now();
    
    // Classify and categorize the error
    const classification = await this.classifyError(error, context);
    
    // Log error with full context
    this.logError(errorId, error, classification, context);
    
    // Check circuit breaker status
    if (this.isCircuitOpen(classification.source)) {
      return this.handleCircuitOpen(errorId, classification);
    }
    
    // Attempt recovery based on error type
    const recoveryResult = await this.attemptRecovery(errorId, error, classification, context);
    
    // Update metrics
    this.updateMetrics(startTime, recoveryResult.success);
    
    // Check if escalation is needed
    if (!recoveryResult.success && classification.severity === 'critical') {
      await this.escalateError(errorId, error, classification, context);
    }
    
    return {
      errorId,
      classification,
      recoveryResult,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Advanced error classification with ML-like pattern recognition
   */
  async classifyError(error, context) {
    const errorMessage = error.message || error.toString();
    const errorCode = error.code || error.status;
    const stackTrace = error.stack;
    
    // Pattern-based classification
    let category = 'UNKNOWN';
    let severity = 'medium';
    let source = context.source || 'unknown';
    
    // Network errors
    if (errorMessage.includes('ECONNREFUSED') || 
        errorMessage.includes('ETIMEDOUT') || 
        errorMessage.includes('ENOTFOUND')) {
      category = 'NETWORK';
      source = source || 'network';
    }
    
    // Permission errors
    if (errorMessage.includes('EACCES') || 
        errorMessage.includes('EPERM') || 
        errorMessage.includes('401') || 
        errorMessage.includes('403')) {
      category = 'PERMISSION';
      severity = 'high';
      source = source || 'authorization';
    }
    
    // Validation errors
    if (errorMessage.includes('validation') || 
        errorMessage.includes('invalid') || 
        errorMessage.includes('400') || 
        errorMessage.includes('schema')) {
      category = 'VALIDATION';
      severity = 'low';
      source = source || 'input_validation';
    }
    
    // Rate limiting
    if (errorMessage.includes('rate limit') || 
        errorMessage.includes('429') || 
        errorMessage.includes('too many requests')) {
      category = 'RATE_LIMIT';
      source = source || 'api_gateway';
    }
    
    // System errors
    if (errorMessage.includes('ENOMEM') || 
        errorMessage.includes('out of memory') || 
        errorMessage.includes('disk full')) {
      category = 'SYSTEM';
      severity = 'high';
      source = source || 'system_resources';
    }
    
    // Timeout errors
    if (errorMessage.includes('timeout') || 
        errorMessage.includes('ETIMEDOUT')) {
      category = 'TIMEOUT';
      source = source || 'request_timeout';
    }
    
    // Check for critical system failures
    if (await this.isCriticalSystemError(error, context)) {
      category = 'CRITICAL';
      severity = 'critical';
    }
    
    return {
      category,
      severity,
      source,
      errorCode,
      message: errorMessage,
      stackTrace,
      context,
      retryable: this.errorCategories.get(category)?.retryable || false,
      maxRetries: this.errorCategories.get(category)?.maxRetries || 0
    };
  }

  /**
   * Intelligent recovery strategies based on error classification
   */
  async attemptRecovery(errorId, error, classification, context) {
    const { category, retryable, maxRetries } = classification;
    
    if (!retryable) {
      return { success: false, reason: 'Error not retryable', action: 'manual_intervention_required' };
    }
    
    // Check retry count
    const retryCount = this.getRetryCount(context.operation);
    if (retryCount >= maxRetries) {
      return { success: false, reason: 'Max retries exceeded', action: 'escalate' };
    }
    
    // Apply recovery strategy based on category
    switch (category) {
      case 'NETWORK':
        return await this.handleNetworkError(errorId, error, classification, context);
      
      case 'TIMEOUT':
        return await this.handleTimeoutError(errorId, error, classification, context);
      
      case 'RATE_LIMIT':
        return await this.handleRateLimitError(errorId, error, classification, context);
      
      case 'SYSTEM':
        return await this.handleSystemError(errorId, error, classification, context);
      
      default:
        return await this.handleGenericRetry(errorId, error, classification, context);
    }
  }

  /**
   * Network error recovery with exponential backoff
   */
  async handleNetworkError(errorId, error, classification, context) {
    const retryCount = this.getRetryCount(context.operation);
    const delay = Math.min(1000 * Math.pow(2, retryCount), 30000); // Max 30 seconds
    
    console.log(`[ErrorHandler] Network error detected, retrying in ${delay}ms (attempt ${retryCount + 1})`);
    
    // Wait with exponential backoff
    await this.sleep(delay);
    
    // Check network connectivity
    const isConnected = await this.checkNetworkConnectivity();
    if (!isConnected) {
      return { success: false, reason: 'No network connectivity', action: 'wait_for_network' };
    }
    
    // Attempt retry
    try {
      const result = await this.retryOperation(context.operation, context);
      this.incrementRetryCount(context.operation);
      return { success: true, action: 'retry_successful', attempts: retryCount + 1 };
    } catch (retryError) {
      return { success: false, reason: 'Retry failed', error: retryError.message };
    }
  }

  /**
   * Timeout error recovery with adaptive timeout
   */
  async handleTimeoutError(errorId, error, classification, context) {
    const retryCount = this.getRetryCount(context.operation);
    
    // Increase timeout for next attempt
    const newTimeout = (context.timeout || 30000) * (1 + retryCount * 0.5);
    
    console.log(`[ErrorHandler] Timeout detected, increasing timeout to ${newTimeout}ms`);
    
    try {
      const result = await this.retryOperation(context.operation, { 
        ...context, 
        timeout: newTimeout 
      });
      this.incrementRetryCount(context.operation);
      return { success: true, action: 'timeout_adjusted', newTimeout };
    } catch (retryError) {
      return { success: false, reason: 'Retry with increased timeout failed', error: retryError.message };
    }
  }

  /**
   * Rate limit error recovery with progressive backoff
   */
  async handleRateLimitError(errorId, error, classification, context) {
    const retryCount = this.getRetryCount(context.operation);
    
    // Parse retry-after header if available
    let retryAfter = 60000; // Default 1 minute
    if (error.headers && error.headers['retry-after']) {
      retryAfter = parseInt(error.headers['retry-after']) * 1000;
    } else {
      // Progressive backoff: 1min, 2min, 4min, 8min
      retryAfter = Math.min(60000 * Math.pow(2, retryCount), 480000); // Max 8 minutes
    }
    
    console.log(`[ErrorHandler] Rate limit detected, waiting ${retryAfter}ms before retry`);
    
    await this.sleep(retryAfter);
    
    try {
      const result = await this.retryOperation(context.operation, context);
      this.incrementRetryCount(context.operation);
      return { success: true, action: 'rate_limit_handled', waitTime: retryAfter };
    } catch (retryError) {
      return { success: false, reason: 'Retry after rate limit failed', error: retryError.message };
    }
  }

  /**
   * System error recovery with resource management
   */
  async handleSystemError(errorId, error, classification, context) {
    console.log(`[ErrorHandler] System error detected: ${error.message}`);
    
    // Check system resources
    const systemStatus = await this.checkSystemResources();
    
    if (systemStatus.memoryUsage > 90) {
      // Trigger garbage collection
      if (global.gc) {
        global.gc();
      }
      
      // Clear caches
      await this.clearCaches();
      
      // Wait for memory to free up
      await this.sleep(5000);
    }
    
    if (systemStatus.diskUsage > 95) {
      // Clear temporary files
      await this.clearTempFiles();
    }
    
    // Retry with reduced resource usage
    try {
      const result = await this.retryOperation(context.operation, {
        ...context,
        reducedResources: true
      });
      this.incrementRetryCount(context.operation);
      return { success: true, action: 'system_resources_optimized', systemStatus };
    } catch (retryError) {
      return { success: false, reason: 'System recovery failed', error: retryError.message };
    }
  }

  /**
   * Circuit breaker pattern implementation
   */
  isCircuitOpen(source) {
    const breaker = this.circuitBreakers.get(source);
    if (!breaker) return false;
    
    if (breaker.state === 'OPEN') {
      // Check if timeout has passed
      if (Date.now() - breaker.openedAt > breaker.timeout) {
        breaker.state = 'HALF_OPEN';
        return false;
      }
      return true;
    }
    
    return false;
  }

  updateCircuitBreaker(source, success) {
    if (!this.circuitBreakers.has(source)) {
      this.circuitBreakers.set(source, {
        state: 'CLOSED',
        failures: 0,
        threshold: 5,
        timeout: 60000,
        openedAt: null
      });
    }
    
    const breaker = this.circuitBreakers.get(source);
    
    if (success) {
      breaker.failures = 0;
      breaker.state = 'CLOSED';
    } else {
      breaker.failures++;
      if (breaker.failures >= breaker.threshold) {
        breaker.state = 'OPEN';
        breaker.openedAt = Date.now();
        console.warn(`[ErrorHandler] Circuit breaker OPEN for source: ${source}`);
      }
    }
  }

  /**
   * Utility methods
   */
  generateErrorId() {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getRetryCount(operation) {
    return this.retryStrategies.get(operation)?.count || 0;
  }

  incrementRetryCount(operation) {
    const current = this.retryStrategies.get(operation) || { count: 0 };
    this.retryStrategies.set(operation, { count: current.count + 1 });
  }

  async retryOperation(operation, context) {
    // This would be implemented based on the specific operation
    // For now, return a mock implementation
    throw new Error('Retry operation not implemented');
  }

  async checkNetworkConnectivity() {
    // Simple connectivity check
    try {
      const response = await fetch('https://google.com', { 
        method: 'HEAD', 
        timeout: 5000 
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async checkSystemResources() {
    const memUsage = process.memoryUsage();
    const totalMemory = require('os').totalmem();
    const freeMemory = require('os').freemem();
    
    return {
      memoryUsage: (memUsage.heapUsed / memUsage.heapTotal) * 100,
      systemMemoryUsage: ((totalMemory - freeMemory) / totalMemory) * 100,
      diskUsage: 0 // Would need to implement disk usage check
    };
  }

  async clearCaches() {
    // Implementation would clear various caches
    console.log('[ErrorHandler] Clearing caches to free memory');
  }

  async clearTempFiles() {
    // Implementation would clear temporary files
    console.log('[ErrorHandler] Clearing temporary files');
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  logError(errorId, error, classification, context) {
    const logEntry = {
      errorId,
      timestamp: new Date().toISOString(),
      classification,
      context,
      stack: error.stack
    };
    
    this.errorHistory.push(logEntry);
    
    // Limit history size
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory.shift();
    }
    
    // Log to console (in production, use proper logging system)
    console.error(`[ErrorHandler] ${errorId}: ${classification.category} - ${classification.message}`);
  }

  updateMetrics(startTime, success) {
    const resolutionTime = Date.now() - startTime;
    this.metrics.totalErrors++;
    
    if (success) {
      this.metrics.resolvedErrors++;
      this.metrics.averageResolutionTime = 
        (this.metrics.averageResolutionTime * (this.metrics.resolvedErrors - 1) + resolutionTime) / 
        this.metrics.resolvedErrors;
    }
    
    this.metrics.errorRate = this.metrics.totalErrors / (Date.now() / 1000); // Errors per second
  }

  async escalateError(errorId, error, classification, context) {
    console.error(`[ErrorHandler] CRITICAL ERROR ESCALATION: ${errorId}`);
    this.metrics.escalatedErrors++;
    
    // In production, this would send alerts, create tickets, etc.
    // For now, just log the escalation
    return {
      escalated: true,
      errorId,
      reason: 'Critical system error requiring manual intervention',
      timestamp: new Date().toISOString()
    };
  }

  getMetrics() {
    return {
      ...this.metrics,
      circuitBreakers: Array.from(this.circuitBreakers.entries()).map(([source, breaker]) => ({
        source,
        state: breaker.state,
        failures: breaker.failures
      })),
      recentErrors: this.errorHistory.slice(-10)
    };
  }
}

export default EnhancedErrorHandler;
