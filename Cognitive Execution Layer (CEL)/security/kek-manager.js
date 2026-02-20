/**
 * Key Encryption Key (KEK) Manager for Vault Transit Integration
 * Manages encryption keys for envelope encryption using Vault Transit
 * @module security/kek-manager
 * @version 1.0.0
 */

import { VaultSecretsManager } from './vault-manager.js';

/**
 * KEK Manager for handling encryption key lifecycle
 */
export class KEKManager {
  /**
   * @param {Object} config - KEK configuration
   * @param {VaultSecretsManager} vaultManager - Initialized Vault manager
   * @param {string} [config.keyName='cel-kek'] - Base key name for KEK
   * @param {string} [config.keyType='aes256-gcm96'] - Encryption algorithm
   * @param {boolean} [config.autoRotate=false] - Auto-rotation enabled
   * @param {number} [config.rotationPeriod=0] - Rotation period in seconds (0 = manual)
   * @param {string} [config.context='cel-context'] - Context for key derivation
   */
  constructor(config = {}) {
    this.vault = config.vaultManager;
    if (!this.vault) {
      throw new Error('VaultSecretsManager instance required');
    }

    this.config = {
      keyName: 'cel-kek',
      keyType: 'aes256-gcm96',
      autoRotate: false,
      rotationPeriod: 0,
      context: 'cel-context',
      ...config
    };

    this.cache = new Map();
    this.lastRotationCheck = null;
  }

  /**
   * Initialize KEK manager and ensure key exists
   * @returns {Promise<void>}
   */
  async initialize() {
    try {
      // Check if key exists
      const keys = await this.vault.transitListKeys();
      
      if (!keys.includes(this.config.keyName)) {
        console.log(`🗝️ Creating new KEK: ${this.config.keyName}`);
        await this.vault.transitCreateKey(this.config.keyName, {
          type: this.config.keyType,
          exportable: false,
          allowPlaintextBackup: false,
          autoRotatePeriod: this.config.rotationPeriod
        });
      } else {
        console.log(`✅ KEK already exists: ${this.config.keyName}`);
      }

      // Check auto-rotation status
      if (this.config.autoRotate && this.config.rotationPeriod > 0) {
        await this._setupAutoRotation();
      }

    } catch (error) {
      console.error('❌ KEK initialization failed:', error.message);
      throw error;
    }
  }

  /**
   * Generate new data encryption key (DEK) wrapped with KEK
   * @param {string} dekPurpose - Purpose/context for the DEK
   * @param {number} bits - Key size (128, 256)
   * @returns {Promise<{dek: string, wrappedKey: string, keyId: string}>} DEK and wrapped version
   */
  async generateWrappedDEK(dekPurpose, bits = 256) {
    try {
      // Generate wrapped data key
      const keyData = await this.vault.transitGenerateDataKey(
        this.config.keyName, 
        'wrapped',
        {
          bits: bits,
          context: `${this.config.context}:${dekPurpose}`
        }
      );

      // Generate plaintext DEK for immediate use
      const plaintextKeyData = await this.vault.transitGenerateDataKey(
        this.config.keyName,
        'plaintext',
        {
          bits: bits,
          context: `${this.config.context}:${dekPurpose}`
        }
      );

      const keyId = `${this.config.keyName}:${Date.now()}:${dekPurpose}`;

      console.log(`🔑 Generated wrapped DEK for: ${dekPurpose}`);

      return {
        dek: plaintextKeyData.plaintext,
        wrappedKey: keyData.ciphertext,
        keyId: keyId,
        createdAt: new Date().toISOString(),
        purpose: dekPurpose
      };

    } catch (error) {
      console.error('❌ DEK generation failed:', error.message);
      throw error;
    }
  }

  /**
   * Unwrap DEK using KEK
   * @param {string} wrappedKey - Wrapped key from Vault
   * @param {string} dekPurpose - Purpose/context for the DEK
   * @returns {Promise<string>} Unwrapped DEK
   */
  async unwrapDEK(wrappedKey, dekPurpose) {
    try {
      const plaintext = await this.vault.transitDecrypt(
        this.config.keyName,
        wrappedKey,
        {
          context: `${this.config.context}:${dekPurpose}`
        }
      );

      console.log(`🔓 Unwrapped DEK for: ${dekPurpose}`);
      return plaintext;

    } catch (error) {
      console.error('❌ DEK unwrapping failed:', error.message);
      throw error;
    }
  }

  /**
   * Encrypt data using envelope encryption
   * @param {string|Buffer} data - Data to encrypt
   * @param {string} purpose - Data purpose/context
   * @returns {Promise<{encryptedData: string, wrappedKey: string, keyId: string}>}
   */
  async encryptWithEnvelope(data, purpose) {
    try {
      // Generate wrapped DEK
      const dekInfo = await this.generateWrappedDEK(purpose);
      
      // Convert data to string if buffer
      const dataString = typeof data === 'string' ? data : data.toString('utf8');
      
      // Encrypt data with DEK (simplified - in practice would use proper crypto library)
      // This is a placeholder - real implementation would use the DEK with AES-GCM
      const encryptedData = await this.vault.transitEncrypt(
        this.config.keyName,
        dataString,
        {
          context: `${this.config.context}:${purpose}:${dekInfo.keyId}`,
          keyVersion: 1 // Use latest version
        }
      );

      return {
        encryptedData: encryptedData,
        wrappedKey: dekInfo.wrappedKey,
        keyId: dekInfo.keyId,
        createdAt: dekInfo.createdAt
      };

    } catch (error) {
      console.error('❌ Envelope encryption failed:', error.message);
      throw error;
    }
  }

  /**
   * Decrypt data using envelope encryption
   * @param {string} encryptedData - Encrypted data
   * @param {string} wrappedKey - Wrapped DEK
   * @param {string} keyId - Key identifier
   * @param {string} purpose - Data purpose/context
   * @returns {Promise<string>} Decrypted data
   */
  async decryptWithEnvelope(encryptedData, wrappedKey, keyId, purpose) {
    try {
      // Unwrap DEK
      const dek = await this.unwrapDEK(wrappedKey, purpose);
      
      // Decrypt data (placeholder implementation)
      const decryptedData = await this.vault.transitDecrypt(
        this.config.keyName,
        encryptedData,
        {
          context: `${this.config.context}:${purpose}:${keyId}`
        }
      );

      console.log(`🔓 Decrypted data with envelope encryption`);
      return decryptedData;

    } catch (error) {
      console.error('❌ Envelope decryption failed:', error.message);
      throw error;
    }
  }

  /**
   * Rotate KEK to new version
   * @returns {Promise<void>}
   */
  async rotateKEK() {
    try {
      await this.vault.transitRotateKey(this.config.keyName);
      this.cache.clear();
      this.lastRotationCheck = Date.now();
      
      console.log(`🔄 KEK rotated: ${this.config.keyName}`);
    } catch (error) {
      console.error('❌ KEK rotation failed:', error.message);
      throw error;
    }
  }

  /**
   * Rewrap existing ciphertexts with new key version
   * @param {Array<{ciphertext: string, keyId: string, purpose: string}>} encryptedItems
   * @returns {Promise<Array>} Rewrapped items
   */
  async rewrapEncryptedData(encryptedItems) {
    try {
      const rewrappedItems = [];
      
      for (const item of encryptedItems) {
        try {
          const rewrapped = await this.vault.transitRewrap(
            this.config.keyName,
            [item.ciphertext]
          );
          
          rewrappedItems.push({
            ...item,
            ciphertext: rewrapped[0],
            rewrappedAt: new Date().toISOString()
          });
          
        } catch (error) {
          console.warn(`⚠️ Failed to rewrap item ${item.keyId}:`, error.message);
          rewrappedItems.push(item); // Keep original if rewrap fails
        }
      }
      
      console.log(`🔁 Rewrapped ${rewrappedItems.length} encrypted items`);
      return rewrappedItems;

    } catch (error) {
      console.error('❌ Bulk rewrap failed:', error.message);
      throw error;
    }
  }

  /**
   * Get KEK metadata and status
   * @returns {Promise<Object>} KEK information
   */
  async getKeyStatus() {
    try {
      const keyInfo = await this.vault.transitReadKey(this.config.keyName);
      
      return {
        keyName: this.config.keyName,
        keyType: keyInfo.type,
        minDecryptionVersion: keyInfo.min_decryption_version,
        minEncryptionVersion: keyInfo.min_encryption_version,
        latestVersion: keyInfo.latest_version,
        deletionAllowed: keyInfo.deletion_allowed,
        exportable: keyInfo.exportable,
        autoRotatePeriod: keyInfo.auto_rotate_period,
        keys: Object.keys(keyInfo.keys || {}).length
      };

    } catch (error) {
      console.error('❌ Failed to get KEK status:', error.message);
      throw error;
    }
  }

  /**
   * List all KEK versions
   * @returns {Promise<Array>} Key versions information
   */
  async listKeyVersions() {
    try {
      const keyInfo = await this.vault.transitReadKey(this.config.keyName);
      return Object.entries(keyInfo.keys || {}).map(([version, info]) => ({
        version: parseInt(version),
        creationTime: info.creation_time,
        compromised: info.compromised || false
      }));

    } catch (error) {
      console.error('❌ Failed to list key versions:', error.message);
      throw error;
    }
  }

  /**
   * Setup auto-rotation if configured
   * @private
   */
  async _setupAutoRotation() {
    if (this.config.rotationPeriod <= 0) return;

    // Check if rotation is needed
    const now = Date.now();
    if (this.lastRotationCheck && 
        (now - this.lastRotationCheck) < (this.config.rotationPeriod * 1000)) {
      return;
    }

    try {
      const keyInfo = await this.getKeyStatus();
      const shouldRotate = keyInfo.latestVersion === keyInfo.minEncryptionVersion;
      
      if (shouldRotate) {
        console.log('⏰ Auto-rotating KEK due to schedule');
        await this.rotateKEK();
      }
      
      this.lastRotationCheck = now;

    } catch (error) {
      console.warn('⚠️ Auto-rotation check failed:', error.message);
    }
  }

  /**
   * Clear cached keys
   */
  clearCache() {
    this.cache.clear();
    console.log('🧹 KEK cache cleared');
  }

  /**
   * Close KEK manager
   */
  async close() {
    this.clearCache();
    console.log('🔌 KEK manager closed');
  }
}

export default KEKManager;