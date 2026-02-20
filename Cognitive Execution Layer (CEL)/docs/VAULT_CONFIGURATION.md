# CEL Vault Configuration Guide

## Overview
This guide explains how to configure CEL to use HashiCorp Vault for secure secret management.

## Prerequisites
- Running HashiCorp Vault server
- Vault credentials (AppRole or Token)
- Proper Vault policies configured

## Environment Variables

### Basic Configuration
```bash
# Vault server address
VAULT_ADDR=https://vault.yourcompany.com:8200

# Authentication method ('token' or 'approle')
VAULT_AUTH_METHOD=approle

# Mount path for KV secrets engine
VAULT_MOUNT_PATH=secret
```

### Token Authentication
```bash
# Direct token authentication
VAULT_AUTH_METHOD=token
VAULT_TOKEN=s.vault-token-here
```

### AppRole Authentication
```bash
# AppRole authentication (recommended for production)
VAULT_AUTH_METHOD=approle
VAULT_ROLE_ID=your-role-id-here
VAULT_SECRET_ID=your-secret-id-here
```

### Namespace (if using Vault Enterprise)
```bash
# Vault namespace
VAULT_NAMESPACE=your-namespace
```

## Secrets Path Structure

CEL expects secrets to be stored in the following paths:
```
secret/
└── cel/
    ├── openrouter/
    │   └── api_key
    ├── anthropic/
    │   └── api_key
    ├── openai/
    │   └── api_key
    └── database/
        └── connection_string
```

## Example Setup Script

```bash
#!/bin/bash

# Enable KV secrets engine
vault secrets enable -path=secret kv-v2

# Create policy for CEL
vault policy write cel-policy - <<EOF
path "secret/data/cel/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}

path "secret/metadata/cel/*" {
  capabilities = ["list"]
}
EOF

# Create AppRole for CEL
vault write auth/approle/role/cel \
    token_policies="cel-policy" \
    secret_id_ttl="0" \
    token_num_uses="0" \
    token_ttl="1h" \
    token_max_ttl="24h"

# Get Role ID
ROLE_ID=$(vault read -field=role_id auth/approle/role/cel/role-id)

# Generate Secret ID
SECRET_ID=$(vault write -f -field=secret_id auth/approle/role/cel/secret-id)

echo "Role ID: $ROLE_ID"
echo "Secret ID: $SECRET_ID"

# Store sample API key
vault kv put secret/cel/openrouter/api_key value="your-openrouter-api-key-here"
```

## Provider Configuration

### In Code
```javascript
import { SecretsManager } from './security/security-framework.js';

// Using environment variables
const secretsManager = new SecretsManager({ backend: 'vault' });
await secretsManager.initialize();

// Using constructor options
const secretsManager = new SecretsManager({
  backend: 'vault',
  vaultAddress: 'https://vault.company.com:8200',
  vaultAuthMethod: 'approle',
  vaultRoleId: 'your-role-id',
  vaultSecretId: 'your-secret-id'
});
await secretsManager.initialize();
```

### With ProviderFactory
```javascript
import { getProviderFactory } from './providers/provider-factory.js';

const config = {
  secretsManager: new SecretsManager({ backend: 'vault' }),
  openrouter: {
    // API key will be automatically retrieved from Vault
  }
};

const factory = await getProviderFactory(config);
```

## Health Check

```javascript
// Check Vault connectivity
const health = await secretsManager.healthCheck();
console.log('Vault Health:', health);

// Expected output:
// {
//   healthy: true,
//   version: "1.15.0",
//   reachable: true
// }
```

## Troubleshooting

### Common Issues

1. **Authentication Failed**
   - Check VAULT_ADDR is correct
   - Verify credentials are valid
   - Ensure Vault is accessible from CEL server

2. **Permission Denied**
   - Check Vault policies
   - Verify path permissions
   - Confirm AppRole bindings

3. **Connection Timeout**
   - Check network connectivity
   - Verify firewall settings
   - Increase timeout in VaultManager config

### Debug Commands

```bash
# Test Vault connectivity
curl $VAULT_ADDR/v1/sys/health

# Test authentication
vault login -method=approle role_id=$VAULT_ROLE_ID secret_id=$VAULT_SECRET_ID

# List secrets
vault kv list secret/cel/

# Read specific secret
vault kv get secret/cel/openrouter/api_key
```

## Security Best Practices

1. **Use AppRole Authentication** instead of static tokens
2. **Rotate credentials regularly**
3. **Implement proper Vault policies with least privilege**
4. **Enable audit logging**
5. **Use TLS for all Vault communications**
6. **Monitor Vault access patterns**
7. **Implement circuit breaker pattern** (built into VaultManager)

## Fallback Behavior

If Vault is unavailable, CEL will:
1. Log a warning message
2. Fall back to environment variables
3. Continue operation with reduced security

This ensures high availability while maintaining security when possible.