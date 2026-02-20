# Cognitive Execution Layer (CEL) - Project Structure Documentation

## Overview
This document describes the current directory structure and organization of the Cognitive Execution Layer project.

## Directory Structure

```
├── __tests__/                    # Consolidated test directory
│   ├── unit/                     # Unit tests for individual modules
│   │   ├── anti-stagnation-engine.test.js
│   │   ├── constraint-solver.test.js
│   │   ├── evolution-engine.test.js
│   │   ├── health-check.test.js
│   │   ├── orchestration-engine.test.js
│   │   ├── project-knowledge-graph.test.js
│   │   └── virtual-sandbox.test.js
│   └── integration/              # Integration tests for combined functionality
│       ├── core-components.integration.test.js
│       └── server-integration.test.js
├── config/                       # Configuration files
│   ├── .env.example             # Environment variables template
│   ├── docker-compose.yml       # Docker configuration
│   ├── grafana.ini             # Grafana configuration
│   ├── log4js.json             # Logging configuration
│   ├── prometheus.yml          # Prometheus configuration
│   └── swagger.yaml            # API documentation
├── docs/                        # Documentation files
│   ├── api/                     # API documentation
│   ├── architecture/            # Architecture documentation
│   ├── development/             # Development guides
│   └── operations/              # Operations documentation
├── src/                         # Source code
│   ├── engines/                 # Core engine modules
│   │   ├── agent-protocol.js
│   │   ├── anti-stagnation-engine.js
│   │   ├── code-tester-linter.js
│   │   ├── constraint-solver.js
│   │   ├── cost-optimizer.js
│   │   ├── evolution-engine.js
│   │   ├── file-agent-manager.js
│   │   ├── formal-safety-model.js
│   │   ├── health-check.js
│   │   ├── orchestration-engine.js
│   │   ├── project-knowledge-graph.js
│   │   └── virtual-sandbox.js
│   ├── middleware/              # Express middleware
│   │   ├── cors.js
│   │   ├── error-handler.js
│   │   └── rate-limit.js
│   ├── routes/                  # API route handlers
│   │   ├── agent-management.js
│   │   ├── anti-stagnation.js
│   │   ├── constraint-solving.js
│   │   ├── evolution-tracking.js
│   │   ├── health.js
│   │   ├── model-management.js
│   │   ├── project-context.js
│   │   └── testing-quality.js
│   ├── server/                  # Server entry point
│   │   └── index.js
│   └── utils/                   # Utility functions
│       ├── config.js
│       ├── constants.js
│       ├── logger.js
│       └── validation.js
├── stats_engine/                # Statistics engine (separate module)
│   └── tests/                   # Stats engine tests
├── babel.config.js             # Babel configuration for Jest
├── package.json                # Project dependencies and scripts
└── README.md                   # Project overview
```

## Key Components

### Core Engines (`src/engines/`)
- **agent-protocol.js**: Communication protocol for autonomous agents
- **anti-stagnation-engine.js**: Detects and prevents project stagnation
- **code-tester-linter.js**: Code testing and linting functionality
- **constraint-solver.js**: Solves design and implementation constraints
- **cost-optimizer.js**: Manages model costs and optimization
- **evolution-engine.js**: Tracks and manages system evolution
- **file-agent-manager.js**: Manages file-based autonomous agents
- **formal-safety-model.js**: Implements formal safety verification
- **health-check.js**: System health monitoring and reporting
- **orchestration-engine.js**: Core task orchestration and coordination
- **project-knowledge-graph.js**: Project structure and dependency mapping
- **virtual-sandbox.js**: Secure code execution environment

### Test Structure
All tests have been consolidated into the `__tests__` directory with clear separation:
- **Unit tests** (`__tests__/unit/`): Test individual modules in isolation
- **Integration tests** (`__tests__/integration/`): Test combined functionality and API endpoints

### Configuration
Configuration files are centralized in the `config/` directory:
- Environment variables (`.env.example`)
- Container orchestration (`docker-compose.yml`)
- Monitoring setup (Prometheus, Grafana)
- Logging configuration (`log4js.json`)
- API documentation (`swagger.yaml`)

## Recent Refactoring Changes

1. **Duplicate Test Folder Resolution**: Removed redundant `test/__tests__` directory, consolidated all tests into `__tests__/`
2. **Import Path Standardization**: Updated all test files to use consistent import paths pointing to `src/engines/`
3. **ES Module Configuration**: Added Babel configuration to support ES module syntax in tests
4. **Documentation Updates**: This document reflects the current clean directory structure

## Development Guidelines

- All new source code should be placed in appropriate subdirectories under `src/`
- Tests should be added to corresponding directories under `__tests__/`
- Configuration files belong in the `config/` directory
- Documentation should be maintained in the `docs/` directory structure

## Testing

Run tests using npm scripts:
```bash
npm test                    # Run all tests
npm run test:unit          # Run unit tests only
npm run test:integration   # Run integration tests only
npm run test:coverage      # Run tests with coverage report
```