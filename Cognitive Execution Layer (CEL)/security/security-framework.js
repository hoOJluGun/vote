/**
 * Security Framework - AES-256-GCM Encryption with PBKDF2 Key Derivation
 * @module security/security-framework
 * @version 2.0.0
 */

import crypto from 'crypto';
import { promisify } from 'util';
import { exec } from 'child_process';

const execAsync = promisify(exec);
const randomBytes = promisify(crypto.randomBytes);
const pbkdf2 = promisify(crypto.pbkdf2);

// Configuration constants
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32;
const SALT_LENGTH = 32;
const PBKDF2_ITERATIONS = 200000;
const TOKEN_EXPIRY_MS = 3600000; // 1 hour

/**
 * Secure encrypt function using AES-256-GCM
 * @param {*} plaintext - Data to encrypt
 * @param {Buffer|string} key - Encryption key (32 bytes or base64 string)
 * @returns {string} Base64 encoded encrypted payload
 */
export function secureEncrypt(plaintext, key) {
  const keyBuf = typeof key === 'string' ? Buffer.from(key, 'base64') : key;
  if (keyBuf.length !== KEY_LENGTH) {
    throw new Error(`Invalid key length: expected ${KEY_LENGTH} bytes, got ${keyBuf.length}`);
  }

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, keyBuf, iv, { authTagLength: AUTH_TAG_LENGTH });

  const plaintextStr = typeof plaintext === 'string' ? plaintext : JSON.stringify(plaintext);
  const ciphertext = Buffer.concat([
    cipher.update(plaintextStr, 'utf8'),
    cipher.final()
  ]);

  const authTag = cipher.getAuthTag();

  const payload = {
    v: 1,
    algo: ALGORITHM,
    iv: iv.toString('base64'),
    tag: authTag.toString('base64'),
    ct: ciphertext.toString('base64'),
    at: Date.now()
  };

  return Buffer.from(JSON.stringify(payload)).toString('base64');
}

/**
 * Secure decrypt function using AES-256-GCM
 * @param {string} payloadB64 - Base64 encoded encrypted payload
 * @param {Buffer|string} key - Decryption key (32 bytes or base64 string)
 * @returns {*} Decrypted data
 */
export function secureDecrypt(payloadB64, key) {
  const keyBuf = typeof key === 'string' ? Buffer.from(key, 'base64') : key;
  if (keyBuf.length !== KEY_LENGTH) {
    throw new Error(`Invalid key length: expected ${KEY_LENGTH} bytes, got ${keyBuf.length}`);
  }

  let payload;
  try {
    payload = JSON.parse(Buffer.from(payloadB64, 'base64').toString('utf8'));
  } catch (e) {
    throw new Error('Invalid payload format');
  }

  if (payload.v !== 1) {
    throw new Error(`Unsupported payload version: ${payload.v}`);
  }

  if (payload.algo !== ALGORITHM) {
    throw new Error(`Unsupported algorithm: ${payload.algo}`);
  }

  const iv = Buffer.from(payload.iv, 'base64');
  const authTag = Buffer.from(payload.tag, 'base64');
  const ciphertext = Buffer.from(payload.ct, 'base64');

  if (iv.length !== IV_LENGTH) {
    throw new Error('Invalid IV length');
  }

  if (authTag.length !== AUTH_TAG_LENGTH) {
    throw new Error('Invalid auth tag length');
  }

  const decipher = crypto.createDecipheriv(ALGORITHM, keyBuf, iv, { authTagLength: AUTH_TAG_LENGTH });
  decipher.setAuthTag(authTag);

  try {
    const plaintext = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final()
    ]).toString('utf8');

    // Try to parse as JSON, return as string if fails
    try {
      return JSON.parse(plaintext);
    } catch {
      return plaintext;
    }
  } catch (e) {
    throw new Error('Decryption failed: authentication tag verification failed (data may be tampered)');
  }
}

/**
 * Derive a key from a password using PBKDF2
 * @param {string} password - Password to derive from
 * @param {Buffer|string} salt - Salt for key derivation
 * @returns {Promise<Buffer>} Derived key
 */
export async function deriveKey(password, salt) {
  const saltBuf = typeof salt === 'string' ? Buffer.from(salt, 'base64') : salt;
  return pbkdf2(password, saltBuf, PBKDF2_ITERATIONS, KEY_LENGTH, 'sha512');
}

/**
 * Generate a new encryption key
 * @returns {Promise<Buffer>} Random 32-byte key
 */
export async function generateKey() {
  return randomBytes(KEY_LENGTH);
}

/**
 * Generate a random salt
 * @returns {Promise<Buffer>} Random 32-byte salt
 */
export async function generateSalt() {
  return randomBytes(SALT_LENGTH);
}

/**
 * Generate a secure token
 * @param {Object} payload - Token payload
 * @param {Buffer|string} key - Encryption key
 * @param {number} expiryMs - Token expiry in milliseconds
 * @returns {Promise<string>} Secure token
 */
export async function generateSecureToken(payload, key, expiryMs = TOKEN_EXPIRY_MS) {
  const tokenData = {
    ...payload,
    iat: Date.now(),
    exp: Date.now() + expiryMs,
    jti: (await randomBytes(16)).toString('hex')
  };
  return secureEncrypt(tokenData, key);
}

/**
 * Verify and decode a secure token
 * @param {string} token - Token to verify
 * @param {Buffer|string} key - Decryption key
 * @returns {Object|null} Decoded payload or null if invalid/expired
 */
export function verifySecureToken(token, key) {
  try {
    const payload = secureDecrypt(token, key);

    if (typeof payload !== 'object' || payload === null) {
      return null;
    }

    if (payload.exp && payload.exp < Date.now()) {
      return null; // Token expired
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Hash a password securely
 * @param {string} password - Password to hash
 * @returns {Promise<string>} Hashed password (format: algo$iterations$salt$hash)
 */
export async function hashPassword(password) {
  const salt = await generateSalt();
  const hash = await pbkdf2(password, salt, PBKDF2_ITERATIONS, KEY_LENGTH, 'sha512');
  return `pbkdf2-sha512$${PBKDF2_ITERATIONS}$${salt.toString('base64')}$${hash.toString('base64')}`;
}

/**
 * Verify a password against a hash
 * @param {string} password - Password to verify
 * @param {string} storedHash - Stored hash
 * @returns {Promise<boolean>} Whether password matches
 */
export async function verifyPassword(password, storedHash) {
  const parts = storedHash.split('$');
  if (parts.length !== 4 || parts[0] !== 'pbkdf2-sha512') {
    throw new Error('Invalid hash format');
  }

  const iterations = parseInt(parts[1], 10);
  const salt = Buffer.from(parts[2], 'base64');
  const storedKey = Buffer.from(parts[3], 'base64');

  const derivedKey = await pbkdf2(password, salt, iterations, KEY_LENGTH, 'sha512');

  // Use timing-safe comparison
  return crypto.timingSafeEqual(derivedKey, storedKey);
}

/**
 * Generate a secure random string
 * @param {number} length - Length in bytes
 * @returns {Promise<string>} Random hex string
 */
export async function generateRandomString(length = 32) {
  const bytes = await randomBytes(length);
  return bytes.toString('hex');
}

/**
 * Create HMAC signature
 * @param {string} data - Data to sign
 * @param {Buffer|string} key - Signing key
 * @returns {string} HMAC signature (hex)
 */
export function createHmac(data, key) {
  const keyBuf = typeof key === 'string' ? Buffer.from(key, 'base64') : key;
  return crypto.createHmac('sha512', keyBuf).update(data).digest('hex');
}

/**
 * Verify HMAC signature
 * @param {string} data - Original data
 * @param {string} signature - Signature to verify
 * @param {Buffer|string} key - Signing key
 * @returns {boolean} Whether signature is valid
 */
export function verifyHmac(data, signature, key) {
  const expected = createHmac(data, key);
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expected, 'hex')
    );
  } catch {
    return false;
  }
}

/**
 * Security Framework class for managing encryption and security operations
 */
export class SecurityFramework {
  constructor(options = {}) {
    this.encryptionKey = null;
    this.initialized = false;
    this.options = {
      keyDerivationIterations: PBKDF2_ITERATIONS,
      tokenExpiryMs: TOKEN_EXPIRY_MS,
      ...options
    };
  }

  /**
   * Initialize with encryption key
   * @param {Buffer|string} key - Encryption key
   */
  async initialize(key) {
    if (typeof key === 'string') {
      this.encryptionKey = Buffer.from(key, 'base64');
    } else {
      this.encryptionKey = key;
    }

    if (this.encryptionKey.length !== KEY_LENGTH) {
      // Derive key if not 32 bytes
      const salt = await generateSalt();
      this.encryptionKey = await deriveKey(key.toString(), salt);
    }

    this.initialized = true;
  }

  /**
   * Encrypt data
   */
  encrypt(data) {
    this._checkInitialized();
    return secureEncrypt(data, this.encryptionKey);
  }

  /**
   * Decrypt data
   */
  decrypt(payload) {
    this._checkInitialized();
    return secureDecrypt(payload, this.encryptionKey);
  }

  /**
   * Generate token
   */
  async generateToken(payload, expiryMs) {
    this._checkInitialized();
    return generateSecureToken(payload, this.encryptionKey, expiryMs || this.options.tokenExpiryMs);
  }

  /**
   * Verify token
   */
  verifyToken(token) {
    this._checkInitialized();
    return verifySecureToken(token, this.encryptionKey);
  }

  /**
   * Validate API key format
   */
  validateApiKey(apiKey) {
    if (!apiKey || typeof apiKey !== 'string') {
      return false;
    }
    // Basic validation - should be non-empty and reasonable length
    return apiKey.length >= 16 && apiKey.length <= 256;
  }

  /**
   * Get security status
   */
  getSecurityStatus() {
    return {
      initialized: this.initialized,
      algorithm: ALGORITHM,
      keyDerivationIterations: this.options.keyDerivationIterations,
      tokenExpiryMs: this.options.tokenExpiryMs
    };
  }

  _checkInitialized() {
    if (!this.initialized) {
      throw new Error('SecurityFramework not initialized. Call initialize() first.');
    }
  }
}

/**
 * macOS Keychain integration for secure key storage
 */
export class KeychainManager {
  constructor(serviceName = 'com.cel.llm-proxy') {
    this.serviceName = serviceName;
  }

  /**
   * Store API key in macOS Keychain
   */
  async storeApiKey(provider, apiKey) {
    const account = `api-key-${provider}`;

    // Delete existing entry first
    try {
      await execAsync(`security delete-generic-password -a "${account}" -s "${this.serviceName}" 2>/dev/null`);
    } catch {
      // Ignore if not found
    }

    // Store new key
    await execAsync(
      `security add-generic-password -a "${account}" -s "${this.serviceName}" -w "${apiKey}"`
    );
  }

  /**
   * Retrieve API key from macOS Keychain
   */
  async getApiKey(provider) {
    const account = `api-key-${provider}`;

    try {
      const { stdout } = await execAsync(
        `security find-generic-password -a "${account}" -s "${this.serviceName}" -w 2>/dev/null`
      );
      return stdout.trim();
    } catch {
      return null;
    }
  }

  /**
   * Delete API key from Keychain
   */
  async deleteApiKey(provider) {
    const account = `api-key-${provider}`;

    try {
      await execAsync(`security delete-generic-password -a "${account}" -s "${this.serviceName}" 2>/dev/null`);
    } catch {
      // Ignore if not found
    }
  }

  /**
   * List all stored providers
   */
  async listStoredProviders() {
    try {
      const { stdout } = await execAsync(
        `security find-generic-password -s "${this.serviceName}" 2>&1 | grep "acct" || true`
      );

      const matches = stdout.matchAll(/"acct"<blob>="([^"]+)"/g);
      const providers = [];

      for (const match of matches) {
        const account = match[1];
        if (account.startsWith('api-key-')) {
          providers.push(account.replace('api-key-', ''));
        }
      }

      return providers;
    } catch {
      return [];
    }
  }
}

/**
 * Secrets Manager - unified interface for secret storage
 */
export class SecretsManager {
  constructor(options = {}) {
    this.backend = options.backend || 'env';
    this.keychain = null;
    this.vault = null;
    this.cache = new Map();
    this.options = options;
  }

  /**
   * Initialize secrets manager
   */
  async initialize() {
    switch (this.backend) {
      case 'keychain':
        this.keychain = new KeychainManager();
        break;
      case 'vault':
        const { VaultSecretsManager } = await import('../security/vault-manager.js');
        this.vault = new VaultSecretsManager({
          address: process.env.VAULT_ADDR || this.options.vaultAddress,
          authMethod: process.env.VAULT_AUTH_METHOD || this.options.vaultAuthMethod || 'token',
          roleId: process.env.VAULT_ROLE_ID || this.options.vaultRoleId,
          secretId: process.env.VAULT_SECRET_ID || this.options.vaultSecretId,
          token: process.env.VAULT_TOKEN || this.options.vaultToken,
          mountPath: process.env.VAULT_MOUNT_PATH || this.options.vaultMountPath || 'secret',
          namespace: process.env.VAULT_NAMESPACE || this.options.vaultNamespace
        });
        await this.vault.authenticate();
        break;
      case 'env':
        // No additional initialization needed
        break;
    }
  }

  /**
   * Get API key for provider
   */
  async getApiKey(provider) {
    // Check cache first
    if (this.cache.has(provider)) {
      return this.cache.get(provider);
    }

    let key = null;

    switch (this.backend) {
      case 'keychain':
        key = await this.keychain?.getApiKey(provider);
        break;
      case 'vault':
        // Try to get from Vault using standardized path
        const vaultPath = `cel/${provider}/api_key`;
        key = await this.vault?.getSecret(vaultPath);
        
        // Fallback to environment variable if Vault fails
        if (!key) {
          key = process.env[`${provider.toUpperCase()}_API_KEY`] ||
                process.env[`${provider.toUpperCase()}_KEY`];
          if (key) {
            console.warn(`⚠️ Using environment variable fallback for ${provider} API key`);
          }
        }
        break;
      case 'env':
        key = process.env[`${provider.toUpperCase()}_API_KEY`] ||
          process.env[`${provider.toUpperCase()}_KEY`];
        break;
    }

    if (key) {
      this.cache.set(provider, key);
    }

    return key;
  }

  /**
   * Set API key for provider
   */
  async setApiKey(provider, key) {
    switch (this.backend) {
      case 'keychain':
        await this.keychain?.storeApiKey(provider, key);
        break;
      case 'vault':
        const vaultPath = `cel/${provider}/api_key`;
        await this.vault?.setSecret(vaultPath, key);
        break;
      case 'env':
        throw new Error('Cannot set environment variables at runtime');
    }

    this.cache.set(provider, key);
  }

  /**
   * Clear cached secrets
   */
  clearCache() {
    this.cache.clear();
    if (this.vault) {
      this.vault.clearCache();
    }
  }

  /**
   * Get arbitrary secret (Vault only)
   * @param {string} path - Secret path in Vault
   * @returns {Promise<string|null>} Secret value
   */
  async getSecret(path) {
    if (this.backend !== 'vault') {
      throw new Error('getSecret is only available with Vault backend');
    }
    
    return await this.vault?.getSecret(path);
  }

  /**
   * Set arbitrary secret (Vault only)
   * @param {string} path - Secret path in Vault
   * @param {string} value - Secret value
   * @returns {Promise<void>}
   */
  async setSecret(path, value) {
    if (this.backend !== 'vault') {
      throw new Error('setSecret is only available with Vault backend');
    }
    
    return await this.vault?.setSecret(path, value);
  }

  /**
   * Health check for the secrets backend
   * @returns {Promise<Object>} Health status
   */
  async healthCheck() {
    switch (this.backend) {
      case 'vault':
        return await this.vault?.healthCheck() || { healthy: false, error: 'Vault not initialized' };
      case 'keychain':
        return { healthy: !!this.keychain, backend: 'keychain' };
      case 'env':
        return { healthy: true, backend: 'environment', note: 'Using environment variables' };
      default:
        return { healthy: false, error: 'Unknown backend' };
    }
  }
}

// Default export
export default {
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
  KeychainManager,
  SecretsManager
};
