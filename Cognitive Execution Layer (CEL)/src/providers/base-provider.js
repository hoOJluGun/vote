/**
 * Base Provider - Abstract base class for LLM providers
 * @module src/providers/base-provider
 */

import { createHash } from 'crypto';

/**
 * Base provider implementation
 * Provides common functionality for all LLM providers
 */
export class BaseProvider {
  constructor(config = {}) {
    this.name = 'base';
    this.type = 'cloud';
    this.supportsStreaming = false;
    this.maxTokens = 4096;
    this.defaultModel = 'default';

    this.config = {
      timeout: 30000,
      maxRetries: 3,
      ...config,
    };

    this.currentModel = this.config.defaultModel || this.defaultModel;
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      totalTokens: 0,
      totalCost: 0,
      avgLatency: 0,
    };
  }

  /**
   * Get current model
   * @returns {string} Current model name
   */
  getCurrentModel() {
    return this.currentModel;
  }

  /**
   * Set model
   * @param {string} model - Model name
   */
  setModel(model) {
    this.currentModel = model;
  }

  /**
   * Estimate tokens in text
   * @param {string} text - Text to estimate
   * @returns {number} Estimated token count
   */
  estimateTokens(text) {
    if (!text) return 0;

    // Simple estimation: ~4 characters per token
    // For more accurate estimation, use tiktoken
    return Math.ceil(text.length / 4);
  }

  /**
   * Estimate tokens in messages
   * @param {Array} messages - Messages to estimate
   * @returns {number} Estimated token count
   */
  estimateMessagesTokens(messages) {
    if (!messages || !Array.isArray(messages)) return 0;

    let total = 0;
    for (const message of messages) {
      // Add overhead for message structure
      total += 4; // role, content markers
      total += this.estimateTokens(message.content || '');
      total += this.estimateTokens(message.role || '');
    }
    return total;
  }

  /**
   * Update metrics after a request
   * @param {Object} result - Request result
   */
  updateMetrics(result) {
    this.metrics.totalRequests++;

    if (result.success) {
      this.metrics.successfulRequests++;
      this.metrics.lastSuccess = Date.now();
      this.metrics.totalTokens += result.tokens || 0;
      this.metrics.totalCost += result.cost || 0;
    } else {
      this.metrics.failedRequests++;
      this.metrics.lastError = result.error;
    }

    // Update average latency
    if (result.latency) {
      const totalLatency = this.metrics.avgLatency * (this.metrics.totalRequests - 1);
      this.metrics.avgLatency = (totalLatency + result.latency) / this.metrics.totalRequests;
    }
  }

  /**
   * Get provider metrics
   * @returns {Object} Provider metrics
   */
  getMetrics() {
    return { ...this.metrics };
  }

  /**
   * Reset metrics
   */
  resetMetrics() {
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      totalTokens: 0,
      totalCost: 0,
      avgLatency: 0,
    };
  }

  /**
   * Generate a unique request ID
   * @returns {string} Request ID
   */
  generateRequestId() {
    return `${this.name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Hash text for caching
   * @param {string} text - Text to hash
   * @returns {string} Hash
   */
  hashText(text) {
    return createHash('sha256').update(text).digest('hex');
  }

  /**
   * Validate request before sending
   * @param {Object} request - Request to validate
   * @throws {Error} If request is invalid
   */
  validateRequest(request) {
    if (!request.messages || !Array.isArray(request.messages)) {
      throw new Error('Messages array is required');
    }

    if (request.messages.length === 0) {
      throw new Error('Messages array cannot be empty');
    }

    for (const message of request.messages) {
      if (!message.role || !message.content) {
        throw new Error('Each message must have role and content');
      }
    }

    if (request.maxTokens && request.maxTokens > this.maxTokens) {
      console.warn(`⚠️ maxTokens (${request.maxTokens}) exceeds provider limit (${this.maxTokens})`);
    }
  }

  /**
   * Sleep for specified milliseconds
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise<void>}
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Retry a function with exponential backoff
   * @param {Function} fn - Function to retry
   * @param {number} maxRetries - Maximum retries
   * @param {number} baseDelay - Base delay in ms
   * @returns {Promise<any>} Result
   */
  async retryWithBackoff(fn, maxRetries = this.config.maxRetries, baseDelay = 1000) {
    let lastError;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;

        if (attempt < maxRetries) {
          const delay = baseDelay * Math.pow(2, attempt);
          console.warn(`⚠️ Attempt ${attempt + 1} failed, retrying in ${delay}ms:`, error.message);
          await this.sleep(delay);
        }
      }
    }

    throw lastError;
  }

  /**
   * Check if error is retryable
   * @param {Error} error - Error to check
   * @returns {boolean} True if retryable
   */
  isRetryableError(error) {
    const retryableCodes = [429, 500, 502, 503, 504];
    const retryableMessages = ['rate limit', 'timeout', 'connection', 'network'];

    if (error.status && retryableCodes.includes(error.status)) {
      return true;
    }

    const message = error.message?.toLowerCase() || '';
    return retryableMessages.some(msg => message.includes(msg));
  }

  /**
   * Format messages for API
   * @param {Array} messages - Messages to format
   * @returns {Array} Formatted messages
   */
  formatMessages(messages) {
    return messages.map(msg => ({
      role: msg.role,
      content: msg.content,
      ...(msg.name && { name: msg.name }),
    }));
  }

  /**
   * Parse streaming response
   * @param {string} chunk - Chunk to parse
   * @returns {Object|null} Parsed chunk or null
   */
  parseStreamChunk(chunk) {
    try {
      const lines = chunk.split('\n').filter(line => line.trim());
      const results = [];

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') {
            return { done: true };
          }
          results.push(JSON.parse(data));
        }
      }

      return results.length === 1 ? results[0] : results;
    } catch {
      return null;
    }
  }
}

export default BaseProvider;
