/**
 * Unit tests for KEK Manager and Vault Transit integration
 */

import { KEKManager } from '../../security/kek-manager.js';
import { VaultSecretsManager } from '../../security/vault-manager.js';

// Mock VaultSecretsManager
jest.mock('../../security/vault-manager.js');

describe('KEKManager - Vault Transit Integration', () => {
  let kekManager;
  let mockVault;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create mock Vault instance with Transit methods
    mockVault = {
      authenticate: jest.fn().mockResolvedValue(),
      transitCreateKey: jest.fn().mockResolvedValue(),
      transitListKeys: jest.fn().mockResolvedValue(['existing-key']),
      transitGenerateDataKey: jest.fn(),
      transitEncrypt: jest.fn().mockResolvedValue('vault-encrypted-data'),
      transitDecrypt: jest.fn(),
      transitRotateKey: jest.fn().mockResolvedValue(),
      transitReadKey: jest.fn(),
      transitRewrap: jest.fn().mockResolvedValue({ data: { rewrap_results: [{ ciphertext: 'rewrapped-data' }] } })
    };

    VaultSecretsManager.mockImplementation(() => mockVault);
  });

  describe('Initialization', () => {
    test('should initialize with existing KEK', async () => {
      mockVault.transitListKeys.mockResolvedValue(['cel-kek']);
      mockVault.transitReadKey.mockResolvedValue({
        type: 'aes256-gcm96',
        latest_version: 1,
        min_encryption_version: 1,
        keys: { '1': { creation_time: '2024-01-01T00:00:00Z' } }
      });

      const vaultManager = new VaultSecretsManager({ address: 'https://vault.test' });
      kekManager = new KEKManager({ vaultManager });
      
      await kekManager.initialize();

      expect(mockVault.transitListKeys).toHaveBeenCalled();
      expect(mockVault.transitCreateKey).not.toHaveBeenCalled();
      // Note: transitReadKey is called internally but not directly testable here
    });

    test('should create new KEK when it doesnt exist', async () => {
      mockVault.transitListKeys.mockResolvedValue([]);
      
      const vaultManager = new VaultSecretsManager({ address: 'https://vault.test' });
      kekManager = new KEKManager({ 
        vaultManager,
        keyName: 'test-kek',
        keyType: 'chacha20-poly1305'
      });
      
      await kekManager.initialize();

      expect(mockVault.transitCreateKey).toHaveBeenCalledWith('test-kek', {
        type: 'chacha20-poly1305',
        exportable: false,
        allowPlaintextBackup: false,
        autoRotatePeriod: 0
      });
    });

    test('should throw error when vault manager not provided', () => {
      expect(() => new KEKManager({}))
        .toThrow('VaultSecretsManager instance required');
    });
  });

  describe('DEK Generation and Management', () => {
    beforeEach(async () => {
      mockVault.transitListKeys.mockResolvedValue(['cel-kek']);
      const vaultManager = new VaultSecretsManager({ address: 'https://vault.test' });
      kekManager = new KEKManager({ vaultManager });
      await kekManager.initialize();
    });

    test('should generate wrapped DEK', async () => {
      mockVault.transitGenerateDataKey
        .mockResolvedValueOnce({ ciphertext: 'wrapped-key-123' })
        .mockResolvedValueOnce({ plaintext: 'plaintext-key-hex' });

      const result = await kekManager.generateWrappedDEK('database-encryption', 256);

      expect(result).toHaveProperty('dek', 'plaintext-key-hex');
      expect(result).toHaveProperty('wrappedKey', 'wrapped-key-123');
      expect(result).toHaveProperty('keyId');
      expect(result.purpose).toBe('database-encryption');
      expect(mockVault.transitGenerateDataKey).toHaveBeenCalledTimes(2);
    });

    test('should unwrap DEK successfully', async () => {
      mockVault.transitDecrypt.mockResolvedValue('unwrapped-dek-hex');

      const result = await kekManager.unwrapDEK('wrapped-key-123', 'test-purpose');

      expect(result).toBe('unwrapped-dek-hex');
      expect(mockVault.transitDecrypt).toHaveBeenCalledWith(
        'cel-kek',
        'wrapped-key-123',
        { context: 'cel-context:test-purpose' }
      );
    });
  });

  describe('Envelope Encryption', () => {
    beforeEach(async () => {
      mockVault.transitListKeys.mockResolvedValue(['cel-kek']);
      mockVault.transitGenerateDataKey
        .mockResolvedValueOnce({ ciphertext: 'wrapped-key-123' })
        .mockResolvedValueOnce({ plaintext: 'plaintext-key-hex' });
      
      const vaultManager = new VaultSecretsManager({ address: 'https://vault.test' });
      kekManager = new KEKManager({ vaultManager });
      await kekManager.initialize();
    });

    test('should encrypt data with envelope encryption', async () => {
      mockVault.transitGenerateDataKey
        .mockResolvedValueOnce({ ciphertext: 'wrapped-key-123' })
        .mockResolvedValueOnce({ plaintext: 'plaintext-key-hex' });
      
      const testData = 'sensitive data to encrypt';
      
      const result = await kekManager.encryptWithEnvelope(testData, 'user-data');

      expect(result).toHaveProperty('encryptedData', 'vault-encrypted-data');
      expect(result).toHaveProperty('wrappedKey', 'wrapped-key-123');
      expect(result).toHaveProperty('keyId');
      expect(mockVault.transitEncrypt).toHaveBeenCalled();
    });

    test('should decrypt data with envelope encryption', async () => {
      mockVault.transitDecrypt
        .mockResolvedValueOnce('unwrapped-dek-hex') // First call for unwrapping
        .mockResolvedValueOnce('sensitive data to encrypt'); // Second call for data decryption
      
      const result = await kekManager.decryptWithEnvelope(
        'encrypted-data-123',
        'wrapped-key-123',
        'key-id-456',
        'user-data'
      );

      expect(result).toBe('sensitive data to encrypt');
      expect(mockVault.transitDecrypt).toHaveBeenCalledTimes(2);
    });
  });

  describe('Key Rotation', () => {
    beforeEach(async () => {
      mockVault.transitListKeys.mockResolvedValue(['cel-kek']);
      mockVault.transitReadKey.mockResolvedValue({
        type: 'aes256-gcm96',
        latest_version: 1,
        min_encryption_version: 1,
        keys: { '1': {} }
      });
      
      const vaultManager = new VaultSecretsManager({ address: 'https://vault.test' });
      kekManager = new KEKManager({ vaultManager });
      await kekManager.initialize();
    });

    test('should rotate KEK successfully', async () => {
      await kekManager.rotateKEK();

      expect(mockVault.transitRotateKey).toHaveBeenCalledWith('cel-kek');
    });

    test('should rewrap encrypted data', async () => {
      const encryptedItems = [
        { ciphertext: 'enc-1', keyId: 'key-1', purpose: 'test' },
        { ciphertext: 'enc-2', keyId: 'key-2', purpose: 'test' }
      ];

      mockVault.transitRewrap.mockImplementation((keyName, ciphertexts) => {
        return Promise.resolve({
          data: {
            rewrap_results: ciphertexts.map(ct => ({ ciphertext: `rewrapped-${ct}` }))
          }
        });
      });

      const result = await kekManager.rewrapEncryptedData(encryptedItems);

      expect(result).toHaveLength(2);
      // Check that the first item was rewrapped (has rewrappedAt property)
      expect(result[0]).toHaveProperty('rewrappedAt');
      expect(mockVault.transitRewrap).toHaveBeenCalledWith('cel-kek', ['enc-1']);
    });

    test('should handle rewrap failure gracefully', async () => {
      mockVault.transitRewrap.mockRejectedValueOnce(new Error('Rewrap failed'));
      
      const encryptedItems = [
        { ciphertext: 'enc-1', keyId: 'key-1', purpose: 'test' }
      ];

      const result = await kekManager.rewrapEncryptedData(encryptedItems);

      // Should return original item when rewrap fails
      expect(result[0].ciphertext).toBe('enc-1');
    });
  });

  describe('Key Status and Metadata', () => {
    beforeEach(async () => {
      mockVault.transitListKeys.mockResolvedValue(['cel-kek']);
      const vaultManager = new VaultSecretsManager({ address: 'https://vault.test' });
      kekManager = new KEKManager({ vaultManager });
      await kekManager.initialize();
    });

    test('should get key status', async () => {
      mockVault.transitReadKey.mockResolvedValue({
        type: 'aes256-gcm96',
        min_decryption_version: 1,
        min_encryption_version: 1,
        latest_version: 3,
        deletion_allowed: false,
        exportable: false,
        auto_rotate_period: 0,
        keys: { '1': {}, '2': {}, '3': {} }
      });

      const status = await kekManager.getKeyStatus();

      expect(status).toEqual({
        keyName: 'cel-kek',
        keyType: 'aes256-gcm96',
        minDecryptionVersion: 1,
        minEncryptionVersion: 1,
        latestVersion: 3,
        deletionAllowed: false,
        exportable: false,
        autoRotatePeriod: 0,
        keys: 3
      });
    });

    test('should list key versions', async () => {
      mockVault.transitReadKey.mockResolvedValue({
        keys: {
          '1': { creation_time: '2024-01-01T00:00:00Z' },
          '2': { creation_time: '2024-01-02T00:00:00Z', compromised: true }
        }
      });

      const versions = await kekManager.listKeyVersions();

      expect(versions).toHaveLength(2);
      expect(versions[0]).toEqual({
        version: 1,
        creationTime: '2024-01-01T00:00:00Z',
        compromised: false
      });
      expect(versions[1]).toEqual({
        version: 2,
        creationTime: '2024-01-02T00:00:00Z',
        compromised: true
      });
    });
  });

  describe('Cache Management', () => {
    beforeEach(async () => {
      mockVault.transitListKeys.mockResolvedValue(['cel-kek']);
      const vaultManager = new VaultSecretsManager({ address: 'https://vault.test' });
      kekManager = new KEKManager({ vaultManager });
      await kekManager.initialize();
    });

    test('should clear cache', () => {
      // Simulate cache population
      kekManager.cache.set('test-key', 'test-value');
      
      kekManager.clearCache();
      
      expect(kekManager.cache.size).toBe(0);
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      const vaultManager = new VaultSecretsManager({ address: 'https://vault.test' });
      kekManager = new KEKManager({ vaultManager });
    });

    test('should handle initialization failure', async () => {
      mockVault.transitListKeys.mockRejectedValue(new Error('Vault unavailable'));

      await expect(kekManager.initialize())
        .rejects.toThrow('Vault unavailable');
    });

    test('should handle DEK generation failure', async () => {
      mockVault.transitListKeys.mockResolvedValue(['cel-kek']);
      await kekManager.initialize();
      
      mockVault.transitGenerateDataKey.mockRejectedValue(new Error('Key generation failed'));

      await expect(kekManager.generateWrappedDEK('test'))
        .rejects.toThrow('Key generation failed');
    });

    test('should handle encryption failure', async () => {
      mockVault.transitListKeys.mockResolvedValue(['cel-kek']);
      await kekManager.initialize();
      
      // Make transitGenerateDataKey fail to trigger the error
      mockVault.transitGenerateDataKey.mockRejectedValue(new Error('Key generation failed'));

      await expect(kekManager.encryptWithEnvelope('data', 'purpose'))
        .rejects.toThrow('Key generation failed');
    });
  });
});