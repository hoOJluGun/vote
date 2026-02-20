# KEK Manager and Vault Transit Integration Guide

## Overview
The KEK (Key Encryption Key) Manager provides enterprise-grade encryption key management using HashiCorp Vault Transit secrets engine. It implements envelope encryption patterns for secure data protection.

## Key Features

### 🔐 Envelope Encryption
- **KEK (Key Encryption Key)**: Master key stored in Vault Transit
- **DEK (Data Encryption Key)**: Per-data keys wrapped by KEK
- **Automatic key rotation** with seamless migration
- **Context-aware encryption** for enhanced security

### 🔄 Key Lifecycle Management
- **Automatic key generation** with configurable parameters
- **Key versioning** and rotation policies
- **Bulk rewrap operations** for key migrations
- **Compromised key detection** and isolation

### 🛡️ Security Features
- **Zero-trust architecture** with Vault as root of trust
- **Audit logging** built into Vault
- **Hardware Security Module (HSM)** integration support
- **Export prevention** for production keys

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Application   │───▶│   KEK Manager    │───▶│  Vault Transit  │
│     Data        │    │  (Envelope Encr) │    │    Engine       │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │   Local Cache    │
                    │  (Performance)   │
                    └──────────────────┘
```

## Quick Start

### 1. Basic Setup
```javascript
import { VaultSecretsManager } from './security/vault-manager.js';
import { KEKManager } from './security/kek-manager.js';

// Initialize Vault connection
const vault = new VaultSecretsManager({
  address: process.env.VAULT_ADDR,
  authMethod: 'approle',
  roleId: process.env.VAULT_ROLE_ID,
  secretId: process.env.VAULT_SECRET_ID
});

await vault.authenticate();

// Initialize KEK Manager
const kekManager = new KEKManager({
  vaultManager: vault,
  keyName: 'cel-production-kek',
  autoRotate: true,
  rotationPeriod: 86400 // 24 hours
});

await kekManager.initialize();
```

### 2. Encrypt Data
```javascript
// Encrypt sensitive data
const sensitiveData = 'user financial records';
const encryptedResult = await kekManager.encryptWithEnvelope(
  sensitiveData, 
  'financial-data'
);

console.log('Encrypted:', encryptedResult.encryptedData);
console.log('Wrapped Key:', encryptedResult.wrappedKey);
```

### 3. Decrypt Data
```javascript
// Decrypt using the same wrapped key
const decryptedData = await kekManager.decryptWithEnvelope(
  encryptedResult.encryptedData,
  encryptedResult.wrappedKey,
  encryptedResult.keyId,
  'financial-data'
);

console.log('Decrypted:', decryptedData);
```

## Advanced Usage

### Key Rotation
```javascript
// Manual key rotation
await kekManager.rotateKEK();

// Automatic rotation is handled by Vault based on configuration
```

### Bulk Data Rewrapping
```javascript
// When KEK is rotated, rewrap existing encrypted data
const encryptedRecords = [
  { ciphertext: '...', keyId: '...', purpose: 'user-data' },
  { ciphertext: '...', keyId: '...', purpose: 'audit-log' }
];

const rewrappedRecords = await kekManager.rewrapEncryptedData(encryptedRecords);
```

### Key Status Monitoring
```javascript
// Get detailed key information
const keyStatus = await kekManager.getKeyStatus();
console.log('Latest Version:', keyStatus.latestVersion);
console.log('Active Keys:', keyStatus.keys);

// List all key versions
const versions = await kekManager.listKeyVersions();
versions.forEach(version => {
  console.log(`Version ${version.version}: ${version.creationTime}`);
});
```

## Configuration Options

### KEKManager Constructor Options
```javascript
const kekManager = new KEKManager({
  vaultManager: vaultInstance,
  keyName: 'my-kek',           // Default: 'cel-kek'
  keyType: 'aes256-gcm96',     // Encryption algorithm
  autoRotate: true,            // Enable auto-rotation
  rotationPeriod: 86400,       // Rotation interval in seconds
  context: 'my-app-context'    // Context for key derivation
});
```

### Supported Key Types
- `aes256-gcm96` (default) - AES-256 with GCM mode
- `chacha20-poly1305` - ChaCha20 with Poly1305 AEAD
- `rsa-2048`, `rsa-4096` - RSA keys for asymmetric encryption

## Security Best Practices

### 1. Key Isolation
```javascript
// Use different KEKs for different data sensitivity levels
const financialKEK = new KEKManager({
  vaultManager: vault,
  keyName: 'financial-data-kek'
});

const auditKEK = new KEKManager({
  vaultManager: vault,
  keyName: 'audit-log-kek'
});
```

### 2. Context-Based Encryption
```javascript
// Include tenant/user context in encryption
const tenantContext = `tenant-${tenantId}`;
const encrypted = await kekManager.encryptWithEnvelope(
  userData,
  `${tenantContext}:user-profile`
);
```

### 3. Key Compromise Response
```javascript
// When key compromise is suspected
const compromisedKeyId = 'compromised-key-id';

// 1. Mark key as compromised in Vault
// 2. Generate new KEK
await kekManager.rotateKEK();

// 3. Rewrap all affected data
const rewrappedData = await kekManager.rewrapEncryptedData(affectedRecords);
```

## Performance Optimization

### Caching Strategy
```javascript
// KEK Manager includes built-in caching
kekManager.clearCache(); // Clear when needed

// For high-throughput applications, consider:
// - Longer-lived DEKs for batch operations
// - Connection pooling for Vault
// - Asynchronous key generation
```

### Batch Operations
```javascript
// Process multiple items efficiently
const batchResults = await Promise.all(
  dataArray.map(async (data) => {
    return await kekManager.encryptWithEnvelope(data, 'batch-processing');
  })
);
```

## Monitoring and Alerting

### Health Checks
```javascript
// Regular health monitoring
setInterval(async () => {
  try {
    const status = await kekManager.getKeyStatus();
    if (status.latestVersion !== status.minEncryptionVersion) {
      console.warn('Key rotation recommended');
    }
  } catch (error) {
    console.error('KEK health check failed:', error.message);
    // Trigger alert
  }
}, 300000); // Every 5 minutes
```

### Audit Logging
```javascript
// All Vault operations are automatically logged
// Monitor Vault audit logs for:
// - Key generation events
// - Encryption/decryption operations
// - Key rotation activities
// - Access pattern anomalies
```

## Troubleshooting

### Common Issues

1. **Vault Connectivity**
   ```bash
   # Test Vault connectivity
   curl $VAULT_ADDR/v1/sys/health
   
   # Check Transit engine status
   vault status
   vault secrets list
   ```

2. **Permission Errors**
   ```bash
   # Verify Vault policies
   vault policy read transit-policy
   
   # Test with Vault CLI
   vault login -method=approle role_id=$ROLE_ID secret_id=$SECRET_ID
   vault write transit/encrypt/my-key plaintext=$(base64 <<< "test")
   ```

3. **Key Rotation Issues**
   ```javascript
   // Check current key status
   const status = await kekManager.getKeyStatus();
   console.log('Min encryption version:', status.minEncryptionVersion);
   console.log('Latest version:', status.latestVersion);
   ```

## Integration Examples

### Database Encryption
```javascript
class SecureDatabase {
  constructor(kekManager) {
    this.kek = kekManager;
  }
  
  async storeSensitiveRecord(record) {
    const encrypted = await this.kek.encryptWithEnvelope(
      JSON.stringify(record),
      'database-record'
    );
    
    // Store encrypted.data and wrappedKey separately
    await this.saveToDatabase({
      data: encrypted.encryptedData,
      key_ref: encrypted.wrappedKey,
      key_id: encrypted.keyId
    });
  }
  
  async retrieveSensitiveRecord(id) {
    const record = await this.loadFromDatabase(id);
    
    const decrypted = await this.kek.decryptWithEnvelope(
      record.data,
      record.key_ref,
      record.key_id,
      'database-record'
    );
    
    return JSON.parse(decrypted);
  }
}
```

### File Encryption
```javascript
async function encryptFile(filePath, kekManager) {
  const fileContent = await fs.promises.readFile(filePath);
  
  const encrypted = await kekManager.encryptWithEnvelope(
    fileContent,
    `file:${path.basename(filePath)}`
  );
  
  await fs.promises.writeFile(`${filePath}.encrypted`, encrypted.encryptedData);
  await fs.promises.writeFile(`${filePath}.key`, encrypted.wrappedKey);
  
  return encrypted.keyId;
}
```

This integration provides production-ready encryption capabilities with enterprise security features and seamless Vault integration.