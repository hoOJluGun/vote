/**
 * Security Framework Unit Tests
 * Tests for AES-256-GCM encryption, decryption, and security functions
 */

import {
  secureEncrypt,
  secureDecrypt,
  deriveKey,
  generateKey,
  generateSalt,
  generateSecureToken,
  verifySecureToken,
  hashPassword,
  verifyPassword,
  generateRandomString,
  createHmac,
  verifyHmac,
  SecurityFramework,
  SecretsManager
} from '../../security/security-framework.js';

describe('Security Framework', () => {
  let testKey;

  beforeAll(async () => {
    testKey = await generateKey();
  });

  describe('secureEncrypt / secureDecrypt', () => {
    test('should encrypt and decrypt string data', () => {
      const plaintext = 'Hello, World!';
      const encrypted = secureEncrypt(plaintext, testKey);
      const decrypted = secureDecrypt(encrypted, testKey);

      expect(decrypted).toBe(plaintext);
    });

    test('should encrypt and decrypt JSON object', () => {
      const data = { name: 'test', value: 123, nested: { a: true } };
      const encrypted = secureEncrypt(data, testKey);
      const decrypted = secureDecrypt(encrypted, testKey);

      expect(decrypted).toEqual(data);
    });

    test('should encrypt and decrypt array', () => {
      const data = [1, 2, 3, 'four', { five: 5 }];
      const encrypted = secureEncrypt(data, testKey);
      const decrypted = secureDecrypt(encrypted, testKey);

      expect(decrypted).toEqual(data);
    });

    test('should produce different ciphertext for same plaintext (random IV)', () => {
      const plaintext = 'Same message';
      const encrypted1 = secureEncrypt(plaintext, testKey);
      const encrypted2 = secureEncrypt(plaintext, testKey);

      expect(encrypted1).not.toBe(encrypted2);

      // But both should decrypt correctly
      expect(secureDecrypt(encrypted1, testKey)).toBe(plaintext);
      expect(secureDecrypt(encrypted2, testKey)).toBe(plaintext);
    });

    test('should throw on invalid key length', () => {
      const invalidKey = Buffer.from('short');

      expect(() => secureEncrypt('test', invalidKey)).toThrow('Invalid key length');
      expect(() => secureDecrypt('dGVzdA==', invalidKey)).toThrow('Invalid key length');
    });

    test('should throw on tampered ciphertext', () => {
      const encrypted = secureEncrypt('secret data', testKey);

      // Tamper with the payload
      const payload = JSON.parse(Buffer.from(encrypted, 'base64').toString());
      payload.ct = Buffer.from(payload.ct, 'base64').map(b => b ^ 0x01).toString('base64');
      const tampered = Buffer.from(JSON.stringify(payload)).toString('base64');

      expect(() => secureDecrypt(tampered, testKey)).toThrow('authentication tag verification failed');
    });

    test('should throw on tampered auth tag', () => {
      const encrypted = secureEncrypt('secret data', testKey);

      // Tamper with the auth tag
      const payload = JSON.parse(Buffer.from(encrypted, 'base64').toString());
      const tagBytes = Buffer.from(payload.tag, 'base64');
      tagBytes[0] ^= 0x01;
      payload.tag = tagBytes.toString('base64');
      const tampered = Buffer.from(JSON.stringify(payload)).toString('base64');

      expect(() => secureDecrypt(tampered, testKey)).toThrow('authentication tag verification failed');
    });

    test('should throw on wrong key', async () => {
      const encrypted = secureEncrypt('secret data', testKey);
      const wrongKey = await generateKey();

      expect(() => secureDecrypt(encrypted, wrongKey)).toThrow();
    });

    test('should throw on invalid payload format', () => {
      const invalidPayload = Buffer.from('not json').toString('base64');

      expect(() => secureDecrypt(invalidPayload, testKey)).toThrow('Invalid payload format');
    });

    test('should throw on unsupported version', () => {
      const payload = { v: 99, iv: 'a', tag: 'b', ct: 'c' };
      const invalidVersion = Buffer.from(JSON.stringify(payload)).toString('base64');

      expect(() => secureDecrypt(invalidVersion, testKey)).toThrow('Unsupported payload version');
    });

    test('should accept base64 string key', () => {
      const keyB64 = testKey.toString('base64');
      const plaintext = 'test with base64 key';

      const encrypted = secureEncrypt(plaintext, keyB64);
      const decrypted = secureDecrypt(encrypted, keyB64);

      expect(decrypted).toBe(plaintext);
    });

    test('should handle empty string', () => {
      const encrypted = secureEncrypt('', testKey);
      const decrypted = secureDecrypt(encrypted, testKey);

      expect(decrypted).toBe('');
    });

    test('should handle unicode characters', () => {
      const unicode = 'Привет мир 🌍 مرحبا';
      const encrypted = secureEncrypt(unicode, testKey);
      const decrypted = secureDecrypt(encrypted, testKey);

      expect(decrypted).toBe(unicode);
    });

    test('should handle large data', () => {
      const largeData = 'x'.repeat(100000);
      const encrypted = secureEncrypt(largeData, testKey);
      const decrypted = secureDecrypt(encrypted, testKey);

      expect(decrypted).toBe(largeData);
    });
  });

  describe('deriveKey', () => {
    test('should derive consistent key from password and salt', async () => {
      const password = 'my-password';
      const salt = await generateSalt();

      const key1 = await deriveKey(password, salt);
      const key2 = await deriveKey(password, salt);

      expect(key1.equals(key2)).toBe(true);
      expect(key1.length).toBe(32);
    });

    test('should derive different keys for different passwords', async () => {
      const salt = await generateSalt();

      const key1 = await deriveKey('password1', salt);
      const key2 = await deriveKey('password2', salt);

      expect(key1.equals(key2)).toBe(false);
    });

    test('should derive different keys for different salts', async () => {
      const password = 'same-password';

      const key1 = await deriveKey(password, await generateSalt());
      const key2 = await deriveKey(password, await generateSalt());

      expect(key1.equals(key2)).toBe(false);
    });
  });

  describe('generateKey / generateSalt', () => {
    test('should generate 32-byte key', async () => {
      const key = await generateKey();
      expect(key.length).toBe(32);
    });

    test('should generate unique keys', async () => {
      const key1 = await generateKey();
      const key2 = await generateKey();
      expect(key1.equals(key2)).toBe(false);
    });

    test('should generate 32-byte salt', async () => {
      const salt = await generateSalt();
      expect(salt.length).toBe(32);
    });
  });

  describe('generateSecureToken / verifySecureToken', () => {
    test('should generate and verify valid token', async () => {
      const payload = { userId: '123', role: 'admin' };
      const token = await generateSecureToken(payload, testKey);
      const verified = verifySecureToken(token, testKey);

      expect(verified.userId).toBe('123');
      expect(verified.role).toBe('admin');
      expect(verified.iat).toBeDefined();
      expect(verified.exp).toBeDefined();
      expect(verified.jti).toBeDefined();
    });

    test('should reject expired token', async () => {
      const payload = { userId: '123' };
      // Create token that expires immediately
      const token = await generateSecureToken(payload, testKey, -1000);

      const verified = verifySecureToken(token, testKey);
      expect(verified).toBeNull();
    });

    test('should reject token with wrong key', async () => {
      const payload = { userId: '123' };
      const token = await generateSecureToken(payload, testKey);
      const wrongKey = await generateKey();

      const verified = verifySecureToken(token, wrongKey);
      expect(verified).toBeNull();
    });

    test('should reject tampered token', async () => {
      const payload = { userId: '123' };
      const token = await generateSecureToken(payload, testKey);

      // Tamper with token
      const tampered = token.slice(0, -5) + 'xxxxx';

      const verified = verifySecureToken(tampered, testKey);
      expect(verified).toBeNull();
    });
  });

  describe('hashPassword / verifyPassword', () => {
    test('should hash and verify password', async () => {
      const password = 'my-secure-password';
      const hash = await hashPassword(password);

      expect(hash).toContain('pbkdf2-sha512$');
      expect(await verifyPassword(password, hash)).toBe(true);
    });

    test('should reject wrong password', async () => {
      const hash = await hashPassword('correct-password');
      expect(await verifyPassword('wrong-password', hash)).toBe(false);
    });

    test('should generate unique hashes for same password', async () => {
      const password = 'same-password';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      expect(hash1).not.toBe(hash2);
      expect(await verifyPassword(password, hash1)).toBe(true);
      expect(await verifyPassword(password, hash2)).toBe(true);
    });

    test('should throw on invalid hash format', async () => {
      await expect(verifyPassword('password', 'invalid-hash')).rejects.toThrow('Invalid hash format');
    });
  });

  describe('generateRandomString', () => {
    test('should generate hex string of correct length', async () => {
      const str = await generateRandomString(16);
      expect(str.length).toBe(32); // 16 bytes = 32 hex chars
    });

    test('should generate unique strings', async () => {
      const str1 = await generateRandomString();
      const str2 = await generateRandomString();
      expect(str1).not.toBe(str2);
    });
  });

  describe('createHmac / verifyHmac', () => {
    test('should create and verify HMAC', () => {
      const data = 'message to sign';
      const signature = createHmac(data, testKey);

      expect(verifyHmac(data, signature, testKey)).toBe(true);
    });

    test('should reject wrong signature', () => {
      const data = 'message to sign';
      const signature = createHmac(data, testKey);

      expect(verifyHmac(data, 'wrong' + signature.slice(4), testKey)).toBe(false);
    });

    test('should reject wrong key', () => {
      const data = 'message to sign';
      const signature = createHmac(data, testKey);
      const wrongKey = Buffer.from('a'.repeat(32));

      expect(verifyHmac(data, signature, wrongKey)).toBe(false);
    });
  });

  describe('SecurityFramework class', () => {
    test('should initialize and encrypt/decrypt', async () => {
      const sf = new SecurityFramework();
      await sf.initialize(testKey);

      const encrypted = sf.encrypt('test data');
      const decrypted = sf.decrypt(encrypted);

      expect(decrypted).toBe('test data');
    });

    test('should throw if not initialized', () => {
      const sf = new SecurityFramework();

      expect(() => sf.encrypt('test')).toThrow('not initialized');
    });

    test('should generate and verify tokens', async () => {
      const sf = new SecurityFramework();
      await sf.initialize(testKey);

      const token = await sf.generateToken({ userId: '123' });
      const payload = sf.verifyToken(token);

      expect(payload.userId).toBe('123');
    });

    test('should validate API key format', async () => {
      const sf = new SecurityFramework();
      await sf.initialize(testKey);

      expect(sf.validateApiKey('sk-1234567890abcdef')).toBe(true);
      expect(sf.validateApiKey('short')).toBe(false);
      expect(sf.validateApiKey('')).toBe(false);
      expect(sf.validateApiKey(null)).toBe(false);
    });

    test('should return security status', async () => {
      const sf = new SecurityFramework();
      await sf.initialize(testKey);

      const status = sf.getSecurityStatus();

      expect(status.initialized).toBe(true);
      expect(status.algorithm).toBe('aes-256-gcm');
    });
  });

  describe('SecretsManager', () => {
    test('should get API key from environment', async () => {
      process.env.TESTPROVIDER_API_KEY = 'test-key-123';

      const sm = new SecretsManager({ backend: 'env' });
      await sm.initialize();

      const key = await sm.getApiKey('testprovider');
      expect(key).toBe('test-key-123');

      delete process.env.TESTPROVIDER_API_KEY;
    });

    test('should cache API keys', async () => {
      process.env.CACHEDPROVIDER_API_KEY = 'cached-key';

      const sm = new SecretsManager({ backend: 'env' });
      await sm.initialize();

      await sm.getApiKey('cachedprovider');

      // Change env after caching
      process.env.CACHEDPROVIDER_API_KEY = 'changed';

      const cached = await sm.getApiKey('cachedprovider');
      expect(cached).toBe('cached-key');

      sm.clearCache();
      const fresh = await sm.getApiKey('cachedprovider');
      expect(fresh).toBe('changed');

      delete process.env.CACHEDPROVIDER_API_KEY;
    });
  });
});
