# End-to-End Encryption Documentation

## Overview

The CEL project implements comprehensive end-to-end encryption (E2EE) using envelope encryption with AES-256-GCM and HashiCorp Vault Transit for key management. This provides enterprise-grade security with proper key separation and rotation capabilities.

## Architecture

### Envelope Encryption Pattern

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Plaintext     │───▶│   DEK (AES-256) │───▶│  Ciphertext     │
│                 │    │                  │    │                 │
│                 │    │                  │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌──────────────────┐
                       │  KEK (Vault)   │
                       │   Transit       │
                       └──────────────────┘
```

- **DEK (Data Encryption Key)**: Random 256-bit key for each encryption operation
- **KEK (Key Encryption Key)**: Managed by Vault Transit for wrapping DEKs
- **Envelope**: Contains ciphertext + wrapped DEK + metadata

## Features

### 🔐 Encryption
- **AES-256-GCM**: Authenticated encryption with 96-bit IV and 128-bit tag
- **Random DEK**: Unique 256-bit key for each encryption operation
- **Additional Authenticated Data (AAD)**: Optional context binding
- **Metadata**: Creator, timestamp, key version, and custom context

### 🔑 Key Management
- **Vault Transit**: Centralized key wrapping/unwrapping
- **Key Versioning**: Automatic version tracking and rotation support
- **Key Separation**: DEKs never stored in plaintext
- **Zeroization**: Secure memory cleanup after use

### 🔄 Operations
- **Batch Processing**: Efficient bulk encryption/decryption
- **Key Rotation**: Seamless KEK rotation with payload re-encryption
- **Integrity Validation**: Payload structure and authentication verification
- **Fallback Support**: Server-side unwrapping when Vault unavailable

## Quick Start

### Installation

```typescript
import { E2EEManager } from './src/services/E2EEManager';
import { VaultSecretsManager } from './src/services/VaultSecretsManager';
```

### Basic Usage

```typescript
// Initialize Vault manager
const vaultManager = new VaultSecretsManager({
  address: 'https://vault.example.com',
  authMethod: 'approle',
  roleId: process.env.VAULT_ROLE_ID,
  secretId: process.env.VAULT_SECRET_ID
});

await vaultManager.authenticate();

// Initialize E2EE manager
const e2eeManager = new E2EEManager(vaultManager, 'transit-key');

// Encrypt data
const plaintext = { username: 'alice', permissions: ['read', 'write'] };
const encrypted = await e2eeManager.clientEncrypt(plaintext, {
  createdBy: 'user-service',
  context: 'user-creation'
});

// Decrypt data
const decrypted = await e2eeManager.clientDecrypt(encrypted);
console.log(decrypted); // { username: 'alice', permissions: ['read', 'write'] }
```

## API Reference

### Encryption

#### `clientEncrypt(data, options?)`
Encrypt data using envelope encryption.

```typescript
const encrypted = await e2eeManager.clientEncrypt(data, {
  kekId: 'custom-transit-key',    // Override default KEK
  aad: 'additional-context',        // Additional authenticated data
  context: 'operation-context',      // Encryption context
  createdBy: 'service-name'          // Creator identifier
});
```

**Parameters:**
- `data`: Buffer or object to encrypt
- `options.kekId`: Optional Key Encryption Key ID
- `options.aad`: Optional Additional Authenticated Data
- `options.context`: Optional encryption context
- `options.createdBy`: Optional creator identifier

**Returns:** `EncryptedPayload` object

### Decryption

#### `clientDecrypt(payload, options?)`
Decrypt encrypted payload.

```typescript
const decrypted = await e2eeManager.clientDecrypt(encrypted, {
  unwrapVia: 'vault',              // 'vault' or 'server'
  kekId: 'specific-key'            // Override KEK for unwrapping
});
```

**Parameters:**
- `payload`: EncryptedPayload object
- `options.unwrapVia`: Unwrapping method ('vault' or 'server')
- `options.kekId`: Override KEK for unwrapping

**Returns:** Decrypted Buffer or object

### Key Rotation

#### `rotateKEK(oldKekId, newKekId)`
Rotate from old key to new key.

```typescript
const result = await e2eeManager.rotateKEK('old-key', 'new-key');
console.log(`Rewrapped ${result.rewrappedCount} payloads`);
console.log(`Failed: ${result.failedCount}`);
```

**Returns:** `KeyRotationResult` with statistics

### Batch Operations

#### `batchDecrypt(payloads, options?)`
Decrypt multiple payloads efficiently.

```typescript
const results = await e2eeManager.batchDecrypt([
  { id: 'payload1', payload: encrypted1 },
  { id: 'payload2', payload: encrypted2 }
]);
```

**Returns:** Array with success/error results

### Validation

#### `validatePayload(payload)`
Validate encrypted payload structure.

```typescript
const isValid = e2eeManager.validatePayload(payload);
if (!isValid) {
  throw new Error('Invalid payload structure');
}
```

#### `integrityCheck(payloadId)`
Perform integrity check on stored payload.

```typescript
const check = await e2eeManager.integrityCheck('payload-123');
if (!check.valid) {
  console.error('Integrity issues:', check.errors);
}
```

## Encrypted Payload Format

```typescript
interface EncryptedPayload {
  v: number;                    // Version (currently 1)
  alg: string;                   // Algorithm ("aes-256-gcm")
  iv: string;                    // IV (base64)
  ct: string;                    // Ciphertext (base64)
  tag: string;                   // Authentication tag (base64)
  dek_wrapped: string;           // Wrapped DEK (base64)
  dek_kid: string;              // DEK key ID
  meta: {                        // Metadata
    createdBy: string;            // Creator identifier
    timestamp: string;            // ISO timestamp
    keyVersion?: string;          // Key version
    context?: string;             // Encryption context
  };
}
```

## Security Considerations

### 1. Memory Security
```typescript
// ✅ Automatic zeroization
const encrypted = await e2eeManager.clientEncrypt(sensitiveData);
// DEK is automatically zeroized from memory

// ❌ Manual memory management (not needed)
const dek = crypto.randomBytes(32);
// ... use DEK
dek.fill(0); // E2EEManager handles this automatically
```

### 2. Key Separation
```typescript
// ✅ Proper key separation
// DEKs are never stored, only wrapped DEKs
// KEKs are managed by Vault Transit

// ❌ Never store DEKs
fs.writeFileSync('dek.key', dek); // NEVER DO THIS
```

### 3. Context Binding
```typescript
// ✅ Use AAD for context binding
const encrypted = await e2eeManager.clientEncrypt(data, {
  aad: `${userId}:${operation}:${timestamp}`,
  context: 'user-data-access'
});

// This prevents replay attacks and provides audit trail
```

### 4. Key Rotation
```typescript
// ✅ Regular key rotation
setInterval(async () => {
  const oldKey = `transit-key-v${currentVersion}`;
  const newKey = `transit-key-v${currentVersion + 1}`;
  
  const result = await e2eeManager.rotateKEK(oldKey, newKey);
  
  if (result.failedCount > 0) {
    console.error('Key rotation failures:', result.errors);
  }
}, 30 * 24 * 60 * 60 * 1000); // Every 30 days
```

## Testing

### Unit Tests
```bash
npm test -- src/services/__tests__/E2EEManager.test.ts
```

### Test Utilities
```typescript
import { E2EEManager } from './src/services/E2EEManager';

// Generate test key for development
const testKey = E2EEManager.generateTestKey();

// Encrypt/decrypt without Vault (for testing)
const encrypted = E2EEManager.encryptWithTestKey(data, testKey);
const decrypted = E2EEManager.decryptWithTestKey(encrypted, testKey);
```

## Performance Considerations

### 1. Batch Operations
```typescript
// ✅ Use batch for multiple payloads
const results = await e2eeManager.batchDecrypt(payloads);

// ❌ Avoid sequential operations
for (const payload of payloads) {
  await e2eeManager.clientDecrypt(payload); // Slower
}
```

### 2. Caching
```typescript
// ✅ Cache Vault responses when appropriate
const vaultCache = new Map();
// Implement caching strategy for frequently accessed keys
```

### 3. Payload Size
```typescript
// ✅ Consider payload size limits
if (plaintext.length > 10 * 1024 * 1024) { // 10MB
  throw new Error('Payload too large for E2EE');
}
```

## Error Handling

### Common Error Scenarios

```typescript
try {
  const decrypted = await e2eeManager.clientDecrypt(payload);
} catch (error) {
  if (error.message.includes('Unsupported payload version')) {
    // Handle version mismatch
    console.error('Payload version not supported');
  } else if (error.message.includes('Decryption failed')) {
    // Handle decryption failure
    console.error('Decryption failed - possible tampering');
  } else if (error.message.includes('Vault error')) {
    // Handle Vault unavailability
    console.error('Vault unavailable - using fallback');
  }
}
```

### Recovery Strategies

```typescript
// Fallback to server-side unwrapping
try {
  const decrypted = await e2eeManager.clientDecrypt(payload, {
    unwrapVia: 'vault'
  });
} catch (vaultError) {
  try {
    const decrypted = await e2eeManager.clientDecrypt(payload, {
      unwrapVia: 'server'
    });
  } catch (serverError) {
    // Both methods failed
    throw new Error('All decryption methods failed');
  }
}
```

## Monitoring and Auditing

### Metrics to Track
- Encryption/decryption operation counts
- Key rotation success/failure rates
- Payload size distribution
- Error rates by type
- Performance metrics (latency, throughput)

### Audit Logging
```typescript
// Log encryption operations (without sensitive data)
console.log(JSON.stringify({
  operation: 'encrypt',
  payloadId: encrypted.meta.timestamp,
  createdBy: encrypted.meta.createdBy,
  keyId: encrypted.dek_kid,
  size: plaintext.length,
  timestamp: new Date().toISOString()
}));
```

## Integration Examples

### Database Encryption
```typescript
// Encrypt before storing
const userData = { email: 'user@example.com', preferences: {...} };
const encrypted = await e2eeManager.clientEncrypt(userData);
await db.users.insert({ 
  id: userId, 
  encryptedData: JSON.stringify(encrypted) 
});

// Decrypt after retrieval
const record = await db.users.findById(userId);
const encryptedData = JSON.parse(record.encryptedData);
const userData = await e2eeManager.clientDecrypt(encryptedData);
```

### API Communication
```typescript
// Encrypt API payload
const apiPayload = { sensitiveData: '...' };
const encrypted = await e2eeManager.clientEncrypt(apiPayload);

await fetch('/api/secure-endpoint', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ encrypted })
});
```

### File Storage
```typescript
// Encrypt file contents
const fileContent = fs.readFileSync('sensitive-file.txt');
const encrypted = await e2eeManager.clientEncrypt(fileContent);
fs.writeFileSync('sensitive-file.enc', JSON.stringify(encrypted));
```

## Troubleshooting

### Common Issues

#### 1. Vault Connection Issues
```typescript
// Check Vault health
const health = await vaultManager.healthCheck();
if (!health.healthy) {
  console.error('Vault is not healthy:', health);
  // Implement fallback or retry logic
}
```

#### 2. Key Version Mismatches
```typescript
// Verify key exists in Vault
try {
  await vaultManager.transitEncrypt(keyId, Buffer.from('test'));
} catch (error) {
  console.error(`Key ${keyId} not found in Vault`);
}
```

#### 3. Payload Corruption
```typescript
// Validate payload before decryption
if (!e2eeManager.validatePayload(payload)) {
  throw new Error('Invalid payload structure');
}
```

### Debug Mode
```typescript
// Enable debug logging
process.env.DEBUG = 'e2ee:*';

// This will provide detailed logging without exposing secrets
```

## Best Practices

### 1. Key Management
- Use separate KEKs for different data types
- Rotate keys regularly (30-90 days)
- Monitor key usage and access patterns
- Implement proper access controls in Vault

### 2. Payload Design
- Include relevant context in metadata
- Use AAD for additional security
- Keep payloads reasonably sized
- Validate payload structure before use

### 3. Error Handling
- Implement proper fallback mechanisms
- Log errors without exposing sensitive data
- Monitor error rates and patterns
- Provide meaningful error messages to users

### 4. Performance
- Use batch operations when possible
- Implement appropriate caching strategies
- Monitor and optimize for your use case
- Consider payload size limits

## Security Checklist

- [ ] Vault Transit keys are properly configured
- [ ] Key rotation schedule is established
- [ ] Access controls are implemented in Vault
- [ ] Payload validation is enabled
- [ ] Error handling doesn't expose secrets
- [ ] Audit logging is configured
- [ ] Memory zeroization is verified
- [ ] Backup and recovery procedures exist
- [ ] Performance testing is completed
- [ ] Security testing is performed

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review Vault documentation: https://www.vaultproject.io/docs/secrets/transit
3. Create an issue in the project repository
