/**
 * Client Encryption Unit Tests
 * Tests envelope encryption with AES-256-GCM and tamper detection
 */

import { ClientEncryption } from '../../security/client-encryption.js';

describe('ClientEncryption', () => {
  let clientEncryption;

  beforeEach(() => {
    clientEncryption = new ClientEncryption();
  });

  afterEach(() => {
    clientEncryption.clearCache();
  });

  describe('Encryption/Decryption Roundtrip', () => {
    test('should encrypt and decrypt string data', async () => {
      const plaintext = 'Hello, secure world!';
      const encrypted = await clientEncryption.encrypt(plaintext);
      const decrypted = await clientEncryption.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    test('should encrypt and decrypt JSON object', async () => {
      const data = {
        user: 'alice',
        message: 'Secret message',
        timestamp: Date.now()
      };

      const encrypted = await clientEncryption.encrypt(data);
      const decrypted = await clientEncryption.decrypt(encrypted);

      expect(decrypted).toEqual(data);
    });

    test('should encrypt and decrypt with AAD', async () => {
      const plaintext = 'Authenticated data';
      const aad = 'session-123';

      const encrypted = await clientEncryption.encrypt(plaintext, { aad });
      const decrypted = await clientEncryption.decrypt(encrypted, { aad });

      expect(decrypted).toBe(plaintext);
    });

    test('should include metadata', async () => {
      const data = 'test data';
      const meta = { userId: 'user-456', context: 'test' };

      const encrypted = await clientEncryption.encrypt(data, { meta });
      
      expect(encrypted.meta.userId).toBe('user-456');
      expect(encrypted.meta.context).toBe('test');
      expect(encrypted.meta.createdAt).toBeDefined();
    });
  });

  describe('Tamper Detection', () => {
    test('should detect tampered ciphertext', async () => {
      const plaintext = 'Original message';
      const encrypted = await clientEncryption.encrypt(plaintext);

      // Tamper with ciphertext
      const tampered = { ...encrypted };
      const ctBuffer = Buffer.from(tampered.ct, 'base64');
      ctBuffer[0] ^= 0xFF; // Flip a bit
      tampered.ct = ctBuffer.toString('base64');

      await expect(clientEncryption.decrypt(tampered))
        .rejects.toThrow('Authentication failed');
    });

    test('should detect tampered authentication tag', async () => {
      const plaintext = 'Original message';
      const encrypted = await clientEncryption.encrypt(plaintext);

      // Tamper with auth tag
      const tampered = { ...encrypted };
      const tagBuffer = Buffer.from(tampered.tag, 'base64');
      tagBuffer[0] ^= 0xFF;
      tampered.tag = tagBuffer.toString('base64');

      await expect(clientEncryption.decrypt(tampered))
        .rejects.toThrow('Authentication failed');
    });

    test('should detect tampered IV', async () => {
      const plaintext = 'Original message';
      const encrypted = await clientEncryption.encrypt(plaintext);

      // Tamper with IV
      const tampered = { ...encrypted };
      const ivBuffer = Buffer.from(tampered.iv, 'base64');
      ivBuffer[0] ^= 0xFF;
      tampered.iv = ivBuffer.toString('base64');

      await expect(clientEncryption.decrypt(tampered))
        .rejects.toThrow('Authentication failed');
    });
  });

  describe('Payload Validation', () => {
    test('should reject payload with missing fields', async () => {
      const invalidPayload = {
        v: 1,
        alg: 'AES-256-GCM',
        ct: 'some-data',
        // Missing iv, tag, dek_wrapped, dek_kid
      };

      await expect(clientEncryption.decrypt(invalidPayload))
        .rejects.toThrow('Invalid payload: missing field');
    });

    test('should reject unsupported version', async () => {
      const payload = {
        v: 2, // Unsupported version
        alg: 'AES-256-GCM',
        iv: 'dummy',
        ct: 'dummy',
        tag: 'dummy',
        dek_wrapped: 'dummy',
        dek_kid: 'dummy'
      };

      await expect(clientEncryption.decrypt(payload))
        .rejects.toThrow('Unsupported payload version');
    });

    test('should reject unsupported algorithm', async () => {
      const payload = {
        v: 1,
        alg: 'AES-128-GCM', // Unsupported
        iv: 'dummy',
        ct: 'dummy',
        tag: 'dummy',
        dek_wrapped: 'dummy',
        dek_kid: 'dummy'
      };

      await expect(clientEncryption.decrypt(payload))
        .rejects.toThrow('Unsupported algorithm');
    });
  });

  describe('Key Rotation', () => {
    test('should rotate KEK for multiple payloads', async () => {
      // Encrypt two payloads with old KEK
      const payload1 = await clientEncryption.encrypt('data1');
      const payload2 = await clientEncryption.encrypt('data2');

      // Both should use default KEK
      expect(payload1.dek_kid).toBe('default');
      expect(payload2.dek_kid).toBe('default');

      // Rotate KEK
      const rotated = await clientEncryption.rotateKEK('default', 'new-key', [payload1, payload2]);

      // Check results
      expect(rotated[0].dek_kid).toBe('new-key');
      expect(rotated[1].dek_kid).toBe('new-key');
      expect(rotated[0].meta.rotatedAt).toBeDefined();
      expect(rotated[0].meta.rotatedFrom).toBe('default');
    });

    test('should preserve payloads with different KEK', async () => {
      const payload1 = await clientEncryption.encrypt('data1'); // default KEK
      const payload2 = await clientEncryption.encrypt('data2', { kekId: 'other-key' });

      const rotated = await clientEncryption.rotateKEK('default', 'new-key', [payload1, payload2]);

      // payload1 should be rotated
      expect(rotated[0].dek_kid).toBe('new-key');
      // payload2 should remain unchanged
      expect(rotated[1].dek_kid).toBe('other-key');
    });
  });

  describe('Performance', () => {
    test('should handle large data efficiently', async () => {
      const largeData = 'A'.repeat(100000); // 100KB string
      
      const start = Date.now();
      const encrypted = await clientEncryption.encrypt(largeData);
      const decryptTime = Date.now() - start;

      const decrypted = await clientEncryption.decrypt(encrypted);

      expect(decrypted).toBe(largeData);
      expect(decryptTime).toBeLessThan(1000); // Should complete in < 1 second
    });
  });
});
