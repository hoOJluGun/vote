/**
 * E2EE Manager Unit Tests
 * Comprehensive test suite for end-to-end encryption
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { E2EEManager, EncryptedPayload } from '../src/services/E2EEManager';
import { VaultSecretsManager } from '../src/services/VaultSecretsManager';

// Mock VaultSecretsManager
vi.mock('../src/services/VaultSecretsManager');

describe('E2EEManager', () => {
  let e2eeManager: E2EEManager;
  let mockVaultManager: VaultSecretsManager;

  const testKEKId = 'test-transit-key';

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Create mock Vault manager
    mockVaultManager = {
      transitEncrypt: vi.fn(),
      transitDecrypt: vi.fn()
    } as any;
    
    e2eeManager = new E2EEManager(mockVaultManager, testKEKId);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Encryption', () => {
    it('should encrypt buffer data', async () => {
      const plaintext = Buffer.from('secret message');
      const wrappedDEK = 'vault:v1:wrapped-dek';
      
      mockVaultManager.transitEncrypt = vi.fn().mockResolvedValue(wrappedDEK);

      const payload = await e2eeManager.clientEncrypt(plaintext);

      expect(payload).toMatchObject({
        v: 1,
        alg: 'aes-256-gcm',
        dek_wrapped: wrappedDEK,
        dek_kid: expect.stringContaining(`${testKEKId}:v`),
        meta: {
          createdBy: 'cel-client',
          timestamp: expect.any(String)
        }
      });

      expect(payload.iv).toBeDefined();
      expect(payload.ct).toBeDefined();
      expect(payload.tag).toBeDefined();

      // Verify base64 encoding
      expect(() => Buffer.from(payload.iv, 'base64')).not.toThrow();
      expect(() => Buffer.from(payload.ct, 'base64')).not.toThrow();
      expect(() => Buffer.from(payload.tag, 'base64')).not.toThrow();

      expect(mockVaultManager.transitEncrypt).toHaveBeenCalledWith(
        testKEKId,
        expect.any(Buffer)
      );
    });

    it('should encrypt object data', async () => {
      const plaintext = { username: 'testuser', password: 'testpass' };
      const wrappedDEK = 'vault:v1:wrapped-dek';
      
      mockVaultManager.transitEncrypt = vi.fn().mockResolvedValue(wrappedDEK);

      const payload = await e2eeManager.clientEncrypt(plaintext);

      expect(payload).toMatchObject({
        v: 1,
        alg: 'aes-256-gcm',
        dek_wrapped: wrappedDEK
      });
    });

    it('should use custom KEK ID', async () => {
      const plaintext = Buffer.from('secret message');
      const customKEKId = 'custom-transit-key';
      const wrappedDEK = 'vault:v1:wrapped-dek';
      
      mockVaultManager.transitEncrypt = vi.fn().mockResolvedValue(wrappedDEK);

      const payload = await e2eeManager.clientEncrypt(plaintext, { kekId: customKEKId });

      expect(mockVaultManager.transitEncrypt).toHaveBeenCalledWith(
        customKEKId,
        expect.any(Buffer)
      );
    });

    it('should include additional authenticated data', async () => {
      const plaintext = Buffer.from('secret message');
      const aad = 'additional-context';
      const wrappedDEK = 'vault:v1:wrapped-dek';
      
      mockVaultManager.transitEncrypt = vi.fn().mockResolvedValue(wrappedDEK);

      const payload = await e2eeManager.clientEncrypt(plaintext, { aad });

      expect(payload.meta.context).toBe(aad);
    });

    it('should handle custom creator', async () => {
      const plaintext = Buffer.from('secret message');
      const createdBy = 'custom-client';
      const wrappedDEK = 'vault:v1:wrapped-dek';
      
      mockVaultManager.transitEncrypt = vi.fn().mockResolvedValue(wrappedDEK);

      const payload = await e2eeManager.clientEncrypt(plaintext, { createdBy });

      expect(payload.meta.createdBy).toBe(createdBy);
    });

    it('should handle Vault encryption failure', async () => {
      const plaintext = Buffer.from('secret message');
      
      mockVaultManager.transitEncrypt = vi.fn().mockRejectedValue(new Error('Vault error'));

      await expect(e2eeManager.clientEncrypt(plaintext)).rejects.toThrow('Encryption failed');
    });
  });

  describe('Decryption', () => {
    const createMockPayload = (overrides: Partial<EncryptedPayload> = {}): EncryptedPayload => ({
      v: 1,
      alg: 'aes-256-gcm',
      iv: Buffer.from('123456789012').toString('base64'),
      ct: Buffer.from('encrypted-data').toString('base64'),
      tag: Buffer.from('1234567890123456').toString('base64'),
      dek_wrapped: 'vault:v1:wrapped-dek',
      dek_kid: `${testKEKId}:v1234567890`,
      meta: {
        createdBy: 'cel-client',
        timestamp: new Date().toISOString()
      },
      ...overrides
    });

    it('should decrypt to buffer data', async () => {
      const plaintext = Buffer.from('secret message');
      const dek = Buffer.from('12345678901234567890123456789012', 'hex');
      const wrappedDEK = 'vault:v1:wrapped-dek';
      
      // First encrypt to get valid payload
      mockVaultManager.transitEncrypt = vi.fn().mockResolvedValue(wrappedDEK);
      const payload = await e2eeManager.clientEncrypt(plaintext);
      
      // Mock decryption
      mockVaultManager.transitDecrypt = vi.fn().mockResolvedValue(dek);
      
      const decrypted = await e2eeManager.clientDecrypt(payload);
      
      expect(decrypted).toEqual(plaintext);
      expect(mockVaultManager.transitDecrypt).toHaveBeenCalledWith(
        testKEKId,
        wrappedDEK
      );
    });

    it('should decrypt to object data', async () => {
      const plaintext = { username: 'testuser', password: 'testpass' };
      const dek = Buffer.from('12345678901234567890123456789012', 'hex');
      const wrappedDEK = 'vault:v1:wrapped-dek';
      
      // First encrypt to get valid payload
      mockVaultManager.transitEncrypt = vi.fn().mockResolvedValue(wrappedDEK);
      const payload = await e2eeManager.clientEncrypt(plaintext);
      
      // Mock decryption
      mockVaultManager.transitDecrypt = vi.fn().mockResolvedValue(dek);
      
      const decrypted = await e2eeManager.clientDecrypt(payload);
      
      expect(decrypted).toEqual(plaintext);
    });

    it('should use custom KEK ID for decryption', async () => {
      const customKEKId = 'custom-transit-key';
      const plaintext = Buffer.from('secret message');
      const dek = Buffer.from('12345678901234567890123456789012', 'hex');
      const wrappedDEK = 'vault:v1:wrapped-dek';
      
      mockVaultManager.transitEncrypt = vi.fn().mockResolvedValue(wrappedDEK);
      const payload = await e2eeManager.clientEncrypt(plaintext);
      
      mockVaultManager.transitDecrypt = vi.fn().mockResolvedValue(dek);
      
      await e2eeManager.clientDecrypt(payload, { kekId: customKEKId });
      
      expect(mockVaultManager.transitDecrypt).toHaveBeenCalledWith(
        customKEKId,
        wrappedDEK
      );
    });

    it('should reject unsupported payload version', async () => {
      const payload = createMockPayload({ v: 2 });
      
      await expect(e2eeManager.clientDecrypt(payload)).rejects.toThrow('Unsupported payload version');
    });

    it('should reject invalid DEK key ID format', async () => {
      const payload = createMockPayload({ dek_kid: 'invalid-format' });
      
      await expect(e2eeManager.clientDecrypt(payload)).rejects.toThrow('Invalid DEK key ID format');
    });

    it('should handle Vault decryption failure', async () => {
      const plaintext = Buffer.from('secret message');
      const wrappedDEK = 'vault:v1:wrapped-dek';
      
      mockVaultManager.transitEncrypt = vi.fn().mockResolvedValue(wrappedDEK);
      const payload = await e2eeManager.clientEncrypt(plaintext);
      
      mockVaultManager.transitDecrypt = vi.fn().mockRejectedValue(new Error('Vault error'));
      
      await expect(e2eeManager.clientDecrypt(payload)).rejects.toThrow('Decryption failed');
    });

    it('should handle server-side unwrapping fallback', async () => {
      const plaintext = Buffer.from('secret message');
      const wrappedDEK = 'vault:v1:wrapped-dek';
      
      mockVaultManager.transitEncrypt = vi.fn().mockResolvedValue(wrappedDEK);
      const payload = await e2eeManager.clientEncrypt(plaintext);
      
      await expect(
        e2eeManager.clientDecrypt(payload, { unwrapVia: 'server' })
      ).rejects.toThrow('Server-side unwrapping not implemented');
    });
  });

  describe('Round-trip Encryption/Decryption', () => {
    it('should successfully encrypt and decrypt buffer', async () => {
      const original = Buffer.from('This is a secret message that should be encrypted and then decrypted back to original');
      const dek = Buffer.from('12345678901234567890123456789012', 'hex');
      const wrappedDEK = 'vault:v1:wrapped-dek';
      
      mockVaultManager.transitEncrypt = vi.fn().mockResolvedValue(wrappedDEK);
      mockVaultManager.transitDecrypt = vi.fn().mockResolvedValue(dek);
      
      const encrypted = await e2eeManager.clientEncrypt(original);
      const decrypted = await e2eeManager.clientDecrypt(encrypted);
      
      expect(decrypted).toEqual(original);
    });

    it('should successfully encrypt and decrypt object', async () => {
      const original = {
        userId: 12345,
        username: 'testuser',
        permissions: ['read', 'write'],
        metadata: {
          lastLogin: new Date().toISOString(),
          preferences: { theme: 'dark' }
        }
      };
      const dek = Buffer.from('12345678901234567890123456789012', 'hex');
      const wrappedDEK = 'vault:v1:wrapped-dek';
      
      mockVaultManager.transitEncrypt = vi.fn().mockResolvedValue(wrappedDEK);
      mockVaultManager.transitDecrypt = vi.fn().mockResolvedValue(dek);
      
      const encrypted = await e2eeManager.clientEncrypt(original);
      const decrypted = await e2eeManager.clientDecrypt(encrypted);
      
      expect(decrypted).toEqual(original);
    });
  });

  describe('Payload Validation', () => {
    it('should validate correct payload', () => {
      const payload = {
        v: 1,
        alg: 'aes-256-gcm',
        iv: Buffer.from('123456789012').toString('base64'),
        ct: Buffer.from('encrypted').toString('base64'),
        tag: Buffer.from('1234567890123456').toString('base64'),
        dek_wrapped: 'vault:v1:wrapped',
        dek_kid: 'test-key:v123',
        meta: {
          createdBy: 'test',
          timestamp: new Date().toISOString()
        }
      };

      expect(e2eeManager.validatePayload(payload as EncryptedPayload)).toBe(true);
    });

    it('should reject payload with missing fields', () => {
      const invalidPayload = {
        v: 1,
        alg: 'aes-256-gcm'
        // Missing required fields
      };

      expect(e2eeManager.validatePayload(invalidPayload as EncryptedPayload)).toBe(false);
    });

    it('should reject payload with unsupported version', () => {
      const payload = {
        v: 2,
        alg: 'aes-256-gcm',
        iv: Buffer.from('123456789012').toString('base64'),
        ct: Buffer.from('encrypted').toString('base64'),
        tag: Buffer.from('1234567890123456').toString('base64'),
        dek_wrapped: 'vault:v1:wrapped',
        dek_kid: 'test-key:v123',
        meta: {
          createdBy: 'test',
          timestamp: new Date().toISOString()
        }
      };

      expect(e2eeManager.validatePayload(payload as EncryptedPayload)).toBe(false);
    });

    it('should reject payload with invalid algorithm', () => {
      const payload = {
        v: 1,
        alg: 'invalid-algorithm',
        iv: Buffer.from('123456789012').toString('base64'),
        ct: Buffer.from('encrypted').toString('base64'),
        tag: Buffer.from('1234567890123456').toString('base64'),
        dek_wrapped: 'vault:v1:wrapped',
        dek_kid: 'test-key:v123',
        meta: {
          createdBy: 'test',
          timestamp: new Date().toISOString()
        }
      };

      expect(e2eeManager.validatePayload(payload as EncryptedPayload)).toBe(false);
    });

    it('should reject payload with invalid base64', () => {
      const payload = {
        v: 1,
        alg: 'aes-256-gcm',
        iv: 'invalid-base64',
        ct: Buffer.from('encrypted').toString('base64'),
        tag: Buffer.from('1234567890123456').toString('base64'),
        dek_wrapped: 'vault:v1:wrapped',
        dek_kid: 'test-key:v123',
        meta: {
          createdBy: 'test',
          timestamp: new Date().toISOString()
        }
      };

      expect(e2eeManager.validatePayload(payload as EncryptedPayload)).toBe(false);
    });

    it('should reject payload with incomplete metadata', () => {
      const payload = {
        v: 1,
        alg: 'aes-256-gcm',
        iv: Buffer.from('123456789012').toString('base64'),
        ct: Buffer.from('encrypted').toString('base64'),
        tag: Buffer.from('1234567890123456').toString('base64'),
        dek_wrapped: 'vault:v1:wrapped',
        dek_kid: 'test-key:v123',
        meta: {
          createdBy: 'test'
          // Missing timestamp
        }
      };

      expect(e2eeManager.validatePayload(payload as EncryptedPayload)).toBe(false);
    });
  });

  describe('Key Rotation', () => {
    it('should rotate KEK successfully', async () => {
      const oldKEKId = 'old-transit-key';
      const newKEKId = 'new-transit-key';
      
      // Mock findPayloadsByKey to return empty array for simplicity
      vi.spyOn(e2eeManager as any, 'findPayloadsByKey').mockResolvedValue([]);
      
      const result = await e2eeManager.rotateKEK(oldKEKId, newKEKId);
      
      expect(result).toEqual({
        rewrappedCount: 0,
        failedCount: 0,
        errors: []
      });
    });

    it('should handle rotation failures', async () => {
      const oldKEKId = 'old-transit-key';
      const newKEKId = 'new-transit-key';
      
      // Mock findPayloadsByKey to return a payload that will fail
      vi.spyOn(e2eeManager as any, 'findPayloadsByKey').mockResolvedValue([
        { id: 'test-payload', payload: {} as EncryptedPayload }
      ]);
      
      const result = await e2eeManager.rotateKEK(oldKEKId, newKEKId);
      
      expect(result.failedCount).toBe(1);
      expect(result.errors).toHaveLength(1);
    });
  });

  describe('Batch Operations', () => {
    it('should batch decrypt multiple payloads', async () => {
      const plaintext1 = Buffer.from('message 1');
      const plaintext2 = Buffer.from('message 2');
      const dek = Buffer.from('12345678901234567890123456789012', 'hex');
      const wrappedDEK = 'vault:v1:wrapped-dek';
      
      mockVaultManager.transitEncrypt = vi.fn().mockResolvedValue(wrappedDEK);
      mockVaultManager.transitDecrypt = vi.fn().mockResolvedValue(dek);
      
      const payload1 = await e2eeManager.clientEncrypt(plaintext1);
      const payload2 = await e2eeManager.clientEncrypt(plaintext2);
      
      const payloads = [
        { id: 'payload1', payload: payload1 },
        { id: 'payload2', payload: payload2 }
      ];
      
      const results = await e2eeManager.batchDecrypt(payloads);
      
      expect(results).toHaveLength(2);
      expect(results[0].data).toEqual(plaintext1);
      expect(results[1].data).toEqual(plaintext2);
    });

    it('should handle batch decryption failures', async () => {
      const plaintext = Buffer.from('message');
      const wrappedDEK = 'vault:v1:wrapped-dek';
      
      mockVaultManager.transitEncrypt = vi.fn().mockResolvedValue(wrappedDEK);
      mockVaultManager.transitDecrypt = vi.fn().mockRejectedValue(new Error('Decryption failed'));
      
      const payload = await e2eeManager.clientEncrypt(plaintext);
      
      const payloads = [
        { id: 'payload1', payload },
        { id: 'payload2', payload }
      ];
      
      const results = await e2eeManager.batchDecrypt(payloads);
      
      expect(results).toHaveLength(2);
      expect(results[0].error).toBeDefined();
      expect(results[1].error).toBeDefined();
    });
  });

  describe('Static Test Methods', () => {
    it('should generate test key', () => {
      const key = E2EEManager.generateTestKey();
      
      expect(key).toBeInstanceOf(Buffer);
      expect(key.length).toBe(32);
    });

    it('should encrypt with test key', () => {
      const plaintext = Buffer.from('test message');
      const key = E2EEManager.generateTestKey();
      
      const payload = E2EEManager.encryptWithTestKey(plaintext, key);
      
      expect(payload.v).toBe(1);
      expect(payload.alg).toBe('aes-256-gcm');
      expect(payload.dek_kid).toBe('test-key');
    });

    it('should decrypt with test key', () => {
      const plaintext = { test: 'data' };
      const key = E2EEManager.generateTestKey();
      
      const payload = E2EEManager.encryptWithTestKey(plaintext, key);
      const decrypted = E2EEManager.decryptWithTestKey(payload, key);
      
      expect(decrypted).toEqual(plaintext);
    });

    it('should handle test encryption with AAD', () => {
      const plaintext = Buffer.from('test message');
      const key = E2EEManager.generateTestKey();
      const aad = 'additional-data';
      
      const payload = E2EEManager.encryptWithTestKey(plaintext, key, aad);
      
      expect(payload).toBeDefined();
      expect(payload.v).toBe(1);
    });
  });

  describe('Statistics and Monitoring', () => {
    it('should provide encryption statistics', async () => {
      const stats = await e2eeManager.getEncryptionStats();
      
      expect(stats).toHaveProperty('totalEncrypted');
      expect(stats).toHaveProperty('keyDistribution');
      expect(stats).toHaveProperty('averagePayloadSize');
      expect(typeof stats.totalEncrypted).toBe('number');
    });

    it('should perform integrity check', async () => {
      const result = await e2eeManager.integrityCheck('test-payload-id');
      
      expect(result).toHaveProperty('valid');
      expect(result).toHaveProperty('errors');
      expect(Array.isArray(result.errors)).toBe(true);
    });
  });
});
