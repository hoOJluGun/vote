# CEL API Examples

This document provides practical examples for using the Cognitive Execution Layer API.

## Quick Start Examples

### 1. Basic Chat Interaction

```bash
curl -X POST http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {
        "role": "user",
        "content": "Explain what a REST API is in simple terms"
      }
    ],
    "model": "openrouter/deepseek/deepseek-chat",
    "temperature": 0.7
  }'
```

**Response:**
```json
{
  "choices": [
    {
      "message": {
        "role": "assistant",
        "content": "A REST API is like a waiter in a restaurant. You (the client) tell the waiter what you want (send a request), the kitchen (server) prepares it, and the waiter brings it back to you (sends a response)."
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 25,
    "completion_tokens": 45,
    "total_tokens": 70
  }
}
```

### 2. Code Generation

```bash
curl -X POST http://localhost:3000/v1/code/generate \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Create a React component that displays a todo list with add/remove functionality",
    "language": "typescript",
    "context": "Use React hooks and TypeScript interfaces"
  }'
```

### 3. Code Refactoring

```bash
curl -X POST http://localhost:3000/v1/code/refactor \
  -H "Content-Type: application/json" \
  -d '{
    "code": "function calculateTotal(items) { let total = 0; for(let i = 0; i < items.length; i++) { total += items[i].price * items[i].quantity; } return total; }",
    "target_improvements": "Make it more readable and use modern JavaScript features"
  }'
```

### 4. Test Generation

```bash
curl -X POST http://localhost:3000/v1/testing/generate \
  -H "Content-Type: application/json" \
  -d '{
    "code": "function isValidEmail(email) { return /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email); }",
    "filename": "email-validator.js",
    "framework": "jest",
    "coverage_target": 90
  }'
```

## Advanced Examples

### 5. Chat with Project Context

```bash
curl -X POST http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {
        "role": "system",
        "content": "You are helping with a React project using TypeScript and Tailwind CSS."
      },
      {
        "role": "user",
        "content": "How should I structure my components for a dashboard page?"
      }
    ],
    "project_context": {
      "project_name": "Analytics Dashboard",
      "file_structure": [
        "src/components/",
        "src/hooks/",
        "src/types/",
        "src/utils/"
      ],
      "recent_changes": [
        "Added user authentication context",
        "Implemented data fetching hooks"
      ]
    }
  }'
```

### 6. Git Analysis and Commit Generation

```bash
curl -X POST http://localhost:3000/v1/git/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "include_stats": true,
    "conventional_format": true
  }'
```

**Response:**
```json
{
  "commit_message": "feat(auth): add user authentication with JWT tokens",
  "commit_type": "feat",
  "scope": "auth",
  "changes": [
    {
      "file": "src/auth/service.ts",
      "status": "A",
      "additions": 127,
      "deletions": 0
    },
    {
      "file": "src/components/LoginForm.tsx",
      "status": "A",
      "additions": 89,
      "deletions": 0
    }
  ],
  "stats": {
    "files_changed": 2,
    "insertions": 216,
    "deletions": 0
  }
}
```

### 7. Health Check with System Metrics

```bash
curl http://localhost:3000/health
```

**Response:**
```json
{
  "status": "healthy",
  "version": "2.0.0",
  "uptime": 3600,
  "models": [
    {
      "name": "openrouter/deepseek/deepseek-chat",
      "status": "available",
      "latency": 120
    },
    {
      "name": "openrouter/mistral/mistral-large",
      "status": "available",
      "latency": 150
    }
  ],
  "system": {
    "cpu_usage": 23.5,
    "memory_usage": 67.2,
    "disk_usage": 45.8
  }
}
```

## Client SDK Examples

### JavaScript/TypeScript Client

```typescript
class CELClient {
  private baseUrl: string;
  
  constructor(baseUrl: string = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
  }
  
  async chat(messages: Array<{role: string, content: string}>, options = {}) {
    const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, ...options })
    });
    return response.json();
  }
  
  async generateCode(description: string, language: string = 'typescript') {
    const response = await fetch(`${this.baseUrl}/v1/code/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description, language })
    });
    return response.json();
  }
}

// Usage
const client = new CELClient();
const result = await client.chat([
  { role: 'user', content: 'Help me debug this React component' }
]);
```

### Python Client

```python
import requests
import json

class CELClient:
    def __init__(self, base_url='http://localhost:3000'):
        self.base_url = base_url
    
    def chat(self, messages, **kwargs):
        response = requests.post(
            f'{self.base_url}/v1/chat/completions',
            json={'messages': messages, **kwargs}
        )
        return response.json()
    
    def generate_code(self, description, language='python'):
        response = requests.post(
            f'{self.base_url}/v1/code/generate',
            json={'description': description, 'language': language}
        )
        return response.json()

# Usage
client = CELClient()
result = client.chat([{'role': 'user', 'content': 'Explain async/await'}])
```

## CLI Integration Examples

### Using the CEL CLI

```bash
# Install the CLI
npm install -g cognitive-execution-cli

# Chat with AI
cel chat "How do I optimize database queries?"

# Generate tests for a file
cel test generate src/components/Button.tsx

# Refactor code
cel refactor src/utils/helpers.js --improvements "Improve performance and readability"

# Smart Git commit
cel commit --analyze
cel commit --message "feat: add user profile page"
```

## Error Handling Examples

```bash
# Bad request example
curl -X POST http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"invalid": "data"}'

# Response:
{
  "error": "Bad Request",
  "message": "Missing required field: messages",
  "code": "MISSING_FIELD"
}
```

## Rate Limiting and Best Practices

### Recommended Patterns

1. **Batch Requests**: Group multiple related operations
2. **Caching**: Cache responses for identical requests
3. **Retries**: Implement exponential backoff for failed requests
4. **Timeouts**: Set appropriate timeouts based on operation type

### Example with Retry Logic

```javascript
async function robustAPICall(endpoint, data, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      if (response.ok) return await response.json();
      
      if (response.status === 429) {
        // Rate limited - wait and retry
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
        continue;
      }
      
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
    }
  }
}
```

These examples demonstrate the core functionality of the CEL API and provide patterns for integrating it into various applications and workflows.