/**
 * Client-Side End-to-End Encryption
 * Implements envelope encryption with AES-256-GCM and Vault Transit integration
 * @module security/client-encryption
 * @version 1.0.0
 */

import crypto from 'crypto';
import { promisify } from 'util';

const randomBytes = promisify(crypto.randomBytes);

/**
 * Encrypted payload format
 * @typedef {Object} EncryptedPayload
 * @property {number} v - Version number
 * @property {string} alg - Algorithm used (AES-256-GCM)
 * @property {string} iv - Base64 encoded initialization vector
 * @property {string} ct - Base64 encoded ciphertext
 * @property {string} tag - Base64 encoded authentication tag
 * @property {string} dek_wrapped - Base64 encoded wrapped DEK
 * @property {string} dek_kid - Key identifier for the KEK version
 * @property {Object} meta - Metadata (timestamps, creator, etc.)
 */

/**
 * Client-side encryption service
 */
export class ClientEncryption {
  /**
   * @param {Object} options - Configuration options
   * @param {VaultTransitClient} [options.vaultTransit] - Vault Transit client for KEK management
   * @param {string} [options.kekId='default'] - Default KEK identifier
   */
  constructor(options = {}) {
    this.vaultTransit = options.vaultTransit || null;
    this.defaultKekId = options.kekId || 'default';
    this.dekCache = new Map(); // Cache for unwrapped DEKs (short-lived)
    this.cacheTtl = 300000; // 5 minutes
  }

  /**
   * Encrypt data using envelope encryption
   * @param {*} data - Data to encrypt (object, string, etc.)
   * @param {Object} [options] - Encryption options
   * @param {string} [options.kekId] - Key encryption key identifier
   * @param {string} [options.aad] - Additional authenticated data
   * @param {Object} [options.meta] - Metadata to include
   * @returns {Promise<EncryptedPayload>} Encrypted payload
   */
  async encrypt(data, options = {}) {
    const kekId = options.kekId || this.defaultKekId;
    const aad = options.aad || '';
    const meta = options.meta || {};

    // 1. Generate DEK (Data Encryption Key)
    const dek = await this._generateDEK();

    // 2. Encrypt data with DEK using AES-256-GCM
    const plaintext = typeof data === 'string' ? data : JSON.stringify(data);
    const { ciphertext, iv, tag } = await this._encryptWithDEK(plaintext, dek, aad);

    // 3. Wrap DEK with KEK (using Vault Transit)
    const dekWrapped = await this._wrapDEK(dek, kekId);

    // 4. Build payload
    const payload = {
      v: 1,
      alg: 'AES-256-GCM',
      iv: iv.toString('base64'),
      ct: ciphertext.toString('base64'),
      tag: tag.toString('base64'),
      dek_wrapped: dekWrapped,
      dek_kid: kekId,
      meta: {
        ...meta,
        createdAt: Date.now(),
        createdBy: 'client'
      }
    };

    // Clear DEK from memory
    this._clearSensitiveMemory(dek);

    return payload;
  }

  /**
   * Decrypt encrypted payload
   * @param {EncryptedPayload} payload - Encrypted payload
   * @param {Object} [options] - Decryption options
   * @param {string} [options.aad] - Additional authenticated data
   * @returns {Promise<*>} Decrypted data
   */
  async decrypt(payload, options = {}) {
    const aad = options.aad || '';

    // Validate payload
    this._validatePayload(payload);

    // 1. Unwrap DEK using Vault Transit
    const dek = await this._unwrapDEK(payload.dek_wrapped, payload.dek_kid);

    try {
      // 2. Decrypt ciphertext with DEK
      const plaintext = await this._decryptWithDEK(
        payload.ct,
        dek,
        payload.iv,
        payload.tag,
        aad
      );

      // 3. Parse result
      try {
        return JSON.parse(plaintext);
      } catch {
        return plaintext; // Return as string if not JSON
      }
    } finally {
      // Clear DEK from memory
      this._clearSensitiveMemory(dek);
    }
  }

  /**
   * Rotate KEK - rewrap all DEKs with new KEK version
   * @param {string} oldKekId - Old KEK identifier
   * @param {string} newKekId - New KEK identifier
   * @param {Array<EncryptedPayload>} payloads - Array of encrypted payloads to rewrap
   * @returns {Promise<Array<EncryptedPayload>>} Rewrapped payloads
   */
  async rotateKEK(oldKekId, newKekId, payloads) {
    const results = [];

    for (const payload of payloads) {
      // Skip payloads not using the old KEK
      if (payload.dek_kid !== oldKekId) {
        results.push(payload);
        continue;
      }

      // Unwrap DEK with old KEK
      const dek = await this._unwrapDEK(payload.dek_wrapped, oldKekId);

      try {
        // Wrap DEK with new KEK
        const newDekWrapped = await this._wrapDEK(dek, newKekId);

        // Create new payload with updated KEK reference
        const newPayload = {
          ...payload,
          dek_wrapped: newDekWrapped,
          dek_kid: newKekId,
          meta: {
            ...payload.meta,
            rotatedAt: Date.now(),
            rotatedFrom: oldKekId
          }
        };

        results.push(newPayload);
      } finally {
        this._clearSensitiveMemory(dek);
      }
    }

    return results;
  }

  /**
   * Generate a new DEK (Data Encryption Key)
   * @private
   * @returns {Promise<Buffer>} 32-byte DEK
   */
  async _generateDEK() {
    return randomBytes(32); // AES-256 key
  }

  /**
   * Encrypt data with DEK using AES-256-GCM
   * @private
   */
  async _encryptWithDEK(plaintext, dek, aad = '') {
    const iv = await randomBytes(12); // 96-bit IV for GCM
    const cipher = crypto.createCipheriv('aes-256-gcm', dek, iv);

    if (aad) {
      cipher.setAAD(Buffer.from(aad, 'utf8'));
    }

    const ciphertext = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final()
    ]);

    const tag = cipher.getAuthTag();

    return { ciphertext, iv, tag };
  }

  /**
   * Decrypt data with DEK using AES-256-GCM
   * @private
   */
  async _decryptWithDEK(ciphertextB64, dek, ivB64, tagB64, aad = '') {
    const ciphertext = Buffer.from(ciphertextB64, 'base64');
    const iv = Buffer.from(ivB64, 'base64');
    const tag = Buffer.from(tagB64, 'base64');

    const decipher = crypto.createDecipheriv('aes-256-gcm', dek, iv);
    decipher.setAuthTag(tag);

    if (aad) {
      decipher.setAAD(Buffer.from(aad, 'utf8'));
    }

    try {
      const plaintext = Buffer.concat([
        decipher.update(ciphertext),
        decipher.final()
      ]);
      return plaintext.toString('utf8');
    } catch (error) {
      throw new Error('Authentication failed: Invalid ciphertext or tampered data');
    }
  }

  /**
   * Wrap DEK using Vault Transit
   * @private
   */
  async _wrapDEK(dek, kekId) {
    if (this.vaultTransit) {
      // Use Vault Transit to wrap the DEK
      const response = await this.vaultTransit.wrapData(dek.toString('base64'), kekId);
      return response.wrapped_token;
    } else {
      // Fallback: Simple encryption with a static key (NOT FOR PRODUCTION)
      // In production, ALWAYS use Vault Transit or similar HSM
      console.warn('⚠️ Using fallback encryption - NOT SECURE FOR PRODUCTION');
      const staticKey = crypto.createHash('sha256').update('fallback-key').digest();
      const iv = await randomBytes(12);
      const cipher = crypto.createCipheriv('aes-256-gcm', staticKey, iv);
      const ciphertext = Buffer.concat([cipher.update(dek), cipher.final()]);
      const tag = cipher.getAuthTag();
      
      return JSON.stringify({
        iv: iv.toString('base64'),
        ct: ciphertext.toString('base64'),
        tag: tag.toString('base64')
      });
    }
  }

  /**
   * Unwrap DEK using Vault Transit
   * @private
   */
  async _unwrapDEK(wrappedDek, kekId) {
    // Check cache first
    const cacheKey = `${kekId}:${wrappedDek}`;
    const cached = this.dekCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTtl) {
      return Buffer.from(cached.dek, 'base64');
    }

    let dek;

    if (this.vaultTransit) {
      // Use Vault Transit to unwrap the DEK
      const response = await this.vaultTransit.unwrapData(wrappedDek, kekId);
      dek = Buffer.from(response.plaintext, 'base64');
    } else {
      // Fallback decryption
      console.warn('⚠️ Using fallback decryption - NOT SECURE FOR PRODUCTION');
      const staticKey = crypto.createHash('sha256').update('fallback-key').digest();
      const wrapper = JSON.parse(wrappedDek);
      const iv = Buffer.from(wrapper.iv, 'base64');
      const ciphertext = Buffer.from(wrapper.ct, 'base64');
      const tag = Buffer.from(wrapper.tag, 'base64');
      
      const decipher = crypto.createDecipheriv('aes-256-gcm', staticKey, iv);
      decipher.setAuthTag(tag);
      dek = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    }

    // Cache unwrapped DEK (short-lived)
    this.dekCache.set(cacheKey, {
      dek: dek.toString('base64'),
      timestamp: Date.now()
    });

    return dek;
  }

  /**
   * Validate encrypted payload structure
   * @private
   */
  _validatePayload(payload) {
    const requiredFields = ['v', 'alg', 'iv', 'ct', 'tag', 'dek_wrapped', 'dek_kid'];
    
    for (const field of requiredFields) {
      if (!(field in payload)) {
        throw new Error(`Invalid payload: missing field '${field}'`);
      }
    }

    if (payload.v !== 1) {
      throw new Error(`Unsupported payload version: ${payload.v}`);
    }

    if (payload.alg !== 'AES-256-GCM') {
      throw new Error(`Unsupported algorithm: ${payload.alg}`);
    }
  }

  /**
   * Clear sensitive data from memory
   * @private
   */
  _clearSensitiveMemory(buffer) {
    if (buffer && typeof buffer.fill === 'function') {
      buffer.fill(0);
    }
  }

  /**
   * Clear DEK cache
   */
  clearCache() {
    this.dekCache.clear();
    console.log('🧹 Client encryption cache cleared');
  }
}

/**
 * Vault Transit Client (stub for integration)
 */
export class VaultTransitClient {
  constructor(vaultClient) {
    this.vault = vaultClient;
  }

  /**
   * Wrap data using Vault Transit
   */
  async wrapData(plaintext, keyName) {
    // This would call Vault's /transit/wrap/{key} endpoint
    // Implementation depends on your Vault client library
    throw new Error('VaultTransitClient.wrapData not implemented');
  }

  /**
   * Unwrap data using Vault Transit
   */
  async unwrapData(wrappedToken, keyName) {
    // This would call Vault's /transit/unwrap endpoint
    // Implementation depends on your Vault client library
    throw new Error('VaultTransitClient.unwrapData not implemented');
  }
}

export default ClientEncryption;
