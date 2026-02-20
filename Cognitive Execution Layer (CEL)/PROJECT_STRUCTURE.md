# Cognitive Execution Layer (CEL) v4.2.1 - Project Structure

## Directory Structure

```
CEL/
├── src/
│   ├── engines/                      # Core engine implementations
│   │   ├── advanced-usage-tracker.js # Tracks usage metrics and costs
│   │   ├── agent-protocol.js         # Defines communication protocols for agents
│   │   ├── anti-stagnation-engine.js # Prevents system stagnation with random strategies
│   │   ├── autonomous-stress-test.js # Performs automated stress testing
│   │   ├── boot-recovery.js          # Handles recovery procedures at startup
│   │   ├── code-analysis.js          # Analyzes code for quality and vulnerabilities
│   │   ├── code-applier.js           # Applies code changes safely
│   │   ├── code-tester-linter.js     # Runs tests and linting tools
│   │   ├── cognitive-workspace-core.js # Core cognitive workspace functionality
│   │   ├── cognitive-workspace-field.js # Cognitive workspace field representation
│   │   ├── complexity-management.js  # Manages project complexity
│   │   ├── constraint-solver.js      # Solves system constraints
│   │   ├── control-hierarchy.js      # Implements control hierarchy
│   │   ├── cost-optimizer.js         # Optimizes model usage costs
│   │   ├── deterministic-execution-layer.js # Ensures deterministic execution
│   │   ├── economic-resilience.js    # Manages economic aspects of system
│   │   ├── entropy-drift-monitor.js  # Monitors architectural entropy
│   │   ├── evolution-engine.js       # Implements evolutionary algorithms
│   │   ├── file-agent-manager.js     # Manages file-related agents
│   │   ├── formal-resilience-model.js # Formal model of system resilience
│   │   ├── formal-safety-model.js    # Formal model of system safety
│   │   ├── goal-integrity-ledger.js  # Maintains integrity of goals
│   │   ├── mutation-ledger.js        # Tracks code mutations
│   │   ├── observability-stack.js    # Provides system observability
│   │   ├── orchestration-engine.js   # Orchestrates multi-agent workflows
│   │   ├── project-context-analyzer.js # Analyzes project context
│   │   ├── project-knowledge-graph.js # Maintains project knowledge graph
│   │   ├── resource-governor.js      # Governs resource usage
│   │   ├── shadow-execution-layer.js # Shadow execution for validation
│   │   ├── shutdown-procedures.js    # Handles graceful shutdown
│   │   ├── solution-evaluation-model.js # Evaluates solution quality
│   │   ├── stability-engine.js       # Maintains system stability
│   │   ├── stability-theory-engine.js # Stability based on theoretical models
│   │   ├── temporal-simulator.js     # Simulates temporal system behavior
│   │   └── virtual-sandbox.js        # Provides virtual execution environment
│   ├── providers/                    # LLM provider implementations
│   │   ├── base-provider.js          # Base class for providers
│   │   ├── openrouter-provider.js    # OpenRouter API implementation
│   │   ├── ollama-provider.js        # Ollama API implementation
│   │   ├── provider-factory.js       # Factory for creating providers
│   │   └── types.ts                  # TypeScript type definitions
│   └── server/                       # Main server implementation
│       ├── container/                # Container configurations
│       ├── index.js                  # Main server entry point (v4.2.1)
│       ├── middleware/               # Request processing middleware
│       │   ├── api-middleware.js     # API-specific middleware
│       │   └── security.js           # Security middleware
│       ├── routes/                   # API route handlers
│       │   ├── chat.js               # Chat completion routes
│       │   ├── cognitive.js          # Cognitive workspace routes
│       │   ├── index.js              # Route index
│       │   ├── orchestration.js      # Orchestration routes
│       │   ├── reliability.js        # Reliability monitoring routes
│       │   ├── system.js             # System information routes
│       │   └── xcode.js              # Xcode integration routes
│       └── utils/                    # Server utilities
│           ├── errors.js             # Error handling utilities
│           ├── http-client.js        # HTTP client utilities
│           └── logger.js             # Logging utilities
├── lib/                              # Core capability modules
│   ├── byzantine-tolerance.js        # Byzantine fault tolerance implementation
│   ├── catastrophic-rollback.js      # Catastrophic failure rollback
│   ├── chaos-engineering.js          # Chaos engineering for resilience
│   ├── config.js                     # Configuration management
│   ├── error-handler.js              # Centralized error handling
│   ├── explainability-layer.js       # Explainability for AI decisions
│   ├── failure-classifier.js         # Classifies different failure types
│   ├── formal-proof-layer.js         # Formal verification proofs
│   ├── formal-safety-model.js        # Formal safety model implementation
│   ├── graceful-shutdown.js          # Graceful shutdown procedures
│   ├── health-check.js               # System health checking
│   ├── human-override.js             # Human override controls
│   ├── input-validator.js            # Input validation utilities
│   ├── meta-governor.js              # Meta-level governance
│   ├── meta-metrics.js               # Meta-level metrics collection
│   ├── request-logger.js             # Request logging
│   ├── safe-patch-generator.js       # Generates safe code patches
│   ├── safety-validator.js           # Validates safety constraints
│   ├── self-healing-layer.js         # Self-healing capabilities
│   ├── system-integrity.js           # System integrity verification
│   ├── trust-boundary-hardening.js   # Trust boundary hardening
│   └── keychain-manager.js           # macOS Keychain integration
├── routes/                           # Express route modules
│   └── safety-routes.js              # Safety-related routes
├── xcode/                            # Xcode integration components
│   ├── CELClient.swift               # Swift client for Xcode
│   └── CELXcodeExtension/            # Xcode Extension implementation
│       └── CELXcodeExtension.swift   # Extension main file
├── security/                         # Security components
│   └── security-framework.js         # Security framework implementation
├── validation/                       # Validation suite
│   ├── conflict-tests.js             # Conflict detection tests
│   ├── determinism-tests.js          # Determinism verification tests
│   ├── entropy-tests.js              # Entropy measurement tests
│   ├── independent-proof-checker.js  # Independent proof verification
│   ├── run-validation.js             # Validation runner
│   ├── safety-tests.js               # Safety verification tests
│   ├── stress-tests.js               # Stress testing
│   └── validation-suite.js           # Complete validation suite
├── benchmarks/                       # Performance benchmarks
│   ├── performance-envelope.js       # Performance envelope analysis
│   └── performance-optimizer.js      # Performance optimization
├── ide/                              # Web-based IDE components
│   ├── app/                          # Main app files
│   ├── components/                   # React components
│   ├── lib/                          # IDE utilities
│   ├── stores/                       # State management
│   └── web-ide/                      # Vite-based web IDE
├── stats_engine/                     # Statistical analysis engine (Python/SciPy)
│   ├── app/                          # Python application
│   ├── tests/                        # Python tests
│   ├── Dockerfile                    # Python service Dockerfile
│   └── README.md                     # Python service documentation
├── public/                           # Static assets
│   ├── dashboard.html                # Main dashboard
│   └── xcode-dashboard.html         # Xcode integration dashboard
├── config/                           # Configuration files
│   ├── Dockerfile                    # Main Dockerfile
│   ├── docker-compose.yml            # Docker Compose configuration
│   ├── grafana/                      # Grafana dashboards
│   ├── log4js.json                   # Log4js configuration
│   ├── prometheus.yml                # Prometheus configuration
│   └── openapi.yaml                  # OpenAPI specification
├── monitoring/                       # Monitoring configuration
│   └── config.json                   # Monitoring configuration
├── __tests__/                        # Unit and integration tests
│   └── unit/                         # Unit tests
│       └── api-middleware.test.js    # API middleware tests
├── cli/                              # Command-line interface
│   ├── src/                          # CLI source files
│   ├── package.json                  # CLI package configuration
│   └── tsconfig.json                 # CLI TypeScript configuration
├── .github/                          # GitHub configuration
│   └── workflows/                    # GitHub Actions workflows
├── .vscode/                          # VSCode configuration
├── .claude/                         # Claude-specific configuration
├── docs/                             # Documentation (moved to README.md)
├── report/                           # Reports (moved to README.md)
├── reports/                          # Additional reports (empty)
├── dist/                             # Distribution files (empty)
├── node_modules/                     # NPM dependencies
├── .env.example                      # Environment variables template
├── .gitignore                        # Git ignore rules
├── .editorconfig                     # Editor configuration
├── .eslintrc.json                    # ESLint configuration
├── .eslintignore                     # ESLint ignore rules
├── .prettierrc.json                  # Prettier configuration
├── babel.config.cjs                  # Babel configuration
├── index.css                         # Main CSS file
├── tailwind.config.js                # Tailwind CSS configuration
├── tailwind.config.ts                # Tailwind CSS TypeScript config
├── test-tailwind.html                # Tailwind test HTML
├── LICENSE                           # MIT License
├── README.md                         # Main documentation
├── PROJECT_STRUCTURE.md              # This file
├── package.json                      # Main package configuration
├── package-lock.json                 # Locked dependencies
├── new-index.js                      # Alternative server entry point
├── requests-log.json                 # Request logging
└── cel.xcworkspace/                  # Xcode workspace
```

## Key Files and Their Purposes

### Core System Files
- `src/server/index.js` - Main server entry point with all integrated features (v4.2.1)
- `src/providers/provider-factory.js` - Handles multiple LLM providers with fallback chains
- `src/engines/orchestration-engine.js` - Core orchestration logic for multi-agent workflows
- `src/engines/formal-safety-model.js` - Formal verification of system safety
- `src/engines/self-healing-layer.js` - Self-healing capabilities for system resilience
- `src/engines/semantic-cache.js` - Semantic caching for cost optimization
- `src/engines/rag-engine.js` - RAG (Retrieval Augmented Generation) for context optimization

### Xcode Integration
- `xcode/CELClient.swift` - Native Swift client for Xcode integration
- `xcode/CELXcodeExtension/CELXcodeExtension.swift` - Xcode extension implementation

### Advanced Features
- `src/engines/semantic-cache.js` - Semantic caching for cost optimization
- `src/engines/rag-engine.js` - RAG (Retrieval Augmented Generation) for context optimization
- `src/security/keychain-manager.js` - Secure API key storage using macOS Keychain

### Testing and Validation
- `validation/` - Suite of tests for system validation
- `__tests__/unit/` - Unit tests for individual components
- `benchmarks/` - Performance benchmarking tools

### Security & Key Management
- `lib/keychain-manager.js` - Secure API key storage using macOS Keychain

### API Documentation
- `openapi.yaml` - Complete OpenAPI specification for the API

### Documentation
- `README.md` - Comprehensive documentation combining all project information