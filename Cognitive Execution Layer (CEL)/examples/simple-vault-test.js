// Simple test script for Vault integration
const { SecretsManager } = require('../security/security-framework.js');

async function testVaultIntegration() {
  console.log('Testing Vault integration...\n');
  
  // Test environment variable configuration
  process.env.VAULT_ADDR = 'https://vault.example.com:8200';
  process.env.VAULT_AUTH_METHOD = 'token';
  process.env.VAULT_TOKEN = 'test-token';
  
  try {
    const manager = new SecretsManager({ backend: 'vault' });
    console.log('✅ SecretsManager created with Vault backend');
    
    // This will fail because Vault isn't running, but we can test the configuration
    await manager.initialize();
    console.log('✅ Initialization attempted');
    
  } catch (error) {
    console.log('Expected error (Vault not available):', error.message);
  }
  
  console.log('\n✅ Vault integration test completed');
}

testVaultIntegration().catch(console.error);