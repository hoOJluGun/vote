# Cognitive Execution Layer (CEL) - CI/CD Pipeline

## CI/CD Architecture Overview

The CI/CD pipeline for CEL is designed to ensure rapid, reliable, and secure delivery of features while maintaining high quality standards. The pipeline incorporates multiple stages of testing, security scanning, and validation before deployment to production.

```
CI/CD Pipeline Architecture:
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Code Commit   │───▶│  Pull Request   │───▶│  Merge to Dev   │
│   (GitHub)      │    │  Validation     │    │  (Main Branch)  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│ Pre-commit     │    │ Build & Test   │    │ Integration     │
│ Hooks          │    │ (All Services)  │    │ Testing        │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│ Code Quality   │    │ Security Scan   │    │ Staging Deploy │
│ Check          │    │ (SAST/DAST)     │    │ (Automated)    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│ Unit Tests     │    │ Performance     │    │ Production      │
│ (All Services) │    │ Testing         │    │ Promotion      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Repository Structure for CI/CD

### GitHub Workflows Directory
```
.github/
├── workflows/
│   ├── rust-build-test.yml          # Rust service builds and tests
│   ├── nodejs-build-test.yml        # Node.js service builds and tests
│   ├── python-build-test.yml        # Python ML service builds and tests
│   ├── security-scan.yml            # Security scanning workflow
│   ├── integration-tests.yml        # Integration testing workflow
│   ├── performance-tests.yml        # Performance testing workflow
│   ├── release.yml                  # Release and deployment workflow
│   ├── code-quality.yml             # Code quality checks
│   └── pr-validator.yml             # Pull request validation
├── dependabot/
│   ├── rust.yml                     # Rust dependency updates
│   ├── nodejs.yml                   # Node.js dependency updates
│   └── python.yml                   # Python dependency updates
└── ISSUE_TEMPLATE/
    ├── bug_report.md
    ├── feature_request.md
    └── security_vulnerability.md
```

## Detailed Pipeline Stages

### 1. Pre-commit Stage

This stage runs on the developer's machine before committing code.

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/prettier/prettier
    rev: 2.7.1
    hooks:
      - id: prettier
        types_or: [ts, tsx, js, jsx, json, yaml, markdown]

  - repo: https://github.com/charliermarsh/ruff-pre-commit
    rev: v0.0.276
    hooks:
      - id: ruff
        args: [--fix, --exit-non-zero-on-fix]

  - repo: https://github.com/doublify/pre-commit-rust
    rev: v1.0
    hooks:
      - id: fmt
      - id: cargo-check
      - id: clippy
```

### 2. Pull Request Validation

This stage runs automatically when a pull request is opened or updated.

#### Rust Services Validation (.github/workflows/rust-build-test.yml)
```yaml
name: Rust Build & Test

on:
  pull_request:
    paths:
      - 'packages/cel-core/**'
      - 'packages/cel-runtime-analyzer/**'
      - 'packages/cel-autonomous-tools/**'
      - 'packages/cel-security/**'

env:
  CARGO_TERM_COLOR: always

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        rust: [stable, beta]
        
    steps:
      - uses: actions/checkout@v3
      
      - name: Install Rust
        uses: dtolnay/rust-toolchain@master
        with:
          toolchain: ${{ matrix.rust }}
          
      - name: Cache dependencies
        uses: actions/cache@v3
        with:
          path: |
            ~/.cargo/registry
            ~/.cargo/git
            target
          key: ${{ runner.os }}-cargo-${{ hashFiles('**/Cargo.lock') }}
          
      - name: Run tests
        run: |
          cd packages/cel-core && cargo test --verbose
          cd ../cel-runtime-analyzer && cargo test --verbose
          cd ../cel-autonomous-tools && cargo test --verbose
          cd ../cel-security && cargo test --verbose
          
      - name: Check formatting
        run: |
          cd packages/cel-core && cargo fmt --check
          cd ../cel-runtime-analyzer && cargo fmt --check
          cd ../cel-autonomous-tools && cargo fmt --check
          cd ../cel-security && cargo fmt --check
          
      - name: Run clippy
        run: |
          cd packages/cel-core && cargo clippy -- -D warnings
          cd ../cel-runtime-analyzer && cargo clippy -- -D warnings
          cd ../cel-autonomous-tools && cargo clippy -- -D warnings
          cd ../cel-security && cargo clippy -- -D warnings
          
      - name: Generate coverage report
        run: |
          cd packages/cel-core && cargo llvm-cov --lcov --output-path lcov.info
        continue-on-error: true
```

#### Node.js Services Validation (.github/workflows/nodejs-build-test.yml)
```yaml
name: Node.js Build & Test

on:
  pull_request:
    paths:
      - 'packages/cel-ai-router/**'
      - 'packages/cel-ide-bridge/**'

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18.x, 20.x]
        
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'
          cache-dependency-path: packages/cel-ai-router/package-lock.json
          
      - name: Install dependencies
        run: |
          cd packages/cel-ai-router && npm ci
          cd ../cel-ide-bridge && npm ci
          
      - name: Run linting
        run: |
          cd packages/cel-ai-router && npm run lint
          cd ../cel-ide-bridge && npm run lint
          
      - name: Run type checking
        run: |
          cd packages/cel-ai-router && npm run type-check
          cd ../cel-ide-bridge && npm run type-check
          
      - name: Run tests
        run: |
          cd packages/cel-ai-router && npm run test:coverage
          cd ../cel-ide-bridge && npm run test:coverage
          
      - name: Build packages
        run: |
          cd packages/cel-ai-router && npm run build
          cd ../cel-ide-bridge && npm run build
```

#### Python ML Service Validation (.github/workflows/python-build-test.yml)
```yaml
name: Python Build & Test

on:
  pull_request:
    paths:
      - 'packages/cel-ml-service/**'

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        python-version: [3.9, 3.10, 3.11]
        
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: ${{ matrix.python-version }}
          
      - name: Install dependencies
        run: |
          cd packages/cel-ml-service
          pip install -r requirements.txt
          pip install pytest pytest-cov flake8 mypy
          
      - name: Run linting
        run: |
          cd packages/cel-ml-service
          flake8 .
          black --check .
          
      - name: Run type checking
        run: |
          cd packages/cel-ml-service
          mypy .
          
      - name: Run tests
        run: |
          cd packages/cel-ml-service
          pytest --cov=app --cov-report=xml
          
      - name: Security scan with Bandit
        run: |
          cd packages/cel-ml-service
          bandit -r app/
```

### 3. Security Scanning Stage

#### Combined Security Scan (.github/workflows/security-scan.yml)
```yaml
name: Security Scan

on:
  schedule:
    - cron: '0 2 * * 1'  # Weekly
  pull_request:
    branches: [main, develop]

jobs:
  security-scan:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      # SAST scanning
      - name: CodeQL Analysis
        uses: github/codeql-action/analyze@v2
        with:
          languages: rust, javascript, python
          
      # Dependency scanning
      - name: Dependency Review
        uses: actions/dependency-review-action@v2
        
      # Container scanning (if applicable)
      - name: Run Trivy vulnerability scanner in repo mode
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'fs'
          scan-ref: '.'
          format: 'sarif'
          output: 'trivy-results.sarif'
          
      - name: Upload Trivy scan results
        uses: github/codeql-action/upload-sarif@v2
        if: always()
        with:
          sarif_file: 'trivy-results.sarif'
          
      # Secret scanning
      - name: Secret Scanning with Gitleaks
        uses: gacts/gitleaks@v1
```

### 4. Integration Testing Stage

#### Integration Tests (.github/workflows/integration-tests.yml)
```yaml
name: Integration Tests

on:
  pull_request:
    branches: [main, develop]
  workflow_run:
    workflows: ["Rust Build & Test", "Node.js Build & Test", "Python Build & Test"]
    types: [completed]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  integration-test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:13
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: cel_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
      redis:
        image: redis:6-alpine
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 6379:6379
          
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: 'npm'
          
      - name: Setup Rust
        uses: dtolnay/rust-toolchain@stable
          
      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: 3.10
          
      - name: Install dependencies
        run: |
          cd packages/cel-ai-router && npm ci
          cd ../cel-ide-bridge && npm ci
          
      - name: Build all services
        run: |
          cd packages/cel-core && cargo build --release
          cd ../cel-runtime-analyzer && cargo build --release
          cd ../cel-ml-service && pip install -r requirements.txt
          
      - name: Run integration tests
        run: |
          cd testing/integration
          npm install
          npm run test:integration
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/cel_test
          REDIS_URL: redis://localhost:6379
```

### 5. Staging Deployment Stage

#### Automated Staging Deployment (.github/workflows/release.yml)
```yaml
name: Release & Deployment

on:
  push:
    branches: [main]
  workflow_dispatch:
    inputs:
      environment:
        description: 'Target environment'
        required: true
        default: 'staging'
        type: choice
        options:
          - staging
          - production

jobs:
  # Determine if this is a staging or production deployment
  determine-deployment:
    runs-on: ubuntu-latest
    outputs:
      deploy-type: ${{ steps.check.outputs.deploy-type }}
    steps:
      - id: check
        run: |
          if [[ "${{ github.event.inputs.environment }}" == "production" ]] || [[ "${{ github.ref }}" == "refs/heads/main" ]]; then
            echo "deploy-type=production" >> $GITHUB_OUTPUT
          else
            echo "deploy-type=staging" >> $GITHUB_OUTPUT
          fi
  
  # Build Docker images for all services
  build-images:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        service: [core, runtime-analyzer, autonomous-tools, ai-router, ml-service, security]
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v2
        
      - name: Login to Container Registry
        uses: docker/login-action@v2
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
          
      - name: Build and push Docker images
        uses: docker/build-push-action@v4
        with:
          context: .
          file: ./infrastructure/docker/${{ matrix.service }}.Dockerfile
          push: true
          tags: |
            ghcr.io/${{ github.repository }}/${{ matrix.service }}:${{ github.sha }}
            ghcr.io/${{ github.repository }}/${{ matrix.service }}:latest
          cache-from: type=gha
          cache-to: type=gha,mode=max
  
  # Deploy to staging environment
  deploy-staging:
    needs: [build-images]
    if: ${{ needs.determine-deployment.outputs.deploy-type == 'staging' }}
    runs-on: ubuntu-latest
    environment: staging
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Kubectl
        uses: azure/setup-kubectl@v3
        with:
          version: 'latest'
          
      - name: Set up Kustomize
        run: |
          curl -s "https://raw.githubusercontent.com/kubernetes-sigs/kustomize/master/hack/install_kustomize.sh" | bash
          sudo install kustomize /usr/local/bin
          
      - name: Configure kubectl
        run: |
          mkdir -p $HOME/.kube
          echo "${{ secrets.KUBE_CONFIG_DATA }}" | base64 -d > $HOME/.kube/config
          
      - name: Deploy to staging
        run: |
          cd deployment/staging
          kustomize edit set image ghcr.io/${{ github.repository }}/core:latest=ghcr.io/${{ github.repository }}/core:${{ github.sha }}
          kustomize edit set image ghcr.io/${{ github.repository }}/runtime-analyzer:latest=ghcr.io/${{ github.repository }}/runtime-analyzer:${{ github.sha }}
          kustomize edit set image ghcr.io/${{ github.repository }}/autonomous-tools:latest=ghcr.io/${{ github.repository }}/autonomous-tools:${{ github.sha }}
          kustomize edit set image ghcr.io/${{ github.repository }}/ai-router:latest=ghcr.io/${{ github.repository }}/ai-router:${{ github.sha }}
          kustomize edit set image ghcr.io/${{ github.repository }}/ml-service:latest=ghcr.io/${{ github.repository }}/ml-service:${{ github.sha }}
          kustomize edit set image ghcr.io/${{ github.repository }}/security:latest=ghcr.io/${{ github.repository }}/security:${{ github.sha }}
          kubectl apply -k .
          
      - name: Wait for rollout
        run: |
          kubectl rollout status deployment/cel-core-deployment -n cel-staging --timeout=300s
          kubectl rollout status deployment/cel-runtime-analyzer-deployment -n cel-staging --timeout=300s
          kubectl rollout status deployment/cel-ai-router-deployment -n cel-staging --timeout=300s
          
      - name: Run smoke tests
        run: |
          cd testing/e2e
          npm install
          npm run test:smoke -- --target staging
          
      - name: Notify deployment
        run: |
          curl -X POST -H 'Content-type: application/json' \
          --data '{"text":"Staging deployment completed successfully for commit ${{ github.sha }}"}' \
          ${{ secrets.SLACK_WEBHOOK_URL }}
  
  # Deploy to production environment
  deploy-production:
    needs: [build-images, deploy-staging]
    if: ${{ needs.determine-deployment.outputs.deploy-type == 'production' }}
    runs-on: ubuntu-latest
    environment: production
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Kubectl
        uses: azure/setup-kubectl@v3
        with:
          version: 'latest'
          
      - name: Configure kubectl
        run: |
          mkdir -p $HOME/.kube
          echo "${{ secrets.PROD_KUBE_CONFIG_DATA }}" | base64 -d > $HOME/.kube/config
          
      - name: Deploy to production
        run: |
          cd deployment/production
          kustomize edit set image ghcr.io/${{ github.repository }}/core:latest=ghcr.io/${{ github.repository }}/core:${{ github.sha }}
          kustomize edit set image ghcr.io/${{ github.repository }}/runtime-analyzer:latest=ghcr.io/${{ github.repository }}/runtime-analyzer:${{ github.sha }}
          kustomize edit set image ghcr.io/${{ github.repository }}/autonomous-tools:latest=ghcr.io/${{ github.repository }}/autonomous-tools:${{ github.sha }}
          kustomize edit set image ghcr.io/${{ github.repository }}/ai-router:latest=ghcr.io/${{ github.repository }}/ai-router:${{ github.sha }}
          kustomize edit set image ghcr.io/${{ github.repository }}/ml-service:latest=ghcr.io/${{ github.repository }}/ml-service:${{ github.sha }}
          kustomize edit set image ghcr.io/${{ github.repository }}/security:latest=ghcr.io/${{ github.repository }}/security:${{ github.sha }}
          kubectl apply -k .
          
      - name: Wait for rollout
        run: |
          kubectl rollout status deployment/cel-core-deployment -n cel-production --timeout=600s
          kubectl rollout status deployment/cel-runtime-analyzer-deployment -n cel-production --timeout=600s
          kubectl rollout status deployment/cel-ai-router-deployment -n cel-production --timeout=600s
          
      - name: Run production smoke tests
        run: |
          cd testing/e2e
          npm run test:smoke -- --target production
          
      - name: Notify deployment
        run: |
          curl -X POST -H 'Content-type: application/json' \
          --data '{"text":"Production deployment completed successfully for commit ${{ github.sha }}"}' \
          ${{ secrets.SLACK_WEBHOOK_URL }}
```

## Quality Gates and Approvals

### 1. Automated Quality Gates

Each stage of the pipeline enforces quality gates:

- **Code Coverage**: Minimum 80% for all services
- **Security Score**: No critical vulnerabilities
- **Performance**: Response times within acceptable limits
- **Integration Tests**: 100% pass rate required

### 2. Manual Approval Process

For production deployments, manual approvals are required:

1. **Team Lead Approval**: For major feature deployments
2. **Security Review**: For changes affecting security
3. **Operations Approval**: For infrastructure changes
4. **Product Owner Approval**: For user-facing features

## Monitoring and Observability

### 1. Pipeline Metrics

The CI/CD pipeline itself is monitored for:

- Build success/failure rates
- Average build times
- Test execution times
- Deployment frequency
- Lead time for changes

### 2. Deployment Tracking

All deployments are tracked with:

- Git commit SHA
- Deployment timestamp
- Deployed services and versions
- Rollback procedures if needed
- Post-deployment validation results

## Rollback Procedures

### 1. Automated Rollback Criteria

- Health checks failing for 5 minutes
- Error rates exceeding 5% for 10 minutes
- Performance degradation exceeding 50%

### 2. Manual Rollback Process

1. Identify problematic deployment
2. Trigger rollback workflow
3. Validate rollback success
4. Investigate root cause
5. Apply fix and redeploy

This comprehensive CI/CD pipeline ensures that CEL maintains high quality, security, and reliability standards throughout the development and deployment lifecycle.