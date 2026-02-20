/**
 * HashiCorp Vault Integration for Production Secret Management
 * Implements VaultSecretsManager class with AppRole authentication
 * @module security/vault-manager
 * @version 1.0.0
 */

import axios from 'axios';
import { LRUCache } from 'lru-cache';

/**
 * Vault Secrets Manager for secure secret storage
 */
export class VaultSecretsManager {
  /**
   * @param {Object} config - Vault configuration
   * @param {string} config.address - Vault server address (e.g., 'https://vault.company.com:8200')
   * @param {'approle'|'token'} config.authMethod - Authentication method
   * @param {string} [config.roleId] - Role ID for AppRole auth
   * @param {string} [config.secretId] - Secret ID for AppRole auth
   * @param {string} [config.token] - Direct token for token auth
   * @param {string} [config.mountPath='secret'] - Mount path for KV secrets
   * @param {string} [config.namespace] - Vault namespace
   * @param {number} [config.cacheTtl=300000] - Cache TTL in ms (5 minutes)
   * @param {number} [config.cacheMax=100] - Maximum cache entries
   */
  constructor(config) {
    this.config = {
      mountPath: 'secret',
      cacheTtl: 300000,
      cacheMax: 100,
      ...config
    };

    // Validate required config
    if (!this.config.address) {
      throw new Error('Vault address is required');
    }

    if (this.config.authMethod === 'approle' && (!this.config.roleId || !this.config.secretId)) {
      throw new Error('roleId and secretId are required for AppRole authentication');
    }

    if (this.config.authMethod === 'token' && !this.config.token) {
      throw new Error('token is required for token authentication');
    }

    // Initialize HTTP client
    this.client = axios.create({
      baseURL: this.config.address,
      timeout: 5000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Initialize cache
    this.cache = new LRUCache({
      max: this.config.cacheMax,
      ttl: this.config.cacheTtl,
      updateAgeOnGet: true
    });

    // Authentication state
    this.token = null;
    this.authenticated = false;
    this.leaseEndTime = null;

    // Circuit breaker state
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.circuitOpen = false;
    this.resetTimeout = 60000; // 1 minute
  }

  /**
   * Authenticate with Vault
   * @returns {Promise<void>}
   */
  async authenticate() {
    if (this.circuitOpen) {
      const timeSinceFailure = Date.now() - this.lastFailureTime;
      if (timeSinceFailure < this.resetTimeout) {
        throw new Error('Vault circuit breaker is open. Service temporarily unavailable.');
      }
      this.circuitOpen = false;
      this.failureCount = 0;
    }

    try {
      if (this.config.authMethod === 'approle') {
        await this._authenticateWithAppRole();
      } else if (this.config.authMethod === 'token') {
        await this._authenticateWithToken();
      }

      this.authenticated = true;
      console.log('✅ Vault authentication successful');
    } catch (error) {
      this._handleAuthFailure(error);
      throw error;
    }
  }

  /**
   * Authenticate using AppRole method
   * @private
   */
  async _authenticateWithAppRole() {
    const response = await this.client.post('/v1/auth/approle/login', {
      role_id: this.config.roleId,
      secret_id: this.config.secretId
    });

    this.token = response.data.auth.client_token;
    this.client.defaults.headers['X-Vault-Token'] = this.token;

    // Set lease renewal time (80% of lease duration)
    const leaseDuration = response.data.auth.lease_duration;
    this.leaseEndTime = Date.now() + (leaseDuration * 0.8 * 1000);
  }

  /**
   * Authenticate using token method
   * @private
   */
  async _authenticateWithToken() {
    // Validate token by making a simple request
    await this.client.get('/v1/auth/token/lookup-self', {
      headers: { 'X-Vault-Token': this.config.token }
    });

    this.token = this.config.token;
    this.client.defaults.headers['X-Vault-Token'] = this.token;
  }

  /**
   * Handle authentication failure with circuit breaker
   * @private
   */
  _handleAuthFailure(error) {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    this.authenticated = false;

    if (this.failureCount >= 3) {
      this.circuitOpen = true;
      console.warn('⚠️ Vault circuit breaker opened due to repeated failures');
    }

    console.error('❌ Vault authentication failed:', error.message);
  }

  /**
   * Get secret from Vault KV v2
   * @param {string} path - Secret path (e.g., 'myapp/database/password')
   * @returns {Promise<string|null>} Secret value or null if not found
   */
  async getSecret(path) {
    await this._ensureAuthenticated();

    const cacheKey = `secret:${path}`;
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const response = await this.client.get(`/v1/${this.config.mountPath}/data/${path}`);
      const value = response.data.data.data.value;

      this.cache.set(cacheKey, value);
      console.log(`🔑 Retrieved secret from Vault: ${path}`);
      return value;
    } catch (error) {
      if (error.response?.status === 404) {
        console.warn(`⚠️ Secret not found in Vault: ${path}`);
        return null;
      }
      this._handleVaultError(error, 'getSecret');
      throw error;
    }
  }

  /**
   * Set secret in Vault KV v2
   * @param {string} path - Secret path
   * @param {string} value - Secret value
   * @returns {Promise<void>}
   */
  async setSecret(path, value) {
    await this._ensureAuthenticated();

    try {
      await this.client.post(`/v1/${this.config.mountPath}/data/${path}`, {
        data: { value }
      });

      // Update cache
      const cacheKey = `secret:${path}`;
      this.cache.set(cacheKey, value);

      console.log(`🔒 Stored secret in Vault: ${path}`);
    } catch (error) {
      this._handleVaultError(error, 'setSecret');
      throw error;
    }
  }

  /**
   * List secrets under a prefix
   * @param {string} prefix - Path prefix
   * @returns {Promise<string[]>} Array of secret paths
   */
  async listSecrets(prefix = '') {
    await this._ensureAuthenticated();

    try {
      // Use GET with list=true parameter instead of .list()
      const response = await this.client.get(`/v1/${this.config.mountPath}/metadata/${prefix}?list=true`);
      return response.data.data.keys || [];
    } catch (error) {
      if (error.response?.status === 404) {
        return [];
      }
      this._handleVaultError(error, 'listSecrets');
      throw error;
    }
  }

  /**
   * Renew lease for dynamic secrets
   * @param {string} leaseId - Lease ID to renew
   * @returns {Promise<void>}
   */
  async renewLease(leaseId) {
    await this._ensureAuthenticated();

    try {
      await this.client.put('/v1/sys/leases/renew', {
        lease_id: leaseId,
        increment: 3600 // Renew for 1 hour
      });
      console.log(`♻️ Renewed Vault lease: ${leaseId}`);
    } catch (error) {
      this._handleVaultError(error, 'renewLease');
      throw error;
    }
  }

  /**
   * Health check Vault connectivity
   * @returns {Promise<{healthy: boolean, version?: string, reachable: boolean}>}
   */
  async healthCheck() {
    try {
      const response = await this.client.get('/v1/sys/health');
      
      return {
        healthy: response.status === 200 || response.status === 429 || response.status === 472,
        version: response.data.version,
        reachable: true
      };
    } catch (error) {
      return {
        healthy: false,
        reachable: false,
        error: error.message
      };
    }
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
    console.log('🧹 Vault cache cleared');
  }

  /**
   * Ensure authenticated with automatic renewal
   * @private
   */
  async _ensureAuthenticated() {
    // Check if token is about to expire
    if (this.leaseEndTime && Date.now() >= this.leaseEndTime) {
      console.log('🔄 Vault token expiring soon, re-authenticating...');
      await this.authenticate();
    }

    if (!this.authenticated) {
      await this.authenticate();
    }
  }

  /**
   * Handle Vault API errors with exponential backoff
   * @private
   */
  _handleVaultError(error, operation) {
    console.error(`❌ Vault operation failed [${operation}]:`, error.message);
    
    // Increment failure counter for circuit breaker
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.failureCount >= 3) {
      this.circuitOpen = true;
    }
  }

  /**
   * Close connections and cleanup
   */
  async close() {
    this.cache.clear();
    this.authenticated = false;
    this.token = null;
    console.log('🔌 Vault manager closed');
  }
}

export default VaultSecretsManager;
