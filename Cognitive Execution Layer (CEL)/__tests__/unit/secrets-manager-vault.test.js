/**
 * Unit tests for SecretsManager Vault integration
 */

import { SecretsManager } from '../../security/security-framework.js';
import { VaultSecretsManager } from '../../security/vault-manager.js';

// Mock VaultSecretsManager
jest.mock('../../security/vault-manager.js');

describe('SecretsManager - Vault Backend', () => {
  let secretsManager;
  let mockVault;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Clear environment variables that might affect tests
    delete process.env.VAULT_ADDR;
    delete process.env.VAULT_AUTH_METHOD;
    delete process.env.VAULT_TOKEN;
    delete process.env.VAULT_ROLE_ID;
    delete process.env.VAULT_SECRET_ID;
    delete process.env.VAULT_MOUNT_PATH;
    delete process.env.VAULT_NAMESPACE;
    delete process.env.OPENROUTER_API_KEY;
    
    // Create mock Vault instance
    mockVault = {
      authenticate: jest.fn().mockResolvedValue(),
      getSecret: jest.fn(),
      setSecret: jest.fn(),
      healthCheck: jest.fn().mockResolvedValue({ healthy: true }),
      clearCache: jest.fn()
    };

    // Mock the VaultSecretsManager constructor
    VaultSecretsManager.mockImplementation(() => mockVault);
  });

  describe('Initialization', () => {
    test('should initialize with Vault backend using environment variables', async () => {
      process.env.VAULT_ADDR = 'https://vault.example.com:8200';
      process.env.VAULT_AUTH_METHOD = 'token';
      process.env.VAULT_TOKEN = 'test-token-123';

      secretsManager = new SecretsManager({ backend: 'vault' });
      await secretsManager.initialize();

      expect(VaultSecretsManager).toHaveBeenCalledWith({
        address: 'https://vault.example.com:8200',
        authMethod: 'token',
        token: 'test-token-123',
        mountPath: 'secret',
        namespace: undefined
      });
      expect(mockVault.authenticate).toHaveBeenCalled();
    });

    test('should initialize with Vault backend using constructor options', async () => {
      secretsManager = new SecretsManager({
        backend: 'vault',
        vaultAddress: 'https://vault.local:8200',
        vaultAuthMethod: 'approle',
        vaultRoleId: 'test-role-id',
        vaultSecretId: 'test-secret-id',
        vaultMountPath: 'kv'
      });

      await secretsManager.initialize();

      expect(VaultSecretsManager).toHaveBeenCalledWith({
        address: 'https://vault.local:8200',
        authMethod: 'approle',
        roleId: 'test-role-id',
        secretId: 'test-secret-id',
        mountPath: 'kv',
        namespace: undefined
      });
      expect(mockVault.authenticate).toHaveBeenCalled();
    });

    test('should fall back to environment variables when options not provided', async () => {
      process.env.VAULT_ADDR = 'https://vault.env:8200';
      process.env.VAULT_TOKEN = 'env-token';

      secretsManager = new SecretsManager({
        backend: 'vault',
        vaultMountPath: 'custom-mount'
      });

      await secretsManager.initialize();

      expect(VaultSecretsManager).toHaveBeenCalledWith({
        address: 'https://vault.env:8200',
        authMethod: 'token',
        token: 'env-token',
        mountPath: 'custom-mount',
        namespace: undefined
      });
    });
  });

  describe('API Key Management', () => {
    beforeEach(async () => {
      secretsManager = new SecretsManager({ backend: 'vault' });
      await secretsManager.initialize();
    });

    test('should get API key from Vault', async () => {
      mockVault.getSecret.mockResolvedValue('vault-api-key-123');

      const key = await secretsManager.getApiKey('openrouter');

      expect(mockVault.getSecret).toHaveBeenCalledWith('cel/openrouter/api_key');
      expect(key).toBe('vault-api-key-123');
    });

    test('should fallback to environment variable when Vault returns null', async () => {
      mockVault.getSecret.mockResolvedValue(null);
      process.env.OPENROUTER_API_KEY = 'env-api-key-456';

      const key = await secretsManager.getApiKey('openrouter');

      expect(mockVault.getSecret).toHaveBeenCalledWith('cel/openrouter/api_key');
      expect(key).toBe('env-api-key-456');
      // Should show warning in console
    });

    test('should cache API keys to avoid repeated Vault calls', async () => {
      mockVault.getSecret.mockResolvedValue('cached-key');

      // First call
      await secretsManager.getApiKey('provider1');
      // Second call - should use cache
      await secretsManager.getApiKey('provider1');

      expect(mockVault.getSecret).toHaveBeenCalledTimes(1);
      expect(mockVault.getSecret).toHaveBeenCalledWith('cel/provider1/api_key');
    });

    test('should set API key in Vault', async () => {
      await secretsManager.setApiKey('anthropic', 'new-api-key');

      expect(mockVault.setSecret).toHaveBeenCalledWith('cel/anthropic/api_key', 'new-api-key');
    });

    test('should throw error when setting key with env backend', async () => {
      const envManager = new SecretsManager({ backend: 'env' });
      await envManager.initialize();

      await expect(envManager.setApiKey('test', 'key'))
        .rejects.toThrow('Cannot set environment variables at runtime');
    });
  });

  describe('Arbitrary Secret Management', () => {
    beforeEach(async () => {
      secretsManager = new SecretsManager({ backend: 'vault' });
      await secretsManager.initialize();
    });

    test('should get arbitrary secret from Vault', async () => {
      mockVault.getSecret.mockResolvedValue('secret-value');

      const secret = await secretsManager.getSecret('database/credentials');

      expect(mockVault.getSecret).toHaveBeenCalledWith('database/credentials');
      expect(secret).toBe('secret-value');
    });

    test('should set arbitrary secret in Vault', async () => {
      await secretsManager.setSecret('database/password', 'super-secret-password');

      expect(mockVault.setSecret).toHaveBeenCalledWith('database/password', 'super-secret-password');
    });

    test('should throw error for getSecret with non-Vault backend', async () => {
      const keychainManager = new SecretsManager({ backend: 'keychain' });
      await keychainManager.initialize();

      await expect(keychainManager.getSecret('any/path'))
        .rejects.toThrow('getSecret is only available with Vault backend');
    });

    test('should throw error for setSecret with non-Vault backend', async () => {
      const envManager = new SecretsManager({ backend: 'env' });
      await envManager.initialize();

      await expect(envManager.setSecret('any/path', 'value'))
        .rejects.toThrow('setSecret is only available with Vault backend');
    });
  });

  describe('Health Check', () => {
    test('should return Vault health status', async () => {
      mockVault.healthCheck.mockResolvedValue({
        healthy: true,
        version: '1.15.0',
        reachable: true
      });

      secretsManager = new SecretsManager({ backend: 'vault' });
      await secretsManager.initialize();

      const health = await secretsManager.healthCheck();

      expect(health).toEqual({
        healthy: true,
        version: '1.15.0',
        reachable: true
      });
    });

    test('should return keychain health status', async () => {
      const keychainManager = new SecretsManager({ backend: 'keychain' });
      await keychainManager.initialize();

      const health = await keychainManager.healthCheck();

      expect(health).toEqual({
        healthy: true,
        backend: 'keychain'
      });
    });

    test('should return environment health status', async () => {
      const envManager = new SecretsManager({ backend: 'env' });
      await envManager.initialize();

      const health = await envManager.healthCheck();

      expect(health).toEqual({
        healthy: true,
        backend: 'environment',
        note: 'Using environment variables'
      });
    });
  });

  describe('Cache Management', () => {
    beforeEach(async () => {
      secretsManager = new SecretsManager({ backend: 'vault' });
      await secretsManager.initialize();
    });

    test('should clear both local and Vault cache', async () => {
      mockVault.getSecret.mockResolvedValue('test-key');
      
      // Populate cache
      await secretsManager.getApiKey('test-provider');
      
      // Clear cache
      secretsManager.clearCache();

      // Should clear Vault cache too
      expect(mockVault.clearCache).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    test('should handle Vault authentication failure gracefully', async () => {
      mockVault.authenticate.mockRejectedValue(new Error('Authentication failed'));

      secretsManager = new SecretsManager({ backend: 'vault' });

      await expect(secretsManager.initialize())
        .rejects.toThrow('Authentication failed');
    });

    test('should handle Vault API errors', async () => {
      mockVault.getSecret.mockRejectedValue(new Error('Vault API error'));

      secretsManager = new SecretsManager({ backend: 'vault' });
      await secretsManager.initialize();

      await expect(secretsManager.getApiKey('provider'))
        .rejects.toThrow('Vault API error');
    });
  });
});