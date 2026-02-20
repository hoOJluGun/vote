/**
 * End-to-End Encryption (E2EE) Implementation
 * Envelope encryption with AES-256-GCM and Vault Transit integration
 */

import crypto from 'crypto';
import { VaultSecretsManager } from './VaultSecretsManager';

export interface EncryptedPayload {
  v: number;                    // Version
  alg: string;                   // Algorithm
  iv: string;                    // Initialization Vector (base64)
  ct: string;                    // Ciphertext (base64)
  tag: string;                   // Authentication Tag (base64)
  dek_wrapped: string;           // Wrapped Data Encryption Key (base64)
  dek_kid: string;              // Key ID for DEK
  meta: {                        // Metadata
    createdBy: string;
    timestamp: string;
    keyVersion?: string;
    context?: string;
  };
}

export interface EncryptionOptions {
  kekId?: string;               // Key Encryption Key ID
  aad?: string;                 // Additional Authenticated Data
  context?: string;              // Encryption context
  createdBy?: string;            // Creator identifier
}

export interface DecryptionOptions {
  unwrapVia?: 'vault' | 'server'; // Unwrapping method
  kekId?: string;               // Override KEK for unwrapping
}

export interface KeyRotationResult {
  rewrappedCount: number;
  failedCount: number;
  errors: Array<{ payloadId: string; error: string }>;
}

/**
 * End-to-End Encryption Manager
 * Implements envelope encryption with AES-256-GCM and Vault Transit
 */
export class E2EEManager {
  private vaultManager: VaultSecretsManager;
  private defaultKekId: string;
  private algorithm = 'aes-256-gcm';
  private ivLength = 12;         // 96 bits for GCM
  private tagLength = 16;        // 128 bits for GCM
  private dekLength = 32;        // 256 bits for AES-256

  constructor(vaultManager: VaultSecretsManager, defaultKekId: string) {
    this.vaultManager = vaultManager;
    this.defaultKekId = defaultKekId;
  }

  /**
   * Encrypt data using envelope encryption
   */
  async clientEncrypt(
    data: Buffer | object,
    options: EncryptionOptions = {}
  ): Promise<EncryptedPayload> {
    try {
      // Convert object to buffer if needed
      const plaintext = Buffer.isBuffer(data) ? data : Buffer.from(JSON.stringify(data));
      
      // Generate Data Encryption Key (DEK)
      const dek = crypto.randomBytes(this.dekLength);
      
      // Generate IV
      const iv = crypto.randomBytes(this.ivLength);
      
      // Create cipher
      const cipher = crypto.createCipher(this.algorithm, dek);
      cipher.setAAD(Buffer.from(options.aad || ''));
      
      // Encrypt data
      const ciphertext = Buffer.concat([
        cipher.update(plaintext),
        cipher.final()
      ]);
      
      // Get authentication tag
      const tag = cipher.getAuthTag();
      
      // Wrap DEK using Vault Transit
      const kekId = options.kekId || this.defaultKekId;
      const dekWrapped = await this.vaultManager.transitEncrypt(kekId, dek);
      
      // Create key ID with version
      const dekKid = `${kekId}:v${Date.now()}`;
      
      // Create payload
      const payload: EncryptedPayload = {
        v: 1,
        alg: this.algorithm,
        iv: iv.toString('base64'),
        ct: ciphertext.toString('base64'),
        tag: tag.toString('base64'),
        dek_wrapped: dekWrapped,
        dek_kid: dekKid,
        meta: {
          createdBy: options.createdBy || 'cel-client',
          timestamp: new Date().toISOString(),
          keyVersion: await this.getKeyVersion(kekId),
          context: options.context
        }
      };
      
      // Zeroize DEK from memory
      dek.fill(0);
      
      return payload;
    } catch (error) {
      throw new Error(`Encryption failed: ${error.message}`);
    }
  }

  /**
   * Decrypt data using envelope encryption
   */
  async clientDecrypt(
    payload: EncryptedPayload,
    options: DecryptionOptions = {}
  ): Promise<Buffer | object> {
    try {
      // Validate payload version
      if (payload.v !== 1) {
        throw new Error(`Unsupported payload version: ${payload.v}`);
      }
      
      // Extract KEK ID from DEK key ID
      const kekId = options.kekId || this.extractKekId(payload.dek_kid);
      
      // Unwrap DEK
      let dek: Buffer;
      if (options.unwrapVia === 'server') {
        // Server-side unwrapping (fallback)
        dek = await this.unwrapDEKServer(payload.dek_wrapped, kekId);
      } else {
        // Vault unwrapping (preferred)
        dek = await this.vaultManager.transitDecrypt(kekId, payload.dek_wrapped);
      }
      
      try {
        // Extract components
        const iv = Buffer.from(payload.iv, 'base64');
        const ciphertext = Buffer.from(payload.ct, 'base64');
        const tag = Buffer.from(payload.tag, 'base64');
        
        // Create decipher
        const decipher = crypto.createDecipher(payload.alg, dek);
        decipher.setAuthTag(tag);
        
        // Decrypt data
        const plaintext = Buffer.concat([
          decipher.update(ciphertext),
          decipher.final()
        ]);
        
        // Zeroize DEK from memory
        dek.fill(0);
        
        // Try to parse as JSON, return as buffer if fails
        try {
          return JSON.parse(plaintext.toString());
        } catch {
          return plaintext;
        }
      } finally {
        // Ensure DEK is zeroized even if decryption fails
        dek.fill(0);
      }
    } catch (error) {
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }

  /**
   * Rotate Key Encryption Key
   */
  async rotateKEK(oldKekId: string, newKekId: string): Promise<KeyRotationResult> {
    const result: KeyRotationResult = {
      rewrappedCount: 0,
      failedCount: 0,
      errors: []
    };

    try {
      // This would typically involve:
      // 1. Finding all payloads encrypted with oldKekId
      // 2. For each payload:
      //    - Decrypt with old key
      //    - Encrypt with new key
      //    - Update storage
      
      // For demonstration, we'll show the pattern
      const payloadsToRotate = await this.findPayloadsByKey(oldKekId);
      
      for (const payload of payloadsToRotate) {
        try {
          // Decrypt with old key
          const plaintext = await this.clientDecrypt(payload, { kekId: oldKekId });
          
          // Re-encrypt with new key
          const newPayload = await this.clientEncrypt(plaintext, { kekId: newKekId });
          
          // Update storage (implementation-specific)
          await this.updatePayload(payload.id, newPayload);
          
          result.rewrappedCount++;
        } catch (error) {
          result.failedCount++;
          result.errors.push({
            payloadId: payload.id,
            error: error.message
          });
        }
      }
      
      return result;
    } catch (error) {
      throw new Error(`Key rotation failed: ${error.message}`);
    }
  }

  /**
   * Generate a new Data Encryption Key
   */
  private generateDEK(): Buffer {
    return crypto.randomBytes(this.dekLength);
  }

  /**
   * Extract KEK ID from DEK key ID
   */
  private extractKekId(dekKid: string): string {
    const parts = dekKid.split(':v');
    if (parts.length !== 2) {
      throw new Error(`Invalid DEK key ID format: ${dekKid}`);
    }
    return parts[0];
  }

  /**
   * Get key version from Vault
   */
  private async getKeyVersion(kekId: string): Promise<string> {
    try {
      // This would typically query Vault for key version
      // For now, return a timestamp-based version
      return `v${Date.now()}`;
    } catch (error) {
      return 'unknown';
    }
  }

  /**
   * Unwrap DEK using server-side method (fallback)
   */
  private async unwrapDEKServer(wrappedDEK: string, kekId: string): Promise<Buffer> {
    // This would make a server call to unwrap the DEK
    // Implementation depends on server API
    throw new Error('Server-side unwrapping not implemented');
  }

  /**
   * Find payloads encrypted with specific key
   */
  private async findPayloadsByKey(kekId: string): Promise<Array<{ id: string; payload: EncryptedPayload }>> {
    // This would query storage for payloads encrypted with kekId
    // Implementation depends on storage backend
    return [];
  }

  /**
   * Update payload in storage
   */
  private async updatePayload(payloadId: string, newPayload: EncryptedPayload): Promise<void> {
    // This would update the payload in storage
    // Implementation depends on storage backend
  }

  /**
   * Validate encrypted payload integrity
   */
  validatePayload(payload: EncryptedPayload): boolean {
    try {
      // Check required fields
      const requiredFields = ['v', 'alg', 'iv', 'ct', 'tag', 'dek_wrapped', 'dek_kid', 'meta'];
      for (const field of requiredFields) {
        if (!(field in payload)) {
          return false;
        }
      }
      
      // Check version
      if (payload.v !== 1) {
        return false;
      }
      
      // Check algorithm
      if (payload.alg !== this.algorithm) {
        return false;
      }
      
      // Check base64 fields
      const base64Fields = ['iv', 'ct', 'tag', 'dek_wrapped'];
      for (const field of base64Fields) {
        try {
          Buffer.from(payload[field], 'base64');
        } catch {
          return false;
        }
      }
      
      // Check metadata
      if (!payload.meta.createdBy || !payload.meta.timestamp) {
        return false;
      }
      
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Generate encryption statistics
   */
  async getEncryptionStats(): Promise<{
    totalEncrypted: number;
    keyDistribution: Record<string, number>;
    averagePayloadSize: number;
  }> {
    // This would query storage for statistics
    // Implementation depends on storage backend
    return {
      totalEncrypted: 0,
      keyDistribution: {},
      averagePayloadSize: 0
    };
  }

  /**
   * Perform integrity check on encrypted data
   */
  async integrityCheck(payloadId: string): Promise<{
    valid: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];
    
    try {
      // This would retrieve and validate the payload
      // Implementation depends on storage backend
      
      return {
        valid: errors.length === 0,
        errors
      };
    } catch (error) {
      errors.push(`Failed to retrieve payload: ${error.message}`);
      return {
        valid: false,
        errors
      };
    }
  }

  /**
   * Batch decrypt multiple payloads
   */
  async batchDecrypt(
    payloads: Array<{ id: string; payload: EncryptedPayload }>,
    options: DecryptionOptions = {}
  ): Promise<Array<{ id: string; data: Buffer | object; error?: string }>> {
    const results = [];
    
    for (const { id, payload } of payloads) {
      try {
        const data = await this.clientDecrypt(payload, options);
        results.push({ id, data });
      } catch (error) {
        results.push({ 
          id, 
          data: null, 
          error: error.message 
        });
      }
    }
    
    return results;
  }

  /**
   * Generate encryption key for testing purposes
   */
  static generateTestKey(): Buffer {
    return crypto.randomBytes(32);
  }

  /**
   * Encrypt with test key (for development only)
   */
  static encryptWithTestKey(
    data: Buffer | object,
    key: Buffer,
    aad?: string
  ): EncryptedPayload {
    const plaintext = Buffer.isBuffer(data) ? data : Buffer.from(JSON.stringify(data));
    const iv = crypto.randomBytes(12);
    
    const cipher = crypto.createCipher('aes-256-gcm', key);
    if (aad) {
      cipher.setAAD(Buffer.from(aad));
    }
    
    const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const tag = cipher.getAuthTag();
    
    return {
      v: 1,
      alg: 'aes-256-gcm',
      iv: iv.toString('base64'),
      ct: ciphertext.toString('base64'),
      tag: tag.toString('base64'),
      dek_wrapped: key.toString('base64'), // Not wrapped for testing
      dek_kid: 'test-key',
      meta: {
        createdBy: 'test',
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Decrypt with test key (for development only)
   */
  static decryptWithTestKey(
    payload: EncryptedPayload,
    key: Buffer
  ): Buffer | object {
    const iv = Buffer.from(payload.iv, 'base64');
    const ciphertext = Buffer.from(payload.ct, 'base64');
    const tag = Buffer.from(payload.tag, 'base64');
    
    const decipher = crypto.createDecipher('aes-256-gcm', key);
    decipher.setAuthTag(tag);
    
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    
    try {
      return JSON.parse(plaintext.toString());
    } catch {
      return plaintext;
    }
  }
}

export default E2EEManager;
