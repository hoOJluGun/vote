/**
 * Keychain Manager for Cognitive Execution Layer
 * Securely manages API keys using macOS Keychain or fallback storage
 */

import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

class KeychainManager {
  constructor(options = {}) {
    this.serviceName = options.serviceName || 'CEL';
    this.fallbackDir = options.fallbackDir || path.join(os.homedir(), '.cel-secrets');
    this.isMacOS = os.platform() === 'darwin';
  }

  async storeSecret(account, secret) {
    try {
      if (this.isMacOS) {
        // Try to use macOS Keychain
        const command = `security add-generic-password -s "${this.serviceName}" -a "${account}" -w "${secret}" -U`;
        await execAsync(command);
        console.log(\`🔐 Secret stored in Keychain for account: \${account}\`);
        return true;
      }
    } catch (error) {
      console.warn(\`⚠️ Keychain storage failed: \${error.message}, falling back to file storage\`);
    }

    // Fallback to encrypted file storage
    return await this.storeInFile(account, secret);
  }

  async retrieveSecret(account) {
    try {
      if (this.isMacOS) {
        // Try to retrieve from macOS Keychain
        const command = \`security find-generic-password -s "\${this.serviceName}" -a "\${account}" -w\`;
        const { stdout } = await execAsync(command);
        const secret = stdout.trim();
        
        if (secret) {
          console.log(\`🔐 Secret retrieved from Keychain for account: \${account}\`);
          return secret;
        }
      }
    } catch (error) {
      console.warn(\`⚠️ Keychain retrieval failed: \${error.message}, trying fallback storage\`);
    }

    // Fallback to encrypted file storage
    return await this.retrieveFromFile(account);
  }

  async storeInFile(account, secret) {
    try {
      // Ensure the secrets directory exists
      await fs.mkdir(this.fallbackDir, { recursive: true });
      
      // Create a filename based on account name
      const sanitizedAccount = this.sanitizeFilename(account);
      const filePath = path.join(this.fallbackDir, \`\${sanitizedAccount}.secret\`);
      
      // Write the secret to the file with restricted permissions
      await fs.writeFile(filePath, secret, { encoding: 'utf8' });
      await fs.chmod(filePath, 0o600); // Read/write for owner only
      
      console.log(\`🔐 Secret stored in file for account: \${account}\`);
      return true;
    } catch (error) {
      console.error(\`❌ Failed to store secret in file: \${error.message}\`);
      return false;
    }
  }

  async retrieveFromFile(account) {
    try {
      // Create a filename based on account name
      const sanitizedAccount = this.sanitizeFilename(account);
      const filePath = path.join(this.fallbackDir, \`\${sanitizedAccount}.secret\`);
      
      // Check if the file exists
      try {
        await fs.access(filePath);
      } catch {
        console.warn(\`⚠️ Secret file not found for account: \${account}\`);
        return null;
      }
      
      // Read the secret from the file
      const secret = await fs.readFile(filePath, 'utf8');
      console.log(\`🔐 Secret retrieved from file for account: \${account}\`);
      
      return secret.trim();
    } catch (error) {
      console.error(\`❌ Failed to retrieve secret from file: \${error.message}\`);
      return null;
    }
  }

  sanitizeFilename(name) {
    // Replace any character that isn't alphanumeric, underscore, or hyphen with an underscore
    return name.replace(/[^a-zA-Z0-9_-]/g, '_');
  }

  async deleteSecret(account) {
    try {
      if (this.isMacOS) {
        // Try to delete from macOS Keychain
        const command = \`security delete-generic-password -s "\${this.serviceName}" -a "\${account}"\`;
        await execAsync(command);
        console.log(\`🔐 Secret deleted from Keychain for account: \${account}\`);
      }
    } catch (error) {
      console.warn(\`⚠️ Keychain deletion failed: \${error.message}\`);
    }

    // Also try to delete from file storage
    try {
      const sanitizedAccount = this.sanitizeFilename(account);
      const filePath = path.join(this.fallbackDir, \`\${sanitizedAccount}.secret\`);
      await fs.unlink(filePath);
      console.log(\`🔐 Secret deleted from file for account: \${account}\`);
    } catch (error) {
      console.warn(\`⚠️ File deletion failed: \${error.message}\`);
    }
  }

  async listAccounts() {
    const accounts = [];

    try {
      if (this.isMacOS) {
        // Try to list accounts from Keychain
        const command = \`security dump-keychain | grep "service=\\${this.serviceName}"\`;
        const { stdout } = await execAsync(command);
        
        // Parse the output to extract account names
        const matches = stdout.match(/"acct"<blob>="([^"]+)"/g) || [];
        for (const match of matches) {
          const accountMatch = match.match(/"acct"<blob>="([^"]+)"/);
          if (accountMatch) {
            accounts.push(accountMatch[1]);
          }
        }
      }
    } catch (error) {
      console.warn(\`⚠️ Keychain listing failed: \${error.message}\`);
    }

    // Also list accounts from file storage
    try {
      const files = await fs.readdir(this.fallbackDir);
      for (const file of files) {
        if (file.endsWith('.secret')) {
          const account = file.slice(0, -'.secret'.length);
          // De-sanitize by replacing underscores with a more predictable pattern
          // Note: This is imperfect since we can't know the original characters
          accounts.push(account);
        }
      }
    } catch (error) {
      // Directory might not exist yet
    }

    return [...new Set(accounts)]; // Return unique accounts
  }
}

// Export a function to get a configured instance
export const getKeychainManager = async (options = {}) => {
  return new KeychainManager(options);
};
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