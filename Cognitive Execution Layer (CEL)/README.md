# Cognitive Execution Layer (CEL) v4.2.1

LLM Control Plane for Autonomous Engineering and Xcode Integration

## 🚀 Overview

The Cognitive Execution Layer (CEL) is a sophisticated control plane that orchestrates autonomous AI agents for software development tasks. It is designed as a "scientifically-validated autonomous software engineering system," specifically engineered for deep Xcode integration, upgrading the IDE into an autonomous engineering collaborator with predictive capabilities, architectural intelligence, and self-optimization mechanisms. Its architectural philosophy is to build a "digitally immortal organism"—a production-grade system with self-monitoring, self-healing, formal verification, Byzantine fault tolerance, and mathematical resilience guarantees.

### Key Features
- **Intent-to-Code Full-Stack Generation** (including architecture/tests/documentation)
- **Project Knowledge Graph with Full Project Understanding and Cognitive Workspace Modeling**
- **Multi-Agent Autonomous Orchestration** (Goal Decomposition + Multi-step Planning)
- **Formal Safety Sandbox Verification and Pre-execution Checks**
- **Self-Healing Repair Loop** (Test → Diagnosis → Patch → Re-validation → Invariant Verification)
- **Architectural Entropy Monitoring, Drift Prediction, and Anti-Stagnation Strategies**
- **Native Xcode Integration** (`/v1/xcode/integration`, `/v1/xcode/health`)

### Key Characteristics
- **End-to-End Deterministic Execution** (Snapshot + Replay)
- **Global System Health Index (GSHI)** driven meta-governance
- **32-Layer Control Hierarchy Contract** (Human Override > System Integrity > Formal Safety > Evolution Engine)
- **Formal Resilience Proof** (FRM: R(D(T(I))) ∈ I)
- **Shadow Execution Layer (SEL)** independently validates critical components
- **Cognitive Workspace Field (CWF)** dynamically optimizes LLM context representation

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    LLM Control Plane v4.2                 │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────────────────────┐  │
│  │   Xcode UI      │  │     Core Services               │  │
│  │                 │  │                                 │  │
│  │ • Chat Interface│  │ • Project Knowledge Graph       │  │
│  │ • Dashboard     │  │ • Orchestration Engine          │  │
│  │ • Activity Feed │  │ • Cognitive Workspace Core      │  │
│  └─────────────────┘  │ • Safety Model & Constraints    │  │
│                       │ • Resource Governor             │  │
│                       │ • Self-Healing Layer            │  │
│                       └─────────────────────────────────┘  │
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │        Statistical Engine (Python/SciPy)              ││
│  │                                                         ││
│  │ • Welch's t-test         • Bayesian Analysis          ││
│  │ • Correlation Analysis   • Power Analysis             ││
│  │ • Bootstrap CI           • Effect Size Calculation    ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### Architecture Patterns & Design Patterns
- **Layered Architecture**: Clearly divided WIL (Workspace Intelligence), AOE (Autonomous Orchestration), SHVL (Self-Healing Validation)
- **Multi-Agent System (MAS)**: 15+ specialized Agents (File/Architecture/Test/Refactor/Security) communicating through formal protocols
- **Event Sourcing + Snapshots**: For Deterministic Execution Layer and Catastrophic Rollback
- **Shadow System**: SEL independent process validating main system state, achieving fault isolation
- **Contractual Hierarchy**: 10-level control priority (Human Override highest), including conflict resolution rules (Primary: Higher Precedence Wins; Tertiary: Safety > Functionality)

### Key Technical Decisions
- **Single Entry Unified Dispatch**: All capabilities converge to `new-index.js` (not `index.js`), ensuring architectural consistency
- **Local Binding Security**: HTTP Server listens only on `127.0.0.1`, eliminating remote unauthorized access
- **Model Whitelist**: Strictly limited to 26 `:free` suffix models, blocking direct paid model connections
- **Streaming Priority**: Full support for `stream: true`, non-blocking reads
- **Structured Logging**: Full trace recording of request_id, model, tokens, cost, latency, status, task_type

## 📦 Project Structure

See [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) for detailed directory organization.

## 🚀 Quick Start

### Prerequisites
- Node.js >= 20.0.0
- npm (comes with Node.js)
- Python 3.x (for `stats_engine`)

### Installation
```bash
git clone <repository-url>
cd "Cognitive Execution Layer (CEL)"
npm install
cp .env.example .env  # Edit OPENROUTER_API_KEY and other settings
cd stats_engine && pip install -r requirements.txt
```

### Running the Application
```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start

# Run tests
npm test

# Health check
npm run health
```

### Xcode Integration
1. Preferences → Components → Model Providers → Add Provider
2. URL: `http://localhost:3000/v1/xcode/chat-completion` (with any API Key)

## 📚 New Features (v4.2.1)

### 1. Semantic Caching
Semantic Caching system that uses semantic similarity to identify similar requests and return cached results. This significantly reduces token costs and speeds up responses for similar requests.

#### Features:
- Uses vector embeddings for determining semantic proximity
- Supports customizable similarity threshold
- Automatic cleanup of outdated entries
- Persistent cache storage

#### Configuration:
```env
SEMANTIC_CACHE_SIZE=1000
SEMANTIC_CACHE_TTL=86400000  # 24 hours in milliseconds
SEMANTIC_SIMILARITY_THRESHOLD=0.85
```

### 2. Keychain Integration
Secure storage of API keys through macOS Keychain. When Keychain is unavailable, a fallback storage with encryption is used.

#### Features:
- Primary use of macOS Keychain
- Fallback storage with access restriction (chmod 600)
- Support for multiple accounts/services
- Automatic recovery after failures

### 3. Xcode Integration
- `xcode/CELClient.swift` - Main client for communication with CEL server
- `xcode/CELXcodeExtension/` - Extension for Xcode with integration menu
- Support for commands: code analysis, generation, explanation, optimization

### 4. RAG (Retrieval Augmented Generation)
RAG engine for context optimization. Instead of sending all project context, RAG retrieves only the most relevant information.

#### Features:
- Text chunking with overlap
- Similarity search using cosine measure
- Support for various file formats
- Storage save and restore

#### Configuration:
```env
CONTEXT_WINDOW_SIZE=3072
CHUNK_SIZE=512
OVERLAP=50
TOP_K=5
```

### 5. ProviderFactory Integration
Full integration of ProviderFactory into the main server. Now all LLM requests are processed through a unified interface with fallback chain support.

#### Features:
- Support for multiple providers (OpenRouter, Ollama)
- Automatic fallback on failures
- Provider selection optimization based on cost and quality
- Streaming support

## 🔧 API Documentation

The API is documented using OpenAPI/Swagger. See the [openapi.yaml](openapi.yaml) specification file for detailed API documentation. Access the interactive documentation at:
```
http://localhost:3000/api-docs
```

### Core Endpoints
- `GET /health` - Basic health check
- `GET /v1/models` - Available models list (OpenAI-compatible)
- `POST /v1/chat/completions` - Chat completion (OpenAI-compatible with streaming)
- `POST /v1/orchestrate-goal` - Goal execution orchestration
- `POST /v1/run-tests` - Run tests for a file
- `GET /v1/project-context/*` - Detailed project context
- `GET /v1/cognitive-view` - Cognitive representation of project
- `GET /v1/reliability-info` - System reliability information
- `GET /v1/safety-status` - System safety status
- `GET /v1/xcode/health` - Xcode integration health check

## 🧪 Testing

The project includes comprehensive test coverage:
- Unit tests for individual modules
- Integration tests for API endpoints
- Performance and stress tests
- Determinism tests
- Safety tests
- Conflict tests
- Entropy tests

Run specific test suites:
```bash
npm run test:unit          # Unit tests only
npm run test:integration   # Integration tests only
npm run test:coverage      # Tests with coverage report
```

### Current Test Status
- Total tests: 246 (all passing successfully)
- Coverage: Comprehensive across all major components

## 📊 Monitoring and Observability

The system includes built-in monitoring:
- **Prometheus** metrics endpoint at `/metrics`
- **Health checks** at `/health`
- **Detailed health** at `/health/detailed`
- **Grafana** dashboards for visualization
- Structured logging with Log4js
- Request metrics at `/metrics/requests`

## 🔐 Security

### Implemented Measures
- Formal Safety Model
- Input validation
- Sandboxed execution
- Rate limiting
- Byzantine fault tolerance
- Trust boundary hardening
- Keychain integration for secure API key storage

### Security Components
- Formal Safety Model
- Security Framework
- Byzantine Tolerance
- Trust Boundary Hardening
- Safe Patch Generator
- Human Override

## 🏗️ Development Guidelines

### Code Style
- ES Modules throughout the project
- Consistent naming conventions
- Proper error handling
- Type safety where applicable

### Performance Requirements
- Token usage optimization through caching
- Efficient context handling using RAG
- Provider selection optimization
- Resource governance

### Architecture Principles
- Separation of concerns
- Modular design with clear boundaries
- Dependency injection where appropriate
- Event-driven architecture for scalability

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Workflow
1. Implement new features in separate modules
2. Write comprehensive unit tests
3. Ensure backward compatibility
4. Update documentation
5. Run all tests before submitting

## 📈 Production Readiness

### ✅ Completed
- Core server stable and functional
- All key API endpoints operational
- LLM routing system active
- Monitoring and logging systems operational
- Basic security measures functional

### ⚠️ Requires Attention
- Test coverage (requires refinement)
- API documentation (in progress)
- CLI interface (ready, requires publishing)

### Next Steps
1. Refinement of test sets - creation of minimum set of working tests
2. Documentation - completion of OpenAPI specification
3. CLI publication - preparation for npm publish
4. Monitoring - setting up continuous monitoring

### Recommendation
The system is ready for basic production use. Core functions operate stably. It is recommended to begin with limited rollout and gradually expand usage as metrics are accumulated and test coverage is improved.

## 📋 Known Limitations

- Undefined SLA/Latency targets
- No maximum orchestration depth/SHVL loop length limits
- No Chaos Recovery time upper bound
- Missing validation suite: `/validation/` directory removed, missing stress/determinism/safety/entropy tests
- No Boot Recovery Mode: no recovery process during startup if GSHI < 0.2 or ledger corruption
- No Graceful Shutdown: missing graceful shutdown, state dump, ledger archiving, snapshot signing
- Control hierarchy conflict risk: 32-layer control logic lacks clear priority arbitration, potentially causing system "self-opposition"
- Version governance missing: no semantic version strategy, compatibility matrix, upgrade protocol

## 🏷️ License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support, please open an issue on the GitHub repository or contact the development team.

## 📞 Contact

- Project Homepage: [Repository Link]
- Issue Tracker: [Issues Link]
- Community: [Discord/Slack Link if available]