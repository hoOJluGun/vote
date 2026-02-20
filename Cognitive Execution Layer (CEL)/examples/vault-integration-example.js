/**
 * Example usage of Vault integration with SecretsManager
 * Demonstrates how to configure and use Vault backend in CEL
 */

import { SecretsManager } from '../security/security-framework.js';
import { getProviderFactory } from '../src/providers/provider-factory.js';

async function demonstrateVaultIntegration() {
  console.log('🚀 Demonstrating Vault Integration with SecretsManager\n');

  // Example 1: Basic Vault configuration using environment variables
  console.log('1. Basic Vault Configuration (using environment variables)');
  console.log('--------------------------------------------------------');
  
  // Set required environment variables (in real usage, these would be set externally)
  process.env.VAULT_ADDR = 'https://vault.example.com:8200';
  process.env.VAULT_AUTH_METHOD = 'token';
  process.env.VAULT_TOKEN = 's.sample-token-12345';
  
  try {
    const vaultManager = new SecretsManager({ backend: 'vault' });
    await vaultManager.initialize();
    
    const health = await vaultManager.healthCheck();
    console.log('✅ Vault connection successful:', health);
    
    // Get API key from Vault
    const apiKey = await vaultManager.getApiKey('openrouter');
    console.log('🔑 Retrieved API key from Vault:', apiKey ? '***REDACTED***' : 'Not found');
    
  } catch (error) {
    console.log('❌ Vault connection failed:', error.message);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Example 2: AppRole authentication
  console.log('2. AppRole Authentication Configuration');
  console.log('-------------------------------------');
  
  try {
    const appRoleManager = new SecretsManager({
      backend: 'vault',
      vaultAddress: 'https://vault.production.com:8200',
      vaultAuthMethod: 'approle',
      vaultRoleId: 'role-id-from-vault',
      vaultSecretId: 'secret-id-from-vault',
      vaultMountPath: 'kv'
    });
    
    await appRoleManager.initialize();
    console.log('✅ AppRole authentication configured successfully');
    
  } catch (error) {
    console.log('❌ AppRole authentication failed:', error.message);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Example 3: Integration with ProviderFactory
  console.log('3. ProviderFactory Integration');
  console.log('------------------------------');
  
  try {
    // Configure ProviderFactory to use Vault
    const config = {
      secretsManager: new SecretsManager({ backend: 'vault' }),
      openrouter: {
        baseUrl: 'https://openrouter.ai/api/v1'
        // API key will be automatically retrieved from Vault
      },
      ollama: {
        baseUrl: 'http://localhost:11434'
      }
    };
    
    const factory = await getProviderFactory(config);
    console.log('✅ ProviderFactory initialized with Vault integration');
    
    // The factory will automatically retrieve API keys from Vault
    const models = await factory.listAllModels();
    console.log(`📋 Available models: ${models.length}`);
    
  } catch (error) {
    console.log('❌ ProviderFactory initialization failed:', error.message);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Example 4: Arbitrary secret management
  console.log('4. Arbitrary Secret Management');
  console.log('----------------------------');
  
  try {
    const vaultManager = new SecretsManager({ backend: 'vault' });
    await vaultManager.initialize();
    
    // Store a custom secret
    await vaultManager.setSecret('database/connection_string', 'postgresql://user:pass@host:5432/db');
    console.log('✅ Custom secret stored in Vault');
    
    // Retrieve the secret
    const connectionString = await vaultManager.getSecret('database/connection_string');
    console.log('🔑 Retrieved connection string:', connectionString ? '***REDACTED***' : 'Not found');
    
  } catch (error) {
    console.log('❌ Secret management failed:', error.message);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Example 5: Fallback behavior demonstration
  console.log('5. Fallback Behavior (Environment Variables)');
  console.log('-------------------------------------------');
  
  // Clear Vault-related env vars to simulate Vault unavailability
  delete process.env.VAULT_ADDR;
  delete process.env.VAULT_TOKEN;
  
  // Set environment variable as fallback
  process.env.OPENROUTER_API_KEY = 'env-fallback-key-67890';
  
  try {
    const fallbackManager = new SecretsManager({ backend: 'vault' });
    await fallbackManager.initialize();
    
    const apiKey = await fallbackManager.getApiKey('openrouter');
    console.log('🔑 API key retrieved via fallback:', apiKey ? '***REDACTED***' : 'Not found');
    
  } catch (error) {
    console.log('❌ Even fallback failed:', error.message);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Example 6: Cache management
  console.log('6. Cache Management');
  console.log('------------------');
  
  try {
    const manager = new SecretsManager({ backend: 'vault' });
    await manager.initialize();
    
    // First access (hits Vault)
    await manager.getApiKey('test-provider');
    console.log('✅ First access - Vault called');
    
    // Second access (uses cache)
    await manager.getApiKey('test-provider');
    console.log('✅ Second access - Cache used');
    
    // Clear cache
    manager.clearCache();
    console.log('🧹 Cache cleared');
    
  } catch (error) {
    console.log('❌ Cache management failed:', error.message);
  }

  console.log('\n🎉 Vault integration demonstration complete!');
}

// Run the demonstration
if (import.meta.url === `file://${process.argv[1]}`) {
  demonstrateVaultIntegration().catch(console.error);
}

export { demonstrateVaultIntegration };