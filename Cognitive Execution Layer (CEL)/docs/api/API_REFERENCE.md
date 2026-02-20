# CEL API Documentation

## Overview

The Cognitive Execution Layer API provides a comprehensive interface for autonomous software engineering capabilities. All endpoints follow RESTful principles and return JSON responses.

## Base URL

```
http://localhost:3000
```

For production deployments, use your configured domain and HTTPS.

## Authentication

Currently uses API key authentication (to be implemented):

```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
     -H "Content-Type: application/json" \
     http://localhost:3000/v1/endpoint
```

## Rate Limiting

- Default: 100 requests per minute per IP
- Authenticated users: 1000 requests per minute
- Burst limit: 20 requests per second

## Error Handling

All errors follow this format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": "Additional error details (optional)"
  }
}
```

### Common HTTP Status Codes

- `200 OK` - Success
- `400 Bad Request` - Invalid request parameters
- `401 Unauthorized` - Missing or invalid authentication
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error

## Core Endpoints

### System Health

#### Get Health Status
```
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "uptime": 3600,
  "timestamp": "2024-01-15T10:30:00Z"
}
```

#### Get System Usage
```
GET /usage
```

**Response:**
```json
{
  "cpu": 45.2,
  "memory": 67.8,
  "disk": 23.4,
  "requests": 150,
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Model Management

#### List Available Models
```
GET /v1/models
```

**Response:**
```json
{
  "models": [
    {
      "id": "gpt-4-turbo",
      "name": "GPT-4 Turbo",
      "capabilities": ["chat", "code", "analysis"],
      "maxTokens": 128000,
      "pricing": {
        "input": 0.01,
        "output": 0.03
      }
    }
  ]
}
```

#### Recommend Model
```
GET /v1/recommend-model/:taskType/:tokens
```

**Parameters:**
- `taskType` - Type of task (code, analysis, chat, etc.)
- `tokens` - Expected token count

**Response:**
```json
{
  "recommendedModel": "gpt-4-turbo",
  "reasoning": "Optimal balance of capability and cost for code generation tasks",
  "confidence": 0.95
}
```

### AI Interaction

#### Chat Completions
```
POST /v1/chat/completions
```

**Request Body:**
```json
{
  "messages": [
    {
      "role": "user",
      "content": "Write a function to calculate fibonacci numbers"
    }
  ],
  "model": "gpt-4-turbo",
  "temperature": 0.7,
  "maxTokens": 1000
}
```

**Response:**
```json
{
  "id": "chatcmpl-123",
  "choices": [
    {
      "message": {
        "role": "assistant",
        "content": "Here's a function to calculate fibonacci numbers..."
      },
      "finishReason": "stop"
    }
  ],
  "usage": {
    "promptTokens": 50,
    "completionTokens": 120,
    "totalTokens": 170
  }
}
```

### Code Analysis and Testing

#### Run Tests
```
POST /v1/run-tests
```

**Request Body:**
```json
{
  "filePath": "./src/example.js",
  "testFramework": "jest",
  "options": {
    "verbose": true,
    "coverage": true
  }
}
```

**Response:**
```json
{
  "success": true,
  "results": [
    {
      "testName": "should calculate fibonacci correctly",
      "status": "passed",
      "duration": 15
    }
  ],
  "summary": "10 tests passed, 0 failed",
  "duration": 2.34,
  "coverage": {
    "lines": 95.2,
    "functions": 92.0,
    "branches": 88.5
  }
}
```

#### Lint Code
```
POST /v1/lint-code
```

**Request Body:**
```json
{
  "filePath": "./src/example.js",
  "linter": "eslint",
  "rules": {
    "semi": "error",
    "indent": ["error", 2]
  }
}
```

**Response:**
```json
{
  "success": false,
  "issues": [
    {
      "line": 15,
      "column": 10,
      "message": "Missing semicolon",
      "severity": "error",
      "rule": "semi"
    }
  ],
  "summary": "2 errors, 5 warnings",
  "fixed": 3
}
```

#### Code Assistance
```
POST /v1/code-assist
```

**Request Body:**
```json
{
  "task": "Refactor this function to be more efficient",
  "code": "function inefficientFunction(arr) { ... }",
  "context": "Performance optimization request",
  "preferences": {
    "style": "functional",
    "complexity": "low"
  }
}
```

**Response:**
```json
{
  "suggestions": [
    {
      "type": "refactor",
      "description": "Use map instead of for loop",
      "code": "const result = arr.map(x => x * 2);",
      "confidence": 0.95,
      "benefits": ["Better performance", "More readable"]
    }
  ],
  "estimatedImprovement": {
    "performance": "40%",
    "readability": "high"
  }
}
```

### Project Management

#### Get Project Context
```
GET /v1/project-context/*
```

**Parameters:**
- Path parameters for project file/directory

**Response:**
```json
{
  "path": "/projects/my-app/src/components",
  "structure": {
    "files": ["Button.js", "Header.js"],
    "directories": ["utils", "styles"]
  },
  "dependencies": ["react", "lodash"],
  "framework": "React",
  "architecture": "Component-based"
}
```

#### Generate Code Quality Report
```
POST /v1/code-quality-report
```

**Request Body:**
```json
{
  "filePath": "./src/",
  "options": {
    "includeMetrics": true,
    "includeSuggestions": true,
    "includeSecurity": true
  }
}
```

**Response:**
```json
{
  "qualityScore": 8.5,
  "metrics": {
    "complexity": 2.3,
    "maintainability": 85,
    "testCoverage": 92
  },
  "issues": [
    {
      "type": "complexity",
      "severity": "medium",
      "location": "UserService.js:45",
      "description": "Function is too complex"
    }
  ],
  "suggestions": [
    {
      "type": "refactor",
      "priority": "high",
      "description": "Split large functions"
    }
  ]
}
```

### Autonomous Orchestration

#### Orchestrate Goal
```
POST /v1/orchestrate-goal
```

**Request Body:**
```json
{
  "goal": "Implement user authentication system",
  "priority": "high",
  "deadline": "2024-01-20T10:00:00Z",
  "constraints": [
    "Must use JWT tokens",
    "Follow company security guidelines"
  ],
  "resources": {
    "budget": 10000,
    "timeline": "2 weeks"
  }
}
```

**Response:**
```json
{
  "taskId": "task-12345",
  "status": "initiated",
  "plan": {
    "steps": [
      "Design authentication architecture",
      "Implement user registration",
      "Add JWT token generation",
      "Create protected routes"
    ],
    "estimatedTime": "8 hours",
    "requiredResources": ["auth-library", "database-access"]
  },
  "assignedAgents": ["code-generator", "security-analyzer", "tester"]
}
```

### Constraint Solving

#### Solve Design Constraints
```
POST /v1/solve-design-constraints
```

**Request Body:**
```json
{
  "constraints": [
    {
      "type": "performance",
      "variables": ["responseTime", "throughput"],
      "predicate": "responseTime < 100 AND throughput > 1000"
    },
    {
      "type": "cost",
      "variables": ["monthlyCost"],
      "predicate": "monthlyCost < 100"
    }
  ],
  "optimization": "minimize_cost",
  "variables": {
    "responseTime": [50, 100, 150, 200],
    "throughput": [500, 1000, 1500, 2000]
  }
}
```

**Response:**
```json
{
  "solved": true,
  "solution": {
    "responseTime": 85,
    "throughput": 1200,
    "monthlyCost": 75
  },
  "score": 0.92,
  "iterations": 150,
  "solveTime": 2345
}
```

#### Get Constraint Statistics
```
GET /v1/constraint-solver-statistics
```

**Response:**
```json
{
  "constraintCount": 15,
  "variableCount": 23,
  "problemsSolved": 127,
  "averageSolveTime": 1850,
  "successRate": 0.94
}
```

### System Management

#### Register Agent
```
POST /v1/register-agent
```

**Request Body:**
```json
{
  "agentId": "code-reviewer-1",
  "capabilities": ["code_review", "static_analysis", "security_scanning"],
  "configuration": {
    "maxConcurrentTasks": 5,
    "preferredLanguages": ["javascript", "typescript"]
  }
}
```

**Response:**
```json
{
  "agentId": "code-reviewer-1",
  "registered": true,
  "registrationTime": "2024-01-15T10:30:00Z",
  "agentInfo": {
    "status": "active",
    "load": 0,
    "lastHeartbeat": "2024-01-15T10:30:00Z"
  }
}
```

#### Update Agent Status
```
POST /v1/update-agent-status
```

**Request Body:**
```json
{
  "agentId": "code-reviewer-1",
  "status": "busy",
  "load": 0.7,
  "currentTask": "reviewing PR #123"
}
```

**Response:**
```json
{
  "updated": true,
  "agentId": "code-reviewer-1",
  "newStatus": "busy"
}
```

### Anti-Stagnation

#### Get Anti-Stagnation Statistics
```
GET /v1/anti-stagnation-stats
```

**Response:**
```json
{
  "totalActivities": 1250,
  "recoveryCount": 3,
  "stagnationEvents": 2,
  "activityRate": 15.5,
  "lastRecovery": "2024-01-15T09:15:00Z"
}
```

#### Get Recommendations
```
GET /v1/anti-stagnation-recommendations
```

**Response:**
```json
{
  "recommendations": [
    {
      "type": "exploration",
      "priority": "medium",
      "description": "Try alternative approach to current task",
      "suggestedAction": "switch_to_different_model"
    }
  ],
  "diversityScore": 0.75,
  "stagnationLevel": "low"
}
```

### Evolution and Adaptation

#### Get Evolution Level
```
GET /v1/evolution-level
```

**Response:**
```json
{
  "level": 3,
  "adaptations": [
    "Improved error handling",
    "Added caching layer",
    "Optimized database queries"
  ],
  "fitnessScore": 0.87,
  "lastEvolution": "2024-01-14T15:30:00Z"
}
```

#### Get Change Statistics
```
GET /v1/change-statistics
```

**Response:**
```json
{
  "totalChanges": 142,
  "recentChanges": 15,
  "changeRate": 2.3,
  "entropy": 0.67,
  "trend": "stable"
}
```

### Safety and Reliability

#### Get Reliability Information
```
GET /v1/reliability-info
```

**Response:**
```json
{
  "uptime": 0.995,
  "errorRate": 0.02,
  "mtbf": 1200,
  "mttr": 30,
  "slaCompliance": 0.98
}
```

#### Get Stability Status
```
GET /v1/stability-status
```

**Response:**
```json
{
  "overallStability": 0.92,
  "componentStatus": {
    "api": "stable",
    "database": "stable",
    "cache": "degraded"
  },
  "conflictRate": 0.05,
  "rollbackFrequency": 0.01
}
```

#### Check Safety
```
POST /v1/check-safety
```

**Request Body:**
```json
{
  "operation": {
    "type": "file_write",
    "filePath": "./src/new-feature.js",
    "content": "function newFeature() { ... }"
  },
  "context": {
    "project": "my-app",
    "user": "developer"
  }
}
```

**Response:**
```json
{
  "safe": true,
  "violations": [],
  "warnings": [
    {
      "type": "file_location",
      "message": "Consider placing in features/ directory"
    }
  ],
  "requiresSimulation": false
}
```

## WebSocket API (Future)

Real-time notifications and streaming responses will be available through WebSocket connections:

```
ws://localhost:3000/ws
```

## Rate Limits

Different endpoints have different rate limits:

| Endpoint Category | Requests/Minute | Burst Limit |
|------------------|----------------|-------------|
| Health/Status    | Unlimited      | Unlimited   |
| Model Info       | 100            | 20/sec      |
| Code Analysis    | 50             | 10/sec      |
| AI Generation    | 30             | 5/sec       |
| System Management| 100            | 20/sec      |

## Best Practices

### Error Handling
Always check HTTP status codes and handle errors appropriately in your client code.

### Pagination
For endpoints returning lists, use pagination parameters:
```
?page=1&limit=50
```

### Caching
Use ETags and conditional requests for better performance:
```
If-None-Match: "etag-value"
```

### Batch Operations
For multiple related operations, consider batching when supported:
```json
{
  "batch": [
    {"operation": "lint", "file": "file1.js"},
    {"operation": "test", "file": "file1.js"}
  ]
}
```

This API documentation provides a comprehensive reference for integrating with the Cognitive Execution Layer system.