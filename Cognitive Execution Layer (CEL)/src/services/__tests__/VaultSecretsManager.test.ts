/**
 * Vault Secrets Manager Unit Tests
 * Comprehensive test suite for Vault integration
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import axios from 'axios';
import { AxiosInstance } from 'axios';
import { VaultSecretsManager, VaultConfig } from '../src/services/VaultSecretsManager';

// Mock axios
vi.mock('axios');
const mockedAxios = vi.mocked(axios);

describe('VaultSecretsManager', () => {
  let vaultManager: VaultSecretsManager;
  let mockAxiosInstance: AxiosInstance;

  const mockConfig: VaultConfig = {
    address: 'https://vault.example.com',
    authMethod: 'approle',
    roleId: 'test-role-id',
    secretId: 'test-secret-id',
    mountPath: 'secret',
    timeoutMs: 5000,
    retryAttempts: 3,
    retryDelayMs: 100
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Create mock axios instance
    mockAxiosInstance = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() }
      }
    } as any;
    
    mockedAxios.create = vi.fn().mockReturnValue(mockAxiosInstance);
    
    vaultManager = new VaultSecretsManager(mockConfig);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Constructor', () => {
    it('should initialize with default config', () => {
      const manager = new VaultSecretsManager({
        address: 'https://vault.example.com',
        authMethod: 'token',
        token: 'test-token'
      });

      expect(manager).toBeDefined();
    });

    it('should merge config with defaults', () => {
      const manager = new VaultSecretsManager(mockConfig);
      expect(manager).toBeDefined();
    });
  });

  describe('Authentication', () => {
    it('should authenticate with AppRole', async () => {
      const mockAuthResponse = {
        data: {
          auth: {
            client_token: 'test-token',
            lease_duration: 3600,
            renewable: true
          }
        }
      };

      mockAxiosInstance.post = vi.fn().mockResolvedValue(mockAuthResponse);

      await vaultManager.authenticate();

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/v1/auth/approle/login',
        {
          role_id: 'test-role-id',
          secret_id: 'test-secret-id'
        }
      );
    });

    it('should authenticate with token', async () => {
      const tokenConfig: VaultConfig = {
        address: 'https://vault.example.com',
        authMethod: 'token',
        token: 'existing-token'
      };

      const manager = new VaultSecretsManager(tokenConfig);
      
      mockAxiosInstance.get = vi.fn().mockResolvedValue({ data: {} });

      await manager.authenticate();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/v1/auth/token/lookup-self');
    });

    it('should handle authentication failure', async () => {
      mockAxiosInstance.post = vi.fn().mockRejectedValue(new Error('Auth failed'));

      await expect(vaultManager.authenticate()).rejects.toThrow('Vault authentication failed');
    });

    it('should throw error for missing AppRole credentials', async () => {
      const invalidConfig: VaultConfig = {
        address: 'https://vault.example.com',
        authMethod: 'approle'
      };

      const manager = new VaultSecretsManager(invalidConfig);

      await expect(manager.authenticate()).rejects.toThrow('AppRole authentication requires roleId and secretId');
    });
  });

  describe('Secret Management', () => {
    beforeEach(() => {
      // Mock successful authentication
      mockAxiosInstance.post = vi.fn().mockResolvedValue({
        data: {
          auth: {
            client_token: 'test-token',
            lease_duration: 3600,
            renewable: true
          }
        }
      });
    });

    it('should get secret successfully', async () => {
      const mockSecretResponse = {
        data: {
          data: {
            data: {
              username: 'test-user',
              password: 'test-password'
            }
          }
        }
      };

      mockAxiosInstance.get = vi.fn().mockResolvedValue(mockSecretResponse);

      const secret = await vaultManager.getSecret('test-secret');

      expect(secret).toEqual({
        username: 'test-user',
        password: 'test-password'
      });

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/v1/secret/data/test-secret');
    });

    it('should get secret with specific version', async () => {
      const mockSecretResponse = {
        data: {
          data: {
            data: {
              username: 'test-user-v2',
              password: 'test-password-v2'
            }
          }
        }
      };

      mockAxiosInstance.get = vi.fn().mockResolvedValue(mockSecretResponse);

      const secret = await vaultManager.getSecret('test-secret', { version: 2 });

      expect(secret).toEqual({
        username: 'test-user-v2',
        password: 'test-password-v2'
      });

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/v1/secret/data/test-secret?version=2');
    });

    it('should return null for non-existent secret', async () => {
      mockAxiosInstance.get = vi.fn().mockResolvedValue({ data: {} });

      const secret = await vaultManager.getSecret('non-existent');

      expect(secret).toBeNull();
    });

    it('should set secret successfully', async () => {
      const secretData = {
        api_key: 'test-api-key',
        database_url: 'test-db-url'
      };

      mockAxiosInstance.post = vi.fn().mockResolvedValue({ data: {} });

      await vaultManager.setSecret('new-secret', secretData);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/v1/secret/data/new-secret',
        {
          data: secretData
        }
      );
    });

    it('should list secrets successfully', async () => {
      const mockListResponse = {
        data: {
          keys: ['secret1', 'secret2', 'secret3']
        }
      };

      mockAxiosInstance.get = vi.fn().mockResolvedValue(mockListResponse);

      const secrets = await vaultManager.listSecrets('app/');

      expect(secrets).toEqual(['secret1', 'secret2', 'secret3']);

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/v1/secret/metadata/app/?list=true');
    });

    it('should cache secret retrieval', async () => {
      const mockSecretResponse = {
        data: {
          data: {
            data: {
              username: 'test-user',
              password: 'test-password'
            }
          }
        }
      };

      mockAxiosInstance.get = vi.fn().mockResolvedValue(mockSecretResponse);

      // First call
      await vaultManager.getSecret('cached-secret');
      // Second call should use cache
      await vaultManager.getSecret('cached-secret');

      // Should only make one HTTP call due to caching
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(1);
    });
  });

  describe('Transit Operations', () => {
    beforeEach(() => {
      // Mock successful authentication
      mockAxiosInstance.post = vi.fn().mockResolvedValue({
        data: {
          auth: {
            client_token: 'test-token',
            lease_duration: 3600,
            renewable: true
          }
        }
      });
    });

    it('should encrypt data successfully', async () => {
      const plaintext = Buffer.from('secret data');
      const mockEncryptResponse = {
        data: {
          ciphertext: 'vault:v1:encrypted-data'
        }
      };

      mockAxiosInstance.post = vi.fn()
        .mockResolvedValueOnce({ data: { auth: { client_token: 'test-token', lease_duration: 3600, renewable: true } } })
        .mockResolvedValueOnce(mockEncryptResponse);

      const ciphertext = await vaultManager.transitEncrypt('transit-key', plaintext);

      expect(ciphertext).toBe('vault:v1:encrypted-data');
    });

    it('should decrypt data successfully', async () => {
      const ciphertext = 'vault:v1:encrypted-data';
      const plaintext = Buffer.from('secret data');
      const mockDecryptResponse = {
        data: {
          plaintext: plaintext.toString('base64')
        }
      };

      mockAxiosInstance.post = vi.fn()
        .mockResolvedValueOnce({ data: { auth: { client_token: 'test-token', lease_duration: 3600, renewable: true } } })
        .mockResolvedValueOnce(mockDecryptResponse);

      const decrypted = await vaultManager.transitDecrypt('transit-key', ciphertext);

      expect(decrypted).toEqual(plaintext);
    });

    it('should handle encryption failure', async () => {
      const plaintext = Buffer.from('secret data');

      mockAxiosInstance.post = vi.fn()
        .mockResolvedValueOnce({ data: { auth: { client_token: 'test-token', lease_duration: 3600, renewable: true } } })
        .mockRejectedValueOnce(new Error('Encryption failed'));

      await expect(vaultManager.transitEncrypt('transit-key', plaintext)).rejects.toThrow();
    });
  });

  describe('Health Check', () => {
    it('should return healthy status when Vault is accessible', async () => {
      const mockHealthResponse = {
        status: 200,
        headers: {
          'x-vault-version': '1.12.0'
        },
        data: {
          initialized: true,
          sealed: false,
          standby: false
        }
      };

      mockAxiosInstance.get = vi.fn().mockResolvedValue(mockHealthResponse);

      const health = await vaultManager.healthCheck();

      expect(health).toEqual({
        healthy: true,
        version: '1.12.0',
        reachable: true,
        initialized: true,
        sealed: false,
        standby: false
      });
    });

    it('should return unhealthy status when Vault is unreachable', async () => {
      mockAxiosInstance.get = vi.fn().mockRejectedValue(new Error('Network error'));

      const health = await vaultManager.healthCheck();

      expect(health).toEqual({
        healthy: false,
        reachable: false,
        initialized: false,
        sealed: true,
        standby: false
      });
    });
  });

  describe('Circuit Breaker', () => {
    beforeEach(() => {
      // Mock successful authentication
      mockAxiosInstance.post = vi.fn().mockResolvedValue({
        data: {
          auth: {
            client_token: 'test-token',
            lease_duration: 3600,
            renewable: true
          }
        }
      });
    });

    it('should open circuit breaker after multiple failures', async () => {
      mockAxiosInstance.get = vi.fn().mockRejectedValue(new Error('Consistent failure'));

      // Make multiple failed requests
      for (let i = 0; i < 6; i++) {
        try {
          await vaultManager.getSecret('test-secret');
        } catch (error) {
          // Expected to fail
        }
      }

      const status = vaultManager.getCircuitBreakerStatus();
      expect(status.isOpen).toBe(true);
      expect(status.failureCount).toBe(6);
    });

    it('should reset circuit breaker on success', async () => {
      // First, open the circuit breaker
      mockAxiosInstance.get = vi.fn().mockRejectedValue(new Error('Failure'));
      
      for (let i = 0; i < 6; i++) {
        try {
          await vaultManager.getSecret('test-secret');
        } catch (error) {
          // Expected to fail
        }
      }

      // Now make it succeed
      const mockSecretResponse = {
        data: {
          data: {
            data: { test: 'value' }
          }
        }
      };

      mockAxiosInstance.get = vi.fn().mockResolvedValue(mockSecretResponse);

      // Wait for circuit breaker timeout and try again
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const result = await vaultManager.getSecret('test-secret');
      
      expect(result).toEqual({ test: 'value' });
      
      const status = vaultManager.getCircuitBreakerStatus();
      expect(status.isOpen).toBe(false);
      expect(status.failureCount).toBe(0);
    });
  });

  describe('Cache Management', () => {
    it('should clear cache', () => {
      vaultManager.clearCache();
      const stats = vaultManager.getCacheStats();
      expect(stats.size).toBe(0);
    });

    it('should provide cache statistics', () => {
      const stats = vaultManager.getCacheStats();
      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('entries');
      expect(Array.isArray(stats.entries)).toBe(true);
    });
  });

  describe('Event Emission', () => {
    it('should emit events on operations', async () => {
      const authenticateSpy = vi.fn();
      const secretRetrievedSpy = vi.fn();
      const secretStoredSpy = vi.fn();

      vaultManager.on('authenticated', authenticateSpy);
      vaultManager.on('secretRetrieved', secretRetrievedSpy);
      vaultManager.on('secretStored', secretStoredSpy);

      // Mock authentication
      mockAxiosInstance.post = vi.fn().mockResolvedValue({
        data: {
          auth: {
            client_token: 'test-token',
            lease_duration: 3600,
            renewable: true
          }
        }
      });

      // Mock secret operations
      mockAxiosInstance.get = vi.fn().mockResolvedValue({
        data: {
          data: {
            data: { test: 'value' }
          }
        }
      });

      mockAxiosInstance.post = vi.fn().mockResolvedValue({ data: {} });

      await vaultManager.authenticate();
      await vaultManager.getSecret('test-secret');
      await vaultManager.setSecret('test-secret', { test: 'value' });

      expect(authenticateSpy).toHaveBeenCalled();
      expect(secretRetrievedSpy).toHaveBeenCalledWith({ path: 'test-secret', version: undefined });
      expect(secretStoredSpy).toHaveBeenCalledWith({ path: 'test-secret' });
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      mockAxiosInstance.post = vi.fn().mockRejectedValue(new Error('Network timeout'));

      await expect(vaultManager.authenticate()).rejects.toThrow('Vault authentication failed');
    });

    it('should retry operations with exponential backoff', async () => {
      mockAxiosInstance.post = vi.fn()
        .mockRejectedValueOnce(new Error('First failure'))
        .mockRejectedValueOnce(new Error('Second failure'))
        .mockResolvedValueOnce({
          data: {
            auth: {
              client_token: 'test-token',
              lease_duration: 3600,
              renewable: true
            }
          }
        });

      const startTime = Date.now();
      await vaultManager.authenticate();
      const endTime = Date.now();

      // Should have taken some time due to retries
      expect(endTime - startTime).toBeGreaterThan(100);
    });
  });

  describe('Shutdown', () => {
    it('should shutdown gracefully', async () => {
      const shutdownSpy = vi.fn();
      vaultManager.on('shutdown', shutdownSpy);

      await vaultManager.shutdown();

      expect(shutdownSpy).toHaveBeenCalled();
      
      const stats = vaultManager.getCacheStats();
      expect(stats.size).toBe(0);
    });
  });
});
