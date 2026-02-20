/**
 * Example usage of KEK Manager with Vault Transit integration
 * Demonstrates envelope encryption patterns and key management
 */

import { VaultSecretsManager } from '../security/vault-manager.js';
import { KEKManager } from '../security/kek-manager.js';

async function demonstrateKEKIntegration() {
  console.log('🚀 Demonstrating KEK Manager with Vault Transit Integration\n');

  // Example 1: Basic KEK Manager Setup
  console.log('1. Basic KEK Manager Setup');
  console.log('-------------------------');
  
  try {
    // Mock Vault configuration (in real usage, connect to actual Vault)
    const vault = new VaultSecretsManager({
      address: 'https://vault.example.com:8200',
      authMethod: 'token',
      token: 'mock-token-for-demo'
    });

    // Mock successful authentication
    vault.authenticate = jest.fn().mockResolvedValue();
    vault.transitListKeys = jest.fn().mockResolvedValue(['cel-kek']);
    vault.transitReadKey = jest.fn().mockResolvedValue({
      type: 'aes256-gcm96',
      latest_version: 1,
      min_encryption_version: 1,
      keys: { '1': { creation_time: new Date().toISOString() } }
    });

    const kekManager = new KEKManager({
      vaultManager: vault,
      keyName: 'demo-kek',
      autoRotate: false
    });

    await kekManager.initialize();
    console.log('✅ KEK Manager initialized successfully');

    const keyStatus = await kekManager.getKeyStatus();
    console.log(`📊 KEK Status: ${keyStatus.latestVersion} versions, ${keyStatus.keys} active keys`);

  } catch (error) {
    console.log('❌ KEK Manager setup failed:', error.message);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Example 2: Envelope Encryption Demonstration
  console.log('2. Envelope Encryption Demonstration');
  console.log('-----------------------------------');
  
  try {
    // Mock the encryption methods
    const mockVault = {
      authenticate: jest.fn().mockResolvedValue(),
      transitListKeys: jest.fn().mockResolvedValue(['demo-kek']),
      transitReadKey: jest.fn().mockResolvedValue({ keys: { '1': {} } }),
      transitGenerateDataKey: jest.fn()
        .mockResolvedValueOnce({ ciphertext: 'wrapped-dek-123' })
        .mockResolvedValueOnce({ plaintext: 'plaintext-dek-hex' }),
      transitEncrypt: jest.fn().mockResolvedValue('encrypted-sensitive-data-456'),
      transitDecrypt: jest.fn().mockResolvedValue('sensitive data decrypted')
    };

    const vault = new VaultSecretsManager({ address: 'https://vault.demo' });
    Object.assign(vault, mockVault);

    const kekManager = new KEKManager({ vaultManager: vault, keyName: 'demo-kek' });
    await kekManager.initialize();

    // Encrypt sensitive data
    const sensitiveData = 'Social Security Number: 123-45-6789';
    console.log('📄 Original data:', sensitiveData);

    const encryptedResult = await kekManager.encryptWithEnvelope(sensitiveData, 'pii-data');
    console.log('🔒 Encrypted data length:', encryptedResult.encryptedData.length);
    console.log('🔑 Wrapped key length:', encryptedResult.wrappedKey.length);
    console.log('🆔 Key ID:', encryptedResult.keyId);

    // Decrypt the data
    const decryptedData = await kekManager.decryptWithEnvelope(
      encryptedResult.encryptedData,
      encryptedResult.wrappedKey,
      encryptedResult.keyId,
      'pii-data'
    );
    console.log('🔓 Decrypted data:', decryptedData);

  } catch (error) {
    console.log('❌ Envelope encryption demo failed:', error.message);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Example 3: Key Rotation Simulation
  console.log('3. Key Rotation Simulation');
  console.log('--------------------------');
  
  try {
    const mockVault = {
      authenticate: jest.fn().mockResolvedValue(),
      transitListKeys: jest.fn().mockResolvedValue(['rotation-kek']),
      transitReadKey: jest.fn().mockResolvedValue({
        type: 'aes256-gcm96',
        latest_version: 1,
        min_encryption_version: 1,
        keys: { '1': {}, '2': {} }
      }),
      transitRotateKey: jest.fn().mockResolvedValue(),
      transitRewrap: jest.fn().mockImplementation((keyName, ciphertexts) => {
        return Promise.resolve({
          data: {
            rewrap_results: ciphertexts.map(ct => ({ ciphertext: `rewrapped-${ct}` }))
          }
        });
      })
    };

    const vault = new VaultSecretsManager({ address: 'https://vault.rotation' });
    Object.assign(vault, mockVault);

    const kekManager = new KEKManager({ vaultManager: vault, keyName: 'rotation-kek' });
    await kekManager.initialize();

    // Check initial status
    const initialStatus = await kekManager.getKeyStatus();
    console.log(`📊 Initial: Latest v${initialStatus.latestVersion}, Min encryption v${initialStatus.minEncryptionVersion}`);

    // Perform rotation
    await kekManager.rotateKEK();
    console.log('🔄 Key rotation completed');

    // Check status after rotation
    const rotatedStatus = await kekManager.getKeyStatus();
    console.log(`📊 After rotation: Latest v${rotatedStatus.latestVersion}, Min encryption v${rotatedStatus.minEncryptionVersion}`);

    // Rewrap existing data
    const existingData = [
      { ciphertext: 'old-encrypted-1', keyId: 'key-1', purpose: 'user-data' },
      { ciphertext: 'old-encrypted-2', keyId: 'key-2', purpose: 'audit-log' }
    ];

    const rewrappedData = await kekManager.rewrapEncryptedData(existingData);
    console.log(`🔁 Rewrapped ${rewrappedData.length} data items`);
    console.log('   First item now has:', Object.keys(rewrappedData[0]));

  } catch (error) {
    console.log('❌ Key rotation demo failed:', error.message);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Example 4: DEK Management
  console.log('4. Data Encryption Key (DEK) Management');
  console.log('--------------------------------------');
  
  try {
    const mockVault = {
      authenticate: jest.fn().mockResolvedValue(),
      transitListKeys: jest.fn().mockResolvedValue(['dek-demo-kek']),
      transitReadKey: jest.fn().mockResolvedValue({ keys: { '1': {} } }),
      transitGenerateDataKey: jest.fn()
        .mockResolvedValueOnce({ ciphertext: 'wrapped-dek-main' })
        .mockResolvedValueOnce({ plaintext: 'plaintext-dek-main' })
        .mockResolvedValueOnce({ ciphertext: 'wrapped-dek-backup' })
        .mockResolvedValueOnce({ plaintext: 'plaintext-dek-backup' }),
      transitDecrypt: jest.fn().mockResolvedValue('unwrapped-dek-hex-string')
    };

    const vault = new VaultSecretsManager({ address: 'https://vault.dek' });
    Object.assign(vault, mockVault);

    const kekManager = new KEKManager({ vaultManager: vault, keyName: 'dek-demo-kek' });
    await kekManager.initialize();

    // Generate DEK for main database
    const mainDEK = await kekManager.generateWrappedDEK('main-database', 256);
    console.log('🔑 Main DB DEK generated:');
    console.log('   Wrapped key length:', mainDEK.wrappedKey.length);
    console.log('   DEK length:', mainDEK.dek.length);
    console.log('   Purpose:', mainDEK.purpose);

    // Generate DEK for backup system
    const backupDEK = await kekManager.generateWrappedDEK('backup-storage', 256);
    console.log('🔑 Backup DEK generated:');
    console.log('   Wrapped key length:', backupDEK.wrappedKey.length);
    console.log('   Purpose:', backupDEK.purpose);

    // Unwrap a DEK
    const unwrappedDEK = await kekManager.unwrapDEK(mainDEK.wrappedKey, 'main-database');
    console.log('🔓 DEK successfully unwrapped:', unwrappedDEK.length > 0 ? 'Yes' : 'No');

  } catch (error) {
    console.log('❌ DEK management demo failed:', error.message);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Example 5: Key Version Management
  console.log('5. Key Version Management');
  console.log('------------------------');
  
  try {
    const mockVault = {
      authenticate: jest.fn().mockResolvedValue(),
      transitListKeys: jest.fn().mockResolvedValue(['version-kek']),
      transitReadKey: jest.fn().mockResolvedValue({
        type: 'aes256-gcm96',
        latest_version: 3,
        min_decryption_version: 1,
        min_encryption_version: 2,
        keys: {
          '1': { creation_time: '2024-01-01T00:00:00Z', compromised: false },
          '2': { creation_time: '2024-02-01T00:00:00Z', compromised: false },
          '3': { creation_time: '2024-03-01T00:00:00Z', compromised: false }
        }
      })
    };

    const vault = new VaultSecretsManager({ address: 'https://vault.version' });
    Object.assign(vault, mockVault);

    const kekManager = new KEKManager({ vaultManager: vault, keyName: 'version-kek' });
    await kekManager.initialize();

    // Get detailed key information
    const keyStatus = await kekManager.getKeyStatus();
    console.log('📊 Key Status:');
    console.log('   Type:', keyStatus.keyType);
    console.log('   Latest version:', keyStatus.latestVersion);
    console.log('   Min encryption version:', keyStatus.minEncryptionVersion);
    console.log('   Min decryption version:', keyStatus.minDecryptionVersion);
    console.log('   Total key versions:', keyStatus.keys);

    // List all versions with details
    const versions = await kekManager.listKeyVersions();
    console.log('\n📋 Key Versions:');
    versions.forEach(version => {
      const status = version.compromised ? '🔴 COMPROMISED' : '🟢 Active';
      console.log(`   v${version.version} (${status}) - ${version.creationTime}`);
    });

  } catch (error) {
    console.log('❌ Key version management demo failed:', error.message);
  }

  console.log('\n🎉 KEK Manager demonstration complete!');
}

// Utility function to simulate delay
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Run the demonstration
if (import.meta.url === `file://${process.argv[1]}`) {
  demonstrateKEKIntegration().catch(console.error);
}

export { demonstrateKEKIntegration };