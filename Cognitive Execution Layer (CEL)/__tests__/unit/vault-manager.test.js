/**
 * Vault Manager Unit Tests
 * Tests VaultSecretsManager with mocked Vault API endpoints
 */

import { VaultSecretsManager } from '../../security/vault-manager.js';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';

describe('VaultSecretsManager', () => {
  let vaultManager;
  let mock;

  beforeEach(() => {
    mock = new MockAdapter(axios);
  });

  afterEach(() => {
    mock.restore();
    if (vaultManager) {
      vaultManager.close();
    }
  });

  describe('Constructor', () => {
    test('should initialize with AppRole config', () => {
      const config = {
        address: 'https://vault.example.com:8200',
        authMethod: 'approle',
        roleId: 'test-role-id',
        secretId: 'test-secret-id'
      };

      vaultManager = new VaultSecretsManager(config);
      expect(vaultManager.config.address).toBe(config.address);
      expect(vaultManager.config.authMethod).toBe('approle');
    });

    test('should initialize with token config', () => {
      const config = {
        address: 'https://vault.example.com:8200',
        authMethod: 'token',
        token: 'test-token'
      };

      vaultManager = new VaultSecretsManager(config);
      expect(vaultManager.config.authMethod).toBe('token');
    });

    test('should throw error for missing address', () => {
      expect(() => {
        new VaultSecretsManager({ authMethod: 'token' });
      }).toThrow('Vault address is required');
    });

    test('should throw error for missing AppRole credentials', () => {
      expect(() => {
        new VaultSecretsManager({
          address: 'https://vault.example.com:8200',
          authMethod: 'approle'
        });
      }).toThrow('roleId and secretId are required for AppRole authentication');
    });

    test('should throw error for missing token', () => {
      expect(() => {
        new VaultSecretsManager({
          address: 'https://vault.example.com:8200',
          authMethod: 'token'
        });
      }).toThrow('token is required for token authentication');
    });
  });

  describe('Authentication', () => {
    test('should authenticate with AppRole', async () => {
      const config = {
        address: 'https://vault.example.com:8200',
        authMethod: 'approle',
        roleId: 'test-role-id',
        secretId: 'test-secret-id'
      };

      vaultManager = new VaultSecretsManager(config);

      // Mock AppRole login
      mock.onPost('/v1/auth/approle/login').reply(200, {
        auth: {
          client_token: 'test-client-token',
          lease_duration: 2764800
        }
      });

      await vaultManager.authenticate();

      expect(vaultManager.authenticated).toBe(true);
      expect(vaultManager.token).toBe('test-client-token');
    });

    test('should authenticate with token', async () => {
      const config = {
        address: 'https://vault.example.com:8200',
        authMethod: 'token',
        token: 'test-token'
      };

      vaultManager = new VaultSecretsManager(config);

      // Mock token lookup
      mock.onGet('/v1/auth/token/lookup-self').reply(200, {
        data: { id: 'test-token' }
      });

      await vaultManager.authenticate();

      expect(vaultManager.authenticated).toBe(true);
      expect(vaultManager.token).toBe('test-token');
    });

    test('should handle authentication failure', async () => {
      const config = {
        address: 'https://vault.example.com:8200',
        authMethod: 'approle',
        roleId: 'test-role-id',
        secretId: 'test-secret-id'
      };

      vaultManager = new VaultSecretsManager(config);

      mock.onPost('/v1/auth/approle/login').networkError();

      await expect(vaultManager.authenticate()).rejects.toThrow();
      expect(vaultManager.authenticated).toBe(false);
    });

    test('should implement circuit breaker for repeated failures', async () => {
      const config = {
        address: 'https://vault.example.com:8200',
        authMethod: 'approle',
        roleId: 'test-role-id',
        secretId: 'test-secret-id'
      };

      vaultManager = new VaultSecretsManager(config);

      // Fail 3 times
      mock.onPost('/v1/auth/approle/login').networkError();

      await expect(vaultManager.authenticate()).rejects.toThrow();
      await expect(vaultManager.authenticate()).rejects.toThrow();
      await expect(vaultManager.authenticate()).rejects.toThrow();

      // Fourth attempt should be blocked by circuit breaker
      await expect(vaultManager.authenticate()).rejects.toThrow('Vault circuit breaker is open');
    });
  });

  describe('Secret Operations', () => {
    beforeEach(() => {
      vaultManager = new VaultSecretsManager({
        address: 'https://vault.example.com:8200',
        authMethod: 'token',
        token: 'test-token'
      });

      vaultManager.authenticated = true;
      vaultManager.token = 'test-token';
    });

    test('should get secret successfully', async () => {
      mock.onGet('/v1/secret/data/myapp/database/password').reply(200, {
        data: {
          data: {
            value: 'super-secret-password'
          }
        }
      });

      const secret = await vaultManager.getSecret('myapp/database/password');
      expect(secret).toBe('super-secret-password');
    });

    test('should return null for non-existent secret', async () => {
      mock.onGet('/v1/secret/data/nonexistent').reply(404);

      const secret = await vaultManager.getSecret('nonexistent');
      expect(secret).toBeNull();
    });

    test('should set secret successfully', async () => {
      mock.onPost('/v1/secret/data/myapp/new-secret').reply(200);

      await expect(
        vaultManager.setSecret('myapp/new-secret', 'new-value')
      ).resolves.toBeUndefined();
    });

    test('should list secrets successfully', async () => {
      mock.onGet('/v1/secret/metadata/myapp/?list=true').reply(200, {
        data: {
          keys: ['database/', 'api-keys/']
        }
      });

      const secrets = await vaultManager.listSecrets('myapp/');
      expect(secrets).toEqual(['database/', 'api-keys/']);
    });

    test('should return empty array for non-existent prefix', async () => {
      mock.onGet('/v1/secret/metadata/nonexistent/').reply(404);

      const secrets = await vaultManager.listSecrets('nonexistent/');
      expect(secrets).toEqual([]);
    });

    test('should renew lease successfully', async () => {
      const leaseId = 'test-lease-id';
      mock.onPut('/v1/sys/leases/renew').reply(200);

      await expect(vaultManager.renewLease(leaseId)).resolves.toBeUndefined();
    });
  });

  describe('Health Check', () => {
    test('should return healthy status when Vault is reachable', async () => {
      vaultManager = new VaultSecretsManager({
        address: 'https://vault.example.com:8200',
        authMethod: 'token',
        token: 'test-token'
      });

      mock.onGet('/v1/sys/health').reply(200, {
        version: '1.12.0'
      });

      const health = await vaultManager.healthCheck();
      expect(health).toEqual({
        healthy: true,
        version: '1.12.0',
        reachable: true
      });
    });

    test('should return unhealthy status when Vault is unreachable', async () => {
      vaultManager = new VaultSecretsManager({
        address: 'https://vault.example.com:8200',
        authMethod: 'token',
        token: 'test-token'
      });

      mock.onGet('/v1/sys/health').networkError();

      const health = await vaultManager.healthCheck();
      expect(health).toEqual({
        healthy: false,
        reachable: false,
        error: expect.any(String)
      });
    });
  });

  describe('Caching', () => {
    beforeEach(() => {
      vaultManager = new VaultSecretsManager({
        address: 'https://vault.example.com:8200',
        authMethod: 'token',
        token: 'test-token',
        cacheTtl: 1000, // 1 second for testing
        cacheMax: 10
      });

      vaultManager.authenticated = true;
      vaultManager.token = 'test-token';
    });

    test('should cache secret values', async () => {
      mock.onGet('/v1/secret/data/test').reply(200, {
        data: { data: { value: 'cached-value' } }
      });

      // First call - should hit Vault
      const value1 = await vaultManager.getSecret('test');
      expect(value1).toBe('cached-value');

      // Second call - should use cache
      mock.resetHistory();
      const value2 = await vaultManager.getSecret('test');
      expect(value2).toBe('cached-value');
      expect(mock.history.get).toHaveLength(0); // No HTTP calls
    });

    test('should clear cache', async () => {
      mock.onGet('/v1/secret/data/test').reply(200, {
        data: { data: { value: 'test-value' } }
      });

      await vaultManager.getSecret('test');
      vaultManager.clearCache();

      // Should hit Vault again after clearing cache
      mock.resetHistory();
      await vaultManager.getSecret('test');
      expect(mock.history.get).toHaveLength(1);
    });
  });
});
