# Cognitive Execution Layer (CEL) - Architecture

## Overview

The Cognitive Execution Layer (CEL) is an LLM Control Plane designed for IDE integration. It provides a comprehensive system for managing AI-assisted development tasks, code analysis, and project optimization.

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        IDE Integration Layer                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   Xcode     │  │   VS Code   │  │   Other IDEs            │  │
│  └──────┬──────┘  └──────┬──────┘  └───────────┬─────────────┘  │
└─────────┼────────────────┼─────────────────────┼────────────────┘
          │                │                     │
          └────────────────┼─────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                        API Gateway Layer                          │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  Express.js Server (src/server/index.js)                    ││
│  │  - Rate Limiting                                            ││
│  │  - Request Logging                                          ││
│  │  - Input Validation                                         ││
│  │  - Error Handling                                           ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Middleware Layer                           │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────────┐ │
│  │ Input        │ │ Error        │ │ Request Logger           │ │
│  │ Validator    │ │ Handler      │ │                          │ │
│  └──────────────┘ └──────────────┘ └──────────────────────────┘ │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────────┐ │
│  │ Config       │ │ Health       │ │ Graceful Shutdown        │ │
│  │ Manager      │ │ Check        │ │                          │ │
│  └──────────────┘ └──────────────┘ └──────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Routes Layer                               │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────────┐ │
│  │ Main Routes  │ │ Orchestration│ │ Testing Routes           │ │
│  │              │ │ Routes       │ │                          │ │
│  └──────────────┘ └──────────────┘ └──────────────────────────┘ │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────────┐ │
│  │ Context      │ │ Reliability  │ │ Self-Healing Routes      │ │
│  │ Routes       │ │ Routes       │ │                          │ │
│  └──────────────┘ └──────────────┘ └──────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Engines Layer                              │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    Core Engines                              ││
│  │  ┌──────────────────┐  ┌──────────────────────────────────┐ ││
│  │  │ Orchestration    │  │ Project Knowledge Graph          │ ││
│  │  │ Engine           │  │                                  │ ││
│  │  └──────────────────┘  └──────────────────────────────────┘ ││
│  │  ┌──────────────────┐  ┌──────────────────────────────────┐ ││
│  │  │ Virtual Sandbox  │  │ Evolution Engine                 │ ││
│  │  └──────────────────┘  └──────────────────────────────────┘ ││
│  └─────────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                  Reliability Engines                         ││
│  │  ┌──────────────────┐  ┌──────────────────────────────────┐ ││
│  │  │ Stability Engine │  │ Anti-Stagnation Engine           │ ││
│  │  └──────────────────┘  └──────────────────────────────────┘ ││
│  │  ┌──────────────────┐  ┌──────────────────────────────────┐ ││
│  │  │ Constraint       │  │ Temporal Simulator               │ ││
│  │  │ Solver           │  │                                  │ ││
│  │  └──────────────────┘  └──────────────────────────────────┘ ││
│  └─────────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                   Support Engines                            ││
│  │  ┌──────────────────┐  ┌──────────────────────────────────┐ ││
│  │  │ Mutation Ledger  │  │ Economic Resilience              │ ││
│  │  └──────────────────┘  └──────────────────────────────────┘ ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

## Component Descriptions

### API Gateway Layer

The Express.js server handles all incoming requests with:
- **Rate Limiting**: IP-based request throttling (100 requests per 15 minutes)
- **Request Logging**: Comprehensive logging with sensitive data redaction
- **Input Validation**: Schema-based validation for all API inputs
- **Error Handling**: Centralized error handling with custom error classes

### Middleware Layer

| Component | Purpose |
|-----------|---------|
| InputValidator | Validates request body, query, and params against schemas |
| ErrorHandler | Normalizes errors and provides consistent error responses |
| RequestLogger | Logs requests/responses with statistics tracking |
| Config | Manages configuration from files and environment variables |
| HealthCheck | Provides health monitoring endpoints |
| GracefulShutdown | Handles controlled server shutdown |

### Engines Layer

#### Core Engines

| Engine | Purpose |
|--------|---------|
| OrchestrationEngine | Manages tasks, goals, and execution coordination |
| ProjectKnowledgeGraph | Builds and maintains project structure representation |
| VirtualSandbox | Provides isolated code execution environment |
| EvolutionEngine | Handles system evolution and optimization |

#### Reliability Engines

| Engine | Purpose |
|--------|---------|
| StabilityEngine | Monitors system stability and entropy |
| AntiStagnationEngine | Detects and resolves system stagnation |
| ConstraintSolver | Solves constraint satisfaction problems |
| TemporalSimulator | Simulates temporal scenarios |

#### Support Engines

| Engine | Purpose |
|--------|---------|
| MutationLedger | Records and tracks system mutations |
| EconomicResilience | Manages resource budgeting |

## Data Flow

```
Request → Rate Limiter → Logger → Validator → Route Handler → Engine → Response
                                    ↓
                              Error Handler (if error)
```

## Configuration

Configuration is loaded from multiple sources with priority:
1. Environment variables (CEL_*)
2. Configuration file (cel.config.json)
3. Default values

Key configuration options:
- `CEL_PORT`: Server port (default: 3000)
- `CEL_HOST`: Server host (default: 127.0.0.1)
- `CEL_NODE_ENV`: Environment (development/production)
- `CEL_RATE_LIMIT_MAX`: Max requests per window
- `CEL_LOG_LEVEL`: Logging level

## API Endpoints

### Health & Monitoring
- `GET /health` - Quick health check
- `GET /health/detailed` - Detailed health report
- `GET /ready` - Readiness probe
- `GET /live` - Liveness probe
- `GET /metrics/requests` - Request statistics

### Cognitive Operations
- `POST /v1/cognitive/optimize` - Optimize cognitive representation

### Orchestration
- `POST /v1/goals` - Create goal
- `GET /v1/goals/:goalId` - Get goal
- `POST /v1/tasks` - Create task
- `GET /v1/tasks/:taskId` - Get task
- `POST /v1/execute` - Execute next task

### Testing
- `POST /v1/sandbox/create` - Create sandbox
- `POST /v1/sandbox/execute` - Execute code
- `DELETE /v1/sandbox/:sandboxId` - Cleanup sandbox

### Xcode Integration
- `POST /v1/xcode/chat-completion` - OpenAI-compatible chat
- `POST /v1/xcode/integration` - Xcode commands
- `GET /v1/xcode/dashboard` - Dashboard data
- `GET /v1/xcode/health` - Xcode health check

## Security Considerations

1. **Input Validation**: All inputs are validated against schemas
2. **Rate Limiting**: Prevents abuse and DDoS attacks
3. **Sensitive Data**: Automatic redaction in logs
4. **Error Messages**: Sanitized in production mode
5. **CORS**: Configurable cross-origin policies
