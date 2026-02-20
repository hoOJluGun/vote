# Cognitive Execution Layer (CEL) - Repository Structure

## Repository Organization

The CEL repository is organized as a monorepo with clear separation of concerns and modular components. Each major component has its own subdirectory with dedicated documentation, tests, and configuration.

```
cel/
├── README.md                     # Main project overview
├── CONTRIBUTING.md              # Contribution guidelines
├── LICENSE                      # Licensing information
├── SECURITY.md                  # Security policy
├── CODE_OF_CONDUCT.md           # Community guidelines
├── .github/                     # GitHub configuration
│   ├── workflows/               # CI/CD configurations
│   │   ├── rust.yml             # Rust build and test workflow
│   │   ├── nodejs.yml           # Node.js build and test workflow
│   │   ├── python.yml           # Python ML model workflow
│   │   ├── swift.yml            # Swift IDE extension workflow
│   │   └── release.yml          # Release automation workflow
│   ├── ISSUE_TEMPLATE/          # Issue templates
│   └── PULL_REQUEST_TEMPLATE.md # PR template
├── packages/                    # Monorepo packages
│   ├── cel-core/                # Core cognitive engine
│   │   ├── Cargo.toml          # Rust package manifest
│   │   ├── src/                # Rust source code
│   │   │   ├── lib.rs          # Library entry point
│   │   │   ├── cognitive/      # Cognitive processing modules
│   │   │   ├── reasoning/      # Reasoning engine modules
│   │   │   └── knowledge_graph/ # Knowledge graph modules
│   │   ├── benches/            # Benchmark tests
│   │   ├── examples/           # Usage examples
│   │   ├── tests/              # Integration tests
│   │   ├── docs/               # Internal documentation
│   │   ├── target/             # Build artifacts (gitignored)
│   │   └── Cargo.lock          # Dependency lock file
│   ├── cel-runtime-analyzer/    # Runtime analysis engine
│   │   ├── Cargo.toml
│   │   ├── src/
│   │   │   ├── lib.rs
│   │   │   ├── shadow_runtime/
│   │   │   ├── performance/
│   │   │   └── bottleneck/
│   │   ├── benches/
│   │   ├── tests/
│   │   └── docs/
│   ├── cel-autonomous-tools/    # Autonomous tooling
│   │   ├── Cargo.toml
│   │   ├── src/
│   │   │   ├── lib.rs
│   │   │   ├── refactoring/
│   │   │   ├── healing/
│   │   │   └── intent/
│   │   ├── benches/
│   │   ├── tests/
│   │   └── docs/
│   ├── cel-ai-router/           # AI routing service
│   │   ├── package.json        # Node.js package manifest
│   │   ├── tsconfig.json       # TypeScript configuration
│   │   ├── src/
│   │   │   ├── index.ts        # Entry point
│   │   │   ├── router/
│   │   │   ├── optimizer/
│   │   │   └── context/
│   │   ├── dist/               # Compiled output (gitignored)
│   │   ├── tests/              # Unit and integration tests
│   │   ├── docs/
│   │   └── jest.config.js      # Test configuration
│   ├── cel-security/            # Security and privacy controls
│   │   ├── Cargo.toml
│   │   ├── src/
│   │   │   ├── lib.rs
│   │   │   ├── sandbox/
│   │   │   ├── privacy/
│   │   │   └── access_control/
│   │   ├── benches/
│   │   ├── tests/
│   │   └── docs/
│   ├── cel-ide-bridge/          # IDE integration layer
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── xcode_extension/
│   │   │   ├── plugin_api/
│   │   │   └── ui_components/
│   │   ├── dist/
│   │   ├── tests/
│   │   └── docs/
│   └── cel-ml-service/          # ML model service
│       ├── requirements.txt     # Python dependencies
│       ├── Dockerfile           # Container configuration
│       ├── app/
│       │   ├── main.py         # FastAPI entry point
│       │   ├── models/         # ML model definitions
│       │   ├── routers/        # API route definitions
│       │   ├── utils/          # Utility functions
│       │   └── schemas/        # Data schemas
│       ├── tests/              # Tests
│       ├── notebooks/          # Jupyter notebooks for experimentation
│       ├── models/             # Trained model files (gitignored)
│       └── docs/
├── infrastructure/              # Infrastructure as Code
│   ├── docker/                  # Docker configurations
│   │   ├── docker-compose.yml  # Multi-service composition
│   │   ├── core.Dockerfile     # Core service container
│   │   ├── ml.Dockerfile       # ML service container
│   │   └── router.Dockerfile   # Router service container
│   ├── kubernetes/              # Kubernetes configurations
│   │   ├── deployments/        # Deployment manifests
│   │   ├── services/           # Service definitions
│   │   ├── ingress/            # Ingress configurations
│   │   └── configmaps/         # Configuration files
│   └── terraform/               # Terraform configurations
│       ├── aws/                # AWS infrastructure
│       ├── gcp/                # Google Cloud Platform
│       └── azure/              # Microsoft Azure
├── deployment/                  # Deployment configurations
│   ├── local/                   # Local development setup
│   │   ├── docker-compose.dev.yml
│   │   └── dev-setup.sh
│   ├── staging/                 # Staging environment
│   │   ├── docker-compose.staging.yml
│   │   └── deploy-staging.sh
│   └── production/              # Production environment
│       ├── docker-compose.prod.yml
│       ├── deploy-prod.sh
│       └── monitoring/
├── scripts/                     # Automation scripts
│   ├── build-all.sh            # Build all packages
│   ├── test-all.sh             # Test all packages
│   ├── release.sh              # Release automation
│   ├── setup-dev-env.sh        # Developer environment setup
│   └── update-deps.sh          # Dependency updates
├── docs/                        # Documentation
│   ├── api/                     # API documentation
│   │   ├── cognitive-engine.md
│   │   ├── runtime-analyzer.md
│   │   └── ai-router.md
│   ├── guides/                  # User guides
│   │   ├── getting-started.md
│   │   ├── architecture-vision.md
│   │   └── best-practices.md
│   ├── specs/                   # Technical specifications
│   │   ├── knowledge-graph-spec.md
│   │   ├── cognitive-workspace-spec.md
│   │   └── prediction-model-spec.md
│   └── architecture/            # Architecture documentation
│       ├── overview.md
│       ├── components.md
│       └── data-flow.md
├── testing/                     # Comprehensive test suite
│   ├── unit/                    # Unit tests for each package
│   ├── integration/             # Integration tests
│   ├── e2e/                     # End-to-end tests
│   ├── performance/             # Performance benchmarks
│   └── cognitive/               # Cognitive reasoning tests
├── assets/                      # Static assets
│   ├── logos/                   # Brand logos
│   ├── diagrams/                # Architecture diagrams
│   └── screenshots/             # UI screenshots
├── config/                      # Configuration files
│   ├── development.json        # Development config
│   ├── staging.json            # Staging config
│   └── production.json         # Production config
├── .gitignore                   # Git ignore rules
├── .dockerignore               # Docker ignore rules
├── .prettierrc                 # Code formatting config
├── .eslintrc.js                # ESLint configuration
├── .rustfmt.toml               # Rust formatting config
└── Makefile                     # Common commands
```

## Package Dependencies

### Core Packages Dependencies Tree
```
cel-core
├── cel-security (security primitives)
├── cel-runtime-analyzer (runtime analysis)
└── cel-autonomous-tools (autonomous actions)

cel-ai-router
├── cel-core (for cognitive insights)
└── cel-ide-bridge (for IDE communication)

cel-ide-bridge
├── cel-core (for cognitive insights)
├── cel-ai-router (for AI requests)
└── cel-runtime-analyzer (for performance data)

cel-ml-service
├── cel-core (for data schemas)
└── cel-security (for privacy controls)
```

## Development Workflow

### 1. Setting up Development Environment
```bash
# Clone the repository
git clone https://github.com/your-org/cel.git
cd cel

# Setup development environment
./scripts/setup-dev-env.sh

# Build all packages
./scripts/build-all.sh
```

### 2. Running Tests
```bash
# Run tests for all packages
./scripts/test-all.sh

# Run tests for specific package
cd packages/cel-core
cargo test

# Run integration tests
cd testing/integration
npm test
```

### 3. Building and Deploying
```bash
# Build all packages
make build

# Deploy to local environment
make deploy-local

# Deploy to staging
make deploy-staging

# Deploy to production
make deploy-production
```

## Versioning Strategy

The project follows semantic versioning (SemVer) with the following rules:

- MAJOR.MINOR.PATCH format
- Breaking changes increment MAJOR version
- New features increment MINOR version
- Bug fixes increment PATCH version
- Pre-release versions use alpha/beta suffixes

## Branching Strategy

- `main`: Production-ready code
- `develop`: Integration branch for features
- `feature/*`: Individual feature branches
- `release/*`: Release preparation branches
- `hotfix/*`: Emergency fixes for production

## Code Quality Standards

### 1. Rust Code
- Follow Rust idioms and best practices
- Use `rustfmt` for consistent formatting
- Use `clippy` for linting
- Maintain high test coverage (>80%)

### 2. TypeScript Code
- Use TypeScript strict mode
- Follow Airbnb JavaScript Style Guide
- Use ESLint and Prettier for consistency
- Write tests for all business logic

### 3. Python Code
- Follow PEP 8 style guide
- Use type hints for all public APIs
- Document all public functions
- Maintain consistent test coverage

## Release Process

1. Merge all features for the release into `develop`
2. Create a release branch from `develop`
3. Update version numbers in all packages
4. Run full test suite
5. Update documentation
6. Create release candidate and test in staging
7. Merge release branch to `main`
8. Tag the release with version number
9. Publish packages to registries
10. Announce release to community