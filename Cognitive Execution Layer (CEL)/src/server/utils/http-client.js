/**
 * HTTP Client with Connection Pooling
 * Manages HTTP connections efficiently for external API calls
 * @module src/server/utils/http-client
 */

import http from 'http';
import https from 'https';

/**
 * HTTP Client configuration
 */
const DEFAULT_CONFIG = {
  // Connection pooling settings
  maxSockets: 50,
  maxFreeSockets: 10,
  timeout: 30000, // 30 seconds
  keepAlive: true,
  keepAliveMsecs: 1000,
  scheduling: 'lifo',

  // Retry settings
  maxRetries: 3,
  retryDelay: 1000, // 1 second
  retryBackoff: 2, // Exponential backoff multiplier

  // Request settings
  requestTimeout: 60000, // 60 seconds
};

/**
 * HTTP Client class with connection pooling
 */
export class HttpClient {
  /**
   * Create an HTTP client instance
   * @param {Object} options - Client options
   */
  constructor(options = {}) {
    this.config = { ...DEFAULT_CONFIG, ...options };
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      retries: 0,
      activeConnections: 0,
    };

    // Create connection pools
    this.httpAgent = new http.Agent({
      keepAlive: this.config.keepAlive,
      keepAliveMsecs: this.config.keepAliveMsecs,
      maxSockets: this.config.maxSockets,
      maxFreeSockets: this.config.maxFreeSockets,
      scheduling: this.config.scheduling,
      timeout: this.config.timeout,
    });

    this.httpsAgent = new https.Agent({
      keepAlive: this.config.keepAlive,
      keepAliveMsecs: this.config.keepAliveMsecs,
      maxSockets: this.config.maxSockets,
      maxFreeSockets: this.config.maxFreeSockets,
      scheduling: this.config.scheduling,
      timeout: this.config.timeout,
    });

    // Track agent stats
    this.setupAgentMonitoring();
  }

  /**
   * Setup monitoring for connection pools
   */
  setupAgentMonitoring() {
    setInterval(() => {
      this.stats.activeConnections =
        (this.httpAgent.sockets ? Object.keys(this.httpAgent.sockets).length : 0) +
        (this.httpsAgent.sockets ? Object.keys(this.httpsAgent.sockets).length : 0);
    }, 5000);
  }

  /**
   * Get the appropriate agent for a URL
   * @param {string} url - Request URL
   * @returns {http.Agent|https.Agent} Appropriate agent
   */
  getAgent(url) {
    return url.startsWith('https') ? this.httpsAgent : this.httpAgent;
  }

  /**
   * Make an HTTP request with connection pooling
   * @param {string} url - Request URL
   * @param {Object} options - Request options
   * @returns {Promise<Response>} Response
   */
  async request(url, options = {}) {
    const {
      method = 'GET',
      headers = {},
      body = null,
      timeout = this.config.requestTimeout,
      retries = this.config.maxRetries,
    } = options;

    let lastError = null;
    let attempt = 0;

    while (attempt <= retries) {
      attempt++;
      this.stats.totalRequests++;

      try {
        const response = await this._makeRequest(url, {
          method,
          headers,
          body,
          timeout,
        });

        this.stats.successfulRequests++;
        return response;
      } catch (error) {
        lastError = error;
        this.stats.failedRequests++;

        // Check if we should retry
        if (this._shouldRetry(error, attempt, retries)) {
          this.stats.retries++;
          const delay = this._getRetryDelay(attempt);
          console.warn(`⚠️ Request failed, retrying in ${delay}ms (attempt ${attempt}/${retries})`);
          await this._sleep(delay);
          continue;
        }

        throw error;
      }
    }

    throw lastError;
  }

  /**
   * Make a single HTTP request
   * @param {string} url - Request URL
   * @param {Object} options - Request options
   * @returns {Promise<Object>} Response object
   */
  async _makeRequest(url, options) {
    const { method, headers, body, timeout } = options;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const fetchOptions = {
        method,
        headers,
        signal: controller.signal,
        agent: this.getAgent(url),
      };

      if (body) {
        fetchOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
      }

      const response = await fetch(url, fetchOptions);

      clearTimeout(timeoutId);

      // Parse response
      const contentType = response.headers.get('content-type') || '';
      let data;

      if (contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      if (!response.ok) {
        const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
        error.status = response.status;
        error.response = { data, headers: Object.fromEntries(response.headers) };
        throw error;
      }

      return {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers),
        data,
      };
    } catch (error) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        const timeoutError = new Error(`Request timeout after ${timeout}ms`);
        timeoutError.code = 'ETIMEDOUT';
        throw timeoutError;
      }

      throw error;
    }
  }

  /**
   * Check if request should be retried
   * @param {Error} error - Error that occurred
   * @param {number} attempt - Current attempt number
   * @param {number} maxRetries - Maximum retries
   * @returns {boolean} True if should retry
   */
  _shouldRetry(error, attempt, maxRetries) {
    if (attempt > maxRetries) {
      return false;
    }

    // Retry on network errors
    if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND') {
      return true;
    }

    // Retry on 5xx errors
    if (error.status >= 500 && error.status < 600) {
      return true;
    }

    // Retry on 429 (rate limit)
    if (error.status === 429) {
      return true;
    }

    return false;
  }

  /**
   * Get retry delay with exponential backoff
   * @param {number} attempt - Current attempt number
   * @returns {number} Delay in milliseconds
   */
  _getRetryDelay(attempt) {
    return this.config.retryDelay * Math.pow(this.config.retryBackoff, attempt - 1);
  }

  /**
   * Sleep for a specified duration
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise<void>}
   */
  _sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Make a GET request
   * @param {string} url - Request URL
   * @param {Object} options - Request options
   * @returns {Promise<Response>} Response
   */
  async get(url, options = {}) {
    return this.request(url, { ...options, method: 'GET' });
  }

  /**
   * Make a POST request
   * @param {string} url - Request URL
   * @param {Object} body - Request body
   * @param {Object} options - Request options
   * @returns {Promise<Response>} Response
   */
  async post(url, body, options = {}) {
    return this.request(url, { ...options, method: 'POST', body });
  }

  /**
   * Make a PUT request
   * @param {string} url - Request URL
   * @param {Object} body - Request body
   * @param {Object} options - Request options
   * @returns {Promise<Response>} Response
   */
  async put(url, body, options = {}) {
    return this.request(url, { ...options, method: 'PUT', body });
  }

  /**
   * Make a DELETE request
   * @param {string} url - Request URL
   * @param {Object} options - Request options
   * @returns {Promise<Response>} Response
   */
  async delete(url, options = {}) {
    return this.request(url, { ...options, method: 'DELETE' });
  }

  /**
   * Make a PATCH request
   * @param {string} url - Request URL
   * @param {Object} body - Request body
   * @param {Object} options - Request options
   * @returns {Promise<Response>} Response
   */
  async patch(url, body, options = {}) {
    return this.request(url, { ...options, method: 'PATCH', body });
  }

  /**
   * Get client statistics
   * @returns {Object} Statistics
   */
  getStats() {
    return {
      ...this.stats,
      httpAgent: {
        sockets: this.httpAgent.sockets ? Object.keys(this.httpAgent.sockets).length : 0,
        freeSockets: this.httpAgent.freeSockets ? Object.keys(this.httpAgent.freeSockets).length : 0,
      },
      httpsAgent: {
        sockets: this.httpsAgent.sockets ? Object.keys(this.httpsAgent.sockets).length : 0,
        freeSockets: this.httpsAgent.freeSockets ? Object.keys(this.httpsAgent.freeSockets).length : 0,
      },
    };
  }

  /**
   * Destroy all connections
   */
  destroy() {
    this.httpAgent.destroy();
    this.httpsAgent.destroy();
  }
}

// Singleton instance
let defaultClient = null;

/**
 * Get the default HTTP client instance
 * @param {Object} options - Client options
 * @returns {HttpClient} Default client
 */
export function getHttpClient(options = {}) {
  if (!defaultClient) {
    defaultClient = new HttpClient(options);
  }
  return defaultClient;
}

/**
 * Initialize the default HTTP client
 * @param {Object} options - Client options
 * @returns {HttpClient} Initialized client
 */
export function initializeHttpClient(options = {}) {
  if (defaultClient) {
    defaultClient.destroy();
  }
  defaultClient = new HttpClient(options);
  return defaultClient;
}

export default HttpClient;
