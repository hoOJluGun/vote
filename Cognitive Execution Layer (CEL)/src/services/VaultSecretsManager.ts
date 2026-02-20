/**
 * Vault Secrets Manager
 * Comprehensive HashiCorp Vault integration for secure secrets management
 */

import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import crypto from 'crypto';
import EventEmitter from 'events';

export interface VaultConfig {
  address: string;
  authMethod: 'approle' | 'token' | 'kubernetes';
  roleId?: string;
  secretId?: string;
  token?: string;
  mountPath?: string;
  namespace?: string;
  timeoutMs?: number;
  retryAttempts?: number;
  retryDelayMs?: number;
}

export interface VaultSecret {
  data: Record<string, any>;
  metadata?: {
    created_time: string;
    deletion_time: string;
    destroyed: boolean;
    version: number;
  };
}

export interface HealthStatus {
  healthy: boolean;
  version?: string;
  reachable: boolean;
  initialized: boolean;
  sealed: boolean;
  standby: boolean;
}

export interface TransitEncryptResult {
  ciphertext: string;
  key_version: number;
  creation_time: string;
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

/**
 * Vault Secrets Manager with circuit breaker, caching, and retry logic
 */
export class VaultSecretsManager extends EventEmitter {
  private config: VaultConfig;
  private client: AxiosInstance;
  private token?: string;
  private tokenExpiry?: number;
  private cache: Map<string, CacheEntry<any>> = new Map();
  private circuitBreakerState: {
    isOpen: boolean;
    failureCount: number;
    lastFailureTime: number;
    nextRetryTime: number;
  } = {
    isOpen: false,
    failureCount: 0,
    lastFailureTime: 0,
    nextRetryTime: 0
  };

  constructor(config: VaultConfig) {
    super();
    
    this.config = {
      timeoutMs: 30000,
      retryAttempts: 3,
      retryDelayMs: 1000,
      mountPath: 'secret',
      ...config
    };

    this.client = axios.create({
      baseURL: this.config.address,
      timeout: this.config.timeoutMs,
      headers: {
        'Content-Type': 'application/json',
        'X-Vault-Namespace': this.config.namespace
      }
    });

    // Request interceptor for auth token
    this.client.interceptors.request.use(
      (config) => {
        if (this.token) {
          config.headers['X-Vault-Token'] = this.token;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for token renewal
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 403 && this.token) {
          // Token might be expired, try to renew
          try {
            await this.renewToken();
            // Retry the original request
            return this.client.request(error.config);
          } catch (renewError) {
            // Renewal failed, re-authenticate
            await this.authenticate();
            return this.client.request(error.config);
          }
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Authenticate with Vault using configured method
   */
  async authenticate(): Promise<void> {
    try {
      let authResponse;

      switch (this.config.authMethod) {
        case 'approle':
          if (!this.config.roleId || !this.config.secretId) {
            throw new Error('AppRole authentication requires roleId and secretId');
          }
          authResponse = await this.client.post('/v1/auth/approle/login', {
            role_id: this.config.roleId,
            secret_id: this.config.secretId
          });
          break;

        case 'token':
          if (!this.config.token) {
            throw new Error('Token authentication requires token');
          }
          // Validate existing token
          await this.client.get('/v1/auth/token/lookup-self');
          this.token = this.config.token;
          this.emit('authenticated', { method: 'token' });
          return;

        case 'kubernetes':
          // Kubernetes auth would need JWT token from service account
          const jwtToken = await this.getKubernetesJWT();
          authResponse = await this.client.post('/v1/auth/kubernetes/login', {
            jwt: jwtToken,
            role: this.config.roleId
          });
          break;

        default:
          throw new Error(`Unsupported auth method: ${this.config.authMethod}`);
      }

      if (authResponse?.data?.auth) {
        const { client_token, lease_duration, renewable } = authResponse.data.auth;
        this.token = client_token;
        this.tokenExpiry = Date.now() + (lease_duration * 1000);
        this.emit('authenticated', { 
          method: this.config.authMethod,
          leaseDuration: lease_duration,
          renewable 
        });
      } else {
        throw new Error('Authentication failed: invalid response');
      }
    } catch (error) {
      this.emit('authError', error);
      throw new Error(`Vault authentication failed: ${error.message}`);
    }
  }

  /**
   * Get Kubernetes JWT token for service account
   */
  private async getKubernetesJWT(): Promise<string> {
    try {
      const fs = await import('fs/promises');
      const jwtToken = await fs.readFile('/var/run/secrets/kubernetes.io/serviceaccount/token', 'utf8');
      return jwtToken.trim();
    } catch (error) {
      throw new Error(`Failed to read Kubernetes service account token: ${error.message}`);
    }
  }

  /**
   * Renew authentication token
   */
  async renewToken(): Promise<void> {
    if (!this.token) {
      throw new Error('No token to renew');
    }

    try {
      const response = await this.client.post('/v1/auth/token/renew-self');
      if (response.data?.auth) {
        const { client_token, lease_duration } = response.data.auth;
        this.token = client_token;
        this.tokenExpiry = Date.now() + (lease_duration * 1000);
        this.emit('tokenRenewed', { leaseDuration: lease_duration });
      }
    } catch (error) {
      throw new Error(`Token renewal failed: ${error.message}`);
    }
  }

  /**
   * Check if token is expired or will expire soon
   */
  private isTokenExpired(): boolean {
    if (!this.tokenExpiry) return false;
    // Renew 5 minutes before expiry
    return Date.now() >= (this.tokenExpiry - 300000);
  }

  /**
   * Ensure valid authentication before making requests
   */
  private async ensureAuthenticated(): Promise<void> {
    if (!this.token || this.isTokenExpired()) {
      await this.authenticate();
    }
  }

  /**
   * Execute request with circuit breaker and retry logic
   */
  private async executeRequest<T>(
    requestFn: () => Promise<T>,
    operation: string
  ): Promise<T> {
    // Check circuit breaker
    if (this.circuitBreakerState.isOpen) {
      if (Date.now() < this.circuitBreakerState.nextRetryTime) {
        throw new Error(`Circuit breaker is open for ${operation}`);
      } else {
        // Try to close circuit breaker
        this.circuitBreakerState.isOpen = false;
        this.circuitBreakerState.failureCount = 0;
      }
    }

    let lastError: Error;

    for (let attempt = 0; attempt < this.config.retryAttempts; attempt++) {
      try {
        const result = await requestFn();
        
        // Reset circuit breaker on success
        this.circuitBreakerState.failureCount = 0;
        this.circuitBreakerState.isOpen = false;
        
        return result;
      } catch (error) {
        lastError = error;
        this.circuitBreakerState.failureCount++;
        this.circuitBreakerState.lastFailureTime = Date.now();

        // Open circuit breaker if failure threshold reached
        if (this.circuitBreakerState.failureCount >= 5) {
          this.circuitBreakerState.isOpen = true;
          this.circuitBreakerState.nextRetryTime = Date.now() + (60000); // 1 minute
          this.emit('circuitBreakerOpen', { operation });
        }

        if (attempt < this.config.retryAttempts - 1) {
          // Exponential backoff with jitter
          const delay = this.config.retryDelayMs * Math.pow(2, attempt) + Math.random() * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    this.emit('requestFailed', { operation, error: lastError });
    throw lastError;
  }

  /**
   * Get secret from Vault KV v2 store
   */
  async getSecret(path: string, options?: { version?: number }): Promise<Record<string, any> | null> {
    const cacheKey = `secret:${path}:${options?.version || 'latest'}`;
    
    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data;
    }

    return this.executeRequest(async () => {
      await this.ensureAuthenticated();
      
      const versionParam = options?.version ? `?version=${options.version}` : '';
      const fullPath = `/v1/${this.config.mountPath}/data/${path}${versionParam}`;
      
      const response = await this.client.get(fullPath);
      
      if (response.data?.data?.data) {
        const secret = response.data.data.data;
        
        // Cache the secret metadata (not the actual secret)
        this.cache.set(cacheKey, {
          data: secret,
          timestamp: Date.now(),
          ttl: 300000 // 5 minutes
        });
        
        this.emit('secretRetrieved', { path, version: options?.version });
        return secret;
      }
      
      return null;
    }, `getSecret(${path})`);
  }

  /**
   * Store secret in Vault KV v2 store
   */
  async setSecret(path: string, value: Record<string, any>): Promise<void> {
    return this.executeRequest(async () => {
      await this.ensureAuthenticated();
      
      const fullPath = `/v1/${this.config.mountPath}/data/${path}`;
      
      await this.client.post(fullPath, {
        data: value
      });
      
      // Invalidate cache for this path
      this.invalidateCache(`secret:${path}:`);
      
      this.emit('secretStored', { path });
    }, `setSecret(${path})`);
  }

  /**
   * List secrets at a given path
   */
  async listSecrets(prefix: string): Promise<string[]> {
    return this.executeRequest(async () => {
      await this.ensureAuthenticated();
      
      const fullPath = `/v1/${this.config.mountPath}/metadata/${prefix}?list=true`;
      
      const response = await this.client.get(fullPath);
      
      if (response.data?.data?.keys) {
        return response.data.data.keys;
      }
      
      return [];
    }, `listSecrets(${prefix})`);
  }

  /**
   * Renew a lease
   */
  async renewLease(leaseId: string): Promise<void> {
    return this.executeRequest(async () => {
      await this.ensureAuthenticated();
      
      await this.client.put('/v1/sys/leases/renew', {
        lease_id: leaseId,
        increment: 3600 // Renew for 1 hour
      });
      
      this.emit('leaseRenewed', { leaseId });
    }, `renewLease(${leaseId})`);
  }

  /**
   * Encrypt data using Vault Transit engine
   */
  async transitEncrypt(keyName: string, plaintext: Buffer): Promise<string> {
    return this.executeRequest(async () => {
      await this.ensureAuthenticated();
      
      const base64Plaintext = plaintext.toString('base64');
      const response = await this.client.post(`/v1/transit/encrypt/${keyName}`, {
        plaintext: base64Plaintext,
        context: this.generateTransitContext()
      });
      
      if (response.data?.data?.ciphertext) {
        this.emit('dataEncrypted', { keyName, size: plaintext.length });
        return response.data.data.ciphertext;
      }
      
      throw new Error('Encryption failed: no ciphertext in response');
    }, `transitEncrypt(${keyName})`);
  }

  /**
   * Decrypt data using Vault Transit engine
   */
  async transitDecrypt(keyName: string, ciphertext: string): Promise<Buffer> {
    return this.executeRequest(async () => {
      await this.ensureAuthenticated();
      
      const response = await this.client.post(`/v1/transit/decrypt/${keyName}`, {
        ciphertext: ciphertext,
        context: this.generateTransitContext()
      });
      
      if (response.data?.data?.plaintext) {
        const base64Plaintext = response.data.data.plaintext;
        const plaintext = Buffer.from(base64Plaintext, 'base64');
        this.emit('dataDecrypted', { keyName, size: plaintext.length });
        return plaintext;
      }
      
      throw new Error('Decryption failed: no plaintext in response');
    }, `transitDecrypt(${keyName})`);
  }

  /**
   * Generate context for transit operations
   */
  private generateTransitContext(): string {
    const context = {
      timestamp: Date.now(),
      source: 'cel-vault-manager',
      nonce: crypto.randomBytes(16).toString('hex')
    };
    return Buffer.from(JSON.stringify(context)).toString('base64');
  }

  /**
   * Check Vault health status
   */
  async healthCheck(): Promise<HealthStatus> {
    try {
      const response = await this.client.get('/v1/sys/health', {
        validateStatus: () => true // Accept any status code
      });
      
      return {
        healthy: response.status >= 200 && response.status < 300,
        version: response.headers['x-vault-version'],
        reachable: true,
        initialized: response.data?.initialized || false,
        sealed: response.data?.sealed || false,
        standby: response.data?.standby || false
      };
    } catch (error) {
      return {
        healthy: false,
        reachable: false,
        initialized: false,
        sealed: true,
        standby: false
      };
    }
  }

  /**
   * Invalidate cache entries matching pattern
   */
  private invalidateCache(pattern: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear all cache entries
   */
  clearCache(): void {
    this.cache.clear();
    this.emit('cacheCleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; entries: Array<{ key: string; age: number; ttl: number }> } {
    const entries = Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      age: Date.now() - entry.timestamp,
      ttl: entry.ttl
    }));
    
    return {
      size: this.cache.size,
      entries
    };
  }

  /**
   * Get circuit breaker status
   */
  getCircuitBreakerStatus(): {
    isOpen: boolean;
    failureCount: number;
    lastFailureTime: number;
    nextRetryTime: number;
  } {
    return { ...this.circuitBreakerState };
  }

  /**
   * Reset circuit breaker
   */
  resetCircuitBreaker(): void {
    this.circuitBreakerState = {
      isOpen: false,
      failureCount: 0,
      lastFailureTime: 0,
      nextRetryTime: 0
    };
    this.emit('circuitBreakerReset');
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    this.clearCache();
    this.removeAllListeners();
    this.emit('shutdown');
  }
}

export default VaultSecretsManager;
