# Vault Integration Documentation

## Overview

The CEL project now includes comprehensive HashiCorp Vault integration for secure secrets management. This implementation provides enterprise-grade security with circuit breaker patterns, caching, and robust error handling.

## Features

### 🔐 Authentication Methods
- **AppRole**: Role-based authentication with Role ID and Secret ID
- **Token**: Direct token authentication with automatic renewal
- **Kubernetes**: Service account-based authentication for Kubernetes environments

### 🛡️ Security Features
- **Circuit Breaker**: Prevents cascade failures with automatic recovery
- **Request Caching**: LRU cache for metadata (never caches plaintext secrets)
- **Retry Logic**: Exponential backoff with jitter for resilience
- **Token Renewal**: Automatic token renewal before expiration
- **Audit Logging**: Complete audit trail for all operations

### 🔄 Transit Encryption
- **Envelope Encryption**: AES-256-GCM with Vault Transit for key wrapping
- **Key Management**: Centralized key management through Vault
- **Context Binding**: Cryptographic context for additional security
- **Version Support**: Key versioning and rotation support

## Quick Start

### Installation

```bash
npm install @hashicorp/vault-node axios
```

### Basic Configuration

```typescript
import { VaultSecretsManager } from './src/services/VaultSecretsManager';

const vaultManager = new VaultSecretsManager({
  address: 'https://vault.example.com',
  authMethod: 'approle',
  roleId: process.env.VAULT_ROLE_ID,
  secretId: process.env.VAULT_SECRET_ID,
  mountPath: 'secret',
  timeoutMs: 30000,
  retryAttempts: 3
});

// Authenticate
await vaultManager.authenticate();

// Get a secret
const secret = await vaultManager.getSecret('app/database');

// Store a secret
await vaultManager.setSecret('app/api-key', {
  key: 'your-api-key',
  environment: 'production'
});
```

## Configuration Options

### VaultConfig Interface

```typescript
interface VaultConfig {
  address: string;                    // Vault server URL
  authMethod: 'approle' | 'token' | 'kubernetes';
  roleId?: string;                    // AppRole Role ID
  secretId?: string;                  // AppRole Secret ID
  token?: string;                     // Direct token
  mountPath?: string;                 // KV mount path (default: 'secret')
  namespace?: string;                 // Vault namespace
  timeoutMs?: number;                // Request timeout (default: 30000)
  retryAttempts?: number;             // Retry attempts (default: 3)
  retryDelayMs?: number;              // Base retry delay (default: 1000)
}
```

## API Reference

### Authentication

#### `authenticate(): Promise<void>`
Authenticate with Vault using the configured method.

```typescript
await vaultManager.authenticate();
```

#### `renewToken(): Promise<void>`
Renew the current authentication token.

```typescript
await vaultManager.renewToken();
```

### Secret Management

#### `getSecret(path: string, options?: { version?: number }): Promise<Record<string, any> | null>`
Retrieve a secret from Vault KV v2 store.

```typescript
// Get latest version
const secret = await vaultManager.getSecret('app/database');

// Get specific version
const oldSecret = await vaultManager.getSecret('app/database', { version: 2 });
```

#### `setSecret(path: string, value: Record<string, any>): Promise<void>`
Store a secret in Vault KV v2 store.

```typescript
await vaultManager.setSecret('app/database', {
  host: 'db.example.com',
  username: 'app_user',
  password: 'secure_password'
});
```

#### `listSecrets(prefix: string): Promise<string[]>`
List secrets at a given path.

```typescript
const secrets = await vaultManager.listSecrets('app/');
// Returns: ['database', 'api-keys', 'cache']
```

### Transit Encryption

#### `transitEncrypt(keyName: string, plaintext: Buffer): Promise<string>`
Encrypt data using Vault Transit engine.

```typescript
const plaintext = Buffer.from('secret data');
const ciphertext = await vaultManager.transitEncrypt('transit-key', plaintext);
// Returns: 'vault:v1:encrypted-data'
```

#### `transitDecrypt(keyName: string, ciphertext: string): Promise<Buffer>`
Decrypt data using Vault Transit engine.

```typescript
const ciphertext = 'vault:v1:encrypted-data';
const plaintext = await vaultManager.transitDecrypt('transit-key', ciphertext);
// Returns: Buffer<secret data>
```

### Health and Monitoring

#### `healthCheck(): Promise<HealthStatus>`
Check Vault health status.

```typescript
const health = await vaultManager.healthCheck();
console.log(health);
// {
//   healthy: true,
//   version: '1.12.0',
//   reachable: true,
//   initialized: true,
//   sealed: false,
//   standby: false
// }
```

#### `getCacheStats(): CacheStats`
Get cache statistics.

```typescript
const stats = vaultManager.getCacheStats();
console.log(stats);
// {
//   size: 5,
//   entries: [
//     { key: 'secret:app/database:latest', age: 120000, ttl: 300000 }
//   ]
// }
```

#### `getCircuitBreakerStatus(): CircuitBreakerStatus`
Get circuit breaker status.

```typescript
const status = vaultManager.getCircuitBreakerStatus();
console.log(status);
// {
//   isOpen: false,
//   failureCount: 0,
//   lastFailureTime: 0,
//   nextRetryTime: 0
// }
```

## Event System

The VaultSecretsManager emits events for monitoring and debugging:

```typescript
vaultManager.on('authenticated', (data) => {
  console.log('Authenticated with method:', data.method);
});

vaultManager.on('secretRetrieved', (data) => {
  console.log('Secret retrieved:', data.path);
});

vaultManager.on('secretStored', (data) => {
  console.log('Secret stored:', data.path);
});

vaultManager.on('dataEncrypted', (data) => {
  console.log('Data encrypted:', { keyName: data.keyName, size: data.size });
});

vaultManager.on('circuitBreakerOpen', (data) => {
  console.error('Circuit breaker opened for operation:', data.operation);
});

vaultManager.on('authError', (error) => {
  console.error('Authentication error:', error.message);
});
```

## Vault Policy Examples

### AppRole Policy

Create a policy file `app-role-policy.hcl`:

```hcl
# Allow reading from secret/app/*
path "secret/data/app/*" {
  capabilities = ["read"]
}

# Allow writing to secret/app/*
path "secret/data/app/*" {
  capabilities = ["create", "update"]
}

# Allow listing secrets in secret/app
path "secret/metadata/app/*" {
  capabilities = ["list"]
}

# Allow transit operations
path "transit/encrypt/app-key" {
  capabilities = ["update"]
}

path "transit/decrypt/app-key" {
  capabilities = ["update"]
}

# Allow token renewal
path "auth/token/renew-self" {
  capabilities = ["update"]
}

# Allow token lookup
path "auth/token/lookup-self" {
  capabilities = ["read"]
}
```

### Apply Policy

```bash
vault policy write app-role-policy app-role-policy.hcl
```

### Create AppRole

```bash
# Create the role
vault write auth/approle/role/app-role \
    token_policies="app-role-policy" \
    token_ttl=1h \
    token_max_ttl=24h

# Get Role ID
vault read auth/approle/role/app-role/role-id

# Generate Secret ID
vault write -f auth/approle/role/app-role/secret-id
```

## Environment Variables

```bash
# Vault Configuration
export VAULT_ADDR="https://vault.example.com"
export VAULT_NAMESPACE="my-namespace"  # Optional
export VAULT_ROLE_ID="your-role-id"
export VAULT_SECRET_ID="your-secret-id"
export VAULT_TOKEN="your-token"  # For token auth

# Transit Key (create in Vault)
export VAULT_TRANSIT_KEY="app-key"
```

## Error Handling

The VaultSecretsManager includes comprehensive error handling:

```typescript
try {
  const secret = await vaultManager.getSecret('app/database');
  console.log('Secret retrieved:', secret);
} catch (error) {
  if (error.message.includes('Circuit breaker is open')) {
    console.error('Vault is temporarily unavailable, using fallback');
    // Implement fallback logic
  } else if (error.message.includes('Vault authentication failed')) {
    console.error('Authentication failed, check credentials');
    // Handle auth error
  } else {
    console.error('Unexpected error:', error.message);
    // Handle other errors
  }
}
```

## Security Best Practices

### 1. Never Log Secrets
The implementation automatically prevents logging of sensitive data:

```typescript
// ✅ Safe - only logs operation metadata
vaultManager.on('secretRetrieved', (data) => {
  console.log('Secret retrieved:', data.path); // Only path, not content
});

// ❌ Never do this
console.log('Secret content:', secret); // Don't log actual secrets
```

### 2. Use Environment-Specific Mounts
```typescript
const vaultManager = new VaultSecretsManager({
  address: process.env.VAULT_ADDR,
  authMethod: 'approle',
  roleId: process.env.VAULT_ROLE_ID,
  secretId: process.env.VAULT_SECRET_ID,
  mountPath: `secret-${process.env.NODE_ENV}` // secret-prod, secret-staging, etc.
});
```

### 3. Implement Proper Key Rotation
```typescript
// Rotate transit keys periodically
async function rotateTransitKey() {
  await vaultManager.transitRotateKey('app-key');
  console.log('Transit key rotated');
}
```

### 4. Use Short-Lived Tokens
```typescript
const vaultManager = new VaultSecretsManager({
  // ... other config
  // Configure short TTL for tokens
  // This will be handled by automatic renewal
});
```

## Testing

### Unit Tests
Run the comprehensive test suite:

```bash
npm test -- src/services/__tests__/VaultSecretsManager.test.ts
```

### Integration Tests
For integration tests with a real Vault instance:

```bash
# Start dev Vault
docker run -d --name vault-dev \
  -p 8200:8200 \
  -e 'VAULT_DEV_ROOT_TOKEN_ID=dev-token' \
  vault:latest

# Set environment variables
export VAULT_ADDR="http://localhost:8200"
export VAULT_TOKEN="dev-token"

# Run integration tests
npm run test:integration
```

## Troubleshooting

### Common Issues

#### 1. Authentication Failures
```bash
# Check Vault status
curl $VAULT_ADDR/v1/sys/health

# Verify AppRole credentials
vault read auth/approle/role/app-role/role-id
vault write -f auth/approle/role/app-role/secret-id
```

#### 2. Network Issues
```typescript
// Increase timeout for slow networks
const vaultManager = new VaultSecretsManager({
  // ... other config
  timeoutMs: 60000,  // 60 seconds
  retryAttempts: 5
});
```

#### 3. Circuit Breaker Issues
```typescript
// Reset circuit breaker if needed
vaultManager.resetCircuitBreaker();

// Check circuit breaker status
const status = vaultManager.getCircuitBreakerStatus();
if (status.isOpen) {
  console.log('Circuit breaker is open, waiting for retry');
}
```

## Monitoring

### Metrics to Monitor
- Authentication success/failure rates
- Secret retrieval latency
- Circuit breaker state changes
- Cache hit/miss ratios
- Transit encryption/decryption operations

### Health Checks
Implement regular health checks:

```typescript
setInterval(async () => {
  const health = await vaultManager.healthCheck();
  if (!health.healthy) {
    console.error('Vault is unhealthy:', health);
    // Send alert or implement fallback
  }
}, 30000); // Check every 30 seconds
```

## Migration Guide

### From Environment Variables
```typescript
// Before
const dbPassword = process.env.DB_PASSWORD;

// After
const vaultManager = new VaultSecretsManager(vaultConfig);
await vaultManager.authenticate();
const secret = await vaultManager.getSecret('app/database');
const dbPassword = secret.password;
```

### From File-based Secrets
```typescript
// Before
const secrets = JSON.parse(fs.readFileSync('secrets.json'));

// After
const vaultManager = new VaultSecretsManager(vaultConfig);
await vaultManager.authenticate();
const secrets = await vaultManager.getSecret('app/config');
```

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review Vault documentation: https://www.vaultproject.io/docs
3. Create an issue in the project repository
