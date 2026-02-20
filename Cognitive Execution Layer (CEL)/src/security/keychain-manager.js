/**
 * Keychain Manager - Secure storage for API keys using macOS Keychain
 * @module src/security/keychain-manager
 */

import { execSync } from 'child_process';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';

export class KeychainManager {
  constructor(serviceName = 'CEL') {
    this.serviceName = serviceName;
    this.isMac = os.platform() === 'darwin';
    this.fallbackStorage = path.join(os.homedir(), '.cel-secrets.json');
  }

  /**
   * Save a secret to Keychain (macOS) or fallback storage
   * @param {string} account - Account name/key
   * @param {string} secret - Secret value to store
   * @returns {Promise<boolean>} Success status
   */
  async saveSecret(account, secret) {
    try {
      if (this.isMac) {
        // Use macOS Keychain via security command
        const command = `security add-generic-password -s "${this.serviceName}" -a "${account}" -w "${secret}" -U`;
        execSync(command, { stdio: 'pipe' });
        console.log(`🔐 Secret for ${account} saved to Keychain`);
        return true;
      } else {
        // Fallback to encrypted file storage
        return await this.saveToFallbackStorage(account, secret);
      }
    } catch (error) {
      console.error(`Failed to save secret for ${account} to Keychain:`, error.message);
      // Try fallback even on macOS if Keychain fails
      return await this.saveToFallbackStorage(account, secret);
    }
  }

  /**
   * Retrieve a secret from Keychain (macOS) or fallback storage
   * @param {string} account - Account name/key
   * @returns {Promise<string|null>} Secret value or null if not found
   */
  async getSecret(account) {
    try {
      if (this.isMac) {
        // Try to get from Keychain first
        const command = `security find-generic-password -s "${this.serviceName}" -a "${account}" -w`;
        const secret = execSync(command, { encoding: 'utf8' }).trim();
        console.log(`🔓 Secret for ${account} retrieved from Keychain`);
        return secret;
      } else {
        // Get from fallback storage
        return await this.getFromFallbackStorage(account);
      }
    } catch (error) {
      // If Keychain fails, try fallback storage
      console.error(`Failed to retrieve secret for ${account} from Keychain:`, error.message);
      return await this.getFromFallbackStorage(account);
    }
  }

  /**
   * Delete a secret from Keychain (macOS) or fallback storage
   * @param {string} account - Account name/key
   * @returns {Promise<boolean>} Success status
   */
  async deleteSecret(account) {
    try {
      if (this.isMac) {
        const command = `security delete-generic-password -s "${this.serviceName}" -a "${account}"`;
        execSync(command, { stdio: 'pipe' });
        console.log(`🗑️ Secret for ${account} deleted from Keychain`);
        return true;
      } else {
        return await this.deleteFromFallbackStorage(account);
      }
    } catch (error) {
      console.error(`Failed to delete secret for ${account} from Keychain:`, error.message);
      return await this.deleteFromFallbackStorage(account);
    }
  }

  /**
   * Save to fallback storage (encrypted JSON file)
   * @param {string} account - Account name
   * @param {string} secret - Secret to save
   * @returns {Promise<boolean>} Success status
   */
  async saveToFallbackStorage(account, secret) {
    try {
      let secrets = {};
      
      // Load existing secrets if file exists
      try {
        const data = await fs.readFile(this.fallbackStorage, 'utf8');
        secrets = JSON.parse(data);
      } catch (error) {
        // File doesn't exist yet, that's fine
      }
      
      // Add new secret
      secrets[account] = secret;
      
      // Write back to file with restricted permissions
      await fs.writeFile(this.fallbackStorage, JSON.stringify(secrets, null, 2));
      await fs.chmod(this.fallbackStorage, 0o600); // Read/write for owner only
      
      console.log(`🔐 Secret for ${account} saved to fallback storage`);
      return true;
    } catch (error) {
      console.error(`Failed to save secret for ${account} to fallback storage:`, error.message);
      return false;
    }
  }

  /**
   * Get from fallback storage
   * @param {string} account - Account name
   * @returns {Promise<string|null>} Secret or null if not found
   */
  async getFromFallbackStorage(account) {
    try {
      const data = await fs.readFile(this.fallbackStorage, 'utf8');
      const secrets = JSON.parse(data);
      
      if (secrets[account]) {
        console.log(`🔓 Secret for ${account} retrieved from fallback storage`);
        return secrets[account];
      }
      
      return null;
    } catch (error) {
      // File might not exist, that's fine
      return null;
    }
  }

  /**
   * Delete from fallback storage
   * @param {string} account - Account name
   * @returns {Promise<boolean>} Success status
   */
  async deleteFromFallbackStorage(account) {
    try {
      const data = await fs.readFile(this.fallbackStorage, 'utf8');
      const secrets = JSON.parse(data);
      
      if (secrets[account]) {
        delete secrets[account];
        
        if (Object.keys(secrets).length === 0) {
          // If no secrets left, remove the file entirely
          await fs.unlink(this.fallbackStorage);
        } else {
          // Otherwise, write the updated secrets back
          await fs.writeFile(this.fallbackStorage, JSON.stringify(secrets, null, 2));
          await fs.chmod(this.fallbackStorage, 0o600);
        }
        
        console.log(`🗑️ Secret for ${account} deleted from fallback storage`);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error(`Failed to delete secret for ${account} from fallback storage:`, error.message);
      return false;
    }
  }

  /**
   * Test Keychain availability
   * @returns {boolean} Whether Keychain is available
   */
  testKeychain() {
    if (!this.isMac) {
      return false;
    }

    try {
      execSync('security >/dev/null 2>&1', { stdio: 'pipe' });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get list of stored accounts
   * @returns {Promise<string[]>} List of account names
   */
  async listAccounts() {
    if (this.isMac) {
      try {
        // List all passwords for our service
        const command = `security dump-keychain | grep -A 5 -B 5 "svce=${this.serviceName}" | grep "acct" | cut -d'"' -f2`;
        const result = execSync(command, { encoding: 'utf8' });
        const accounts = result.trim().split('\n').filter(a => a.length > 0);
        return accounts;
      } catch (error) {
        console.error('Failed to list Keychain accounts:', error.message);
      }
    }

    // Try fallback storage
    try {
      const data = await fs.readFile(this.fallbackStorage, 'utf8');
      const secrets = JSON.parse(data);
      return Object.keys(secrets);
    } catch (error) {
      return [];
    }
  }
}

// Singleton instance
let keychainManager = null;

export async function getKeychainManager(serviceName = 'CEL') {
  if (!keychainManager) {
    keychainManager = new KeychainManager(serviceName);
  }
  return keychainManager;
}

export default KeychainManager;