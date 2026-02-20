# System Architecture and Dependency Graph

## Component Interaction Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT LAYER                             │
├─────────────────────────────────────────────────────────────┤
│  Swift Client (Xcode)  │  Web IDE  │  CLI  │  VS Code Ext   │
└──────────┬─────────────────────────────────────────────┬────┘
           │                                             │
           ▼                                             ▼
┌────────────────────────┐                   ┌───────────────────────┐
│   HTTP/HTTPS Layer     │◀─────────────────▶│ WebSocket Streaming   │
└──────────┬─────────────┘                   └──────────┬────────────┘
           │                                            │
           ▼                                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   API GATEWAY                               │
├─────────────────────────────────────────────────────────────┤
│        Authentication        │        Rate Limiting         │
│        Request Validation    │        Load Balancing        │
└─────────────────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────────┐
│                 APPLICATION LAYER                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────────┐   │
│  │   Routes    │  │ Controllers │  │    Services      │   │
│  │             │  │             │  │                  │   │
│  │ - Chat      │  │ - Chat      │  │ - Provider       │   │
│  │ - Models    │  │ - Model     │  │ - Cache          │   │
│  │ - Health    │  │ - Health    │  │ - Usage Tracker  │   │
│  │ - Code      │  │ - Code      │  │ - RAG Engine     │   │
│  └─────────────┘  └─────────────┘  └──────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────────┐
│                 BUSINESS LOGIC LAYER                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │  Orchestration  │  │  Cognitive      │  │  Evolution  │ │
│  │     Engine      │  │    Workspace    │  │    Engine   │ │
│  └─────────────────┘  └─────────────────┘  └─────────────┘ │
│                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │  Stability      │  │  Constraint     │  │  Anti-      │ │
│  │    Engine       │  │    Solver       │  │  Stagnation │ │
│  └─────────────────┘  └─────────────────┘  │    Engine   │ │
│                                            └─────────────┘ │
└─────────────────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────────┐
│                  INTEGRATION LAYER                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────────┐   │
│  │   LLM       │  │   Storage   │  │    Security      │   │
│  │ Providers   │  │   Systems   │  │    Services      │   │
│  │             │  │             │  │                  │   │
│  │ - OpenAI    │  │ - File      │  │ - Vault          │   │
│  │ - Ollama    │  │   System    │  │ - Keychain       │   │
│  │ - Local     │  │ - Database  │  │ - Encryption     │   │
│  └─────────────┘  └─────────────┘  └──────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Key Component Dependencies

### 1. Security Layer Dependencies

```
VaultSecretsManager ──► Axios (HTTP client)
                      │
                      ├──► Crypto (built-in)
                      │
                      └──► LRU Cache

ClientEncryption ────► Crypto (built-in)
                    │
                    └──► Buffer (built-in)

KeychainManager ─────► Node-Keytar (native addon)
```

### 2. Server Core Dependencies

```
src/server/index.js ──► Express.js
                     │
                     ├──► All Engine Components
                     │   ├──► OrchestrationEngine
                     │   ├──► CognitiveWorkspaceCore
                     │   ├──► StabilityTheoryEngine
                     │   └──► ... (15+ engines)
                     │
                     ├──► Provider Factory System
                     │   ├──► BaseProvider
                     │   ├──► OpenRouterProvider
                     │   └──► OllamaProvider
                     │
                     ├──► Security Components
                     │   ├──► KeychainManager
                     │   └──► (Future) VaultSecretsManager
                     │
                     └──► Utility Libraries
                         ├──► dotenv
                         ├──► node-fetch
                         └──► fs/promises
```

### 3. Swift Client Dependencies

```
CELClient.swift ─────► Foundation
                    │
                    ├──► Combine (for async streams)
                    │
                    └──► Security (for Keychain)

Package.swift ──────► Swift 5.7+
                    │
                    └──► Platforms: macOS 12.0+
```

## Data Flow Patterns

### 1. Chat Request Flow

```
Client Request
      │
      ▼
[Authentication Middleware]
      │
      ▼
[Rate Limiting]
      │
      ▼
[Input Validation]
      │
      ▼
[Caching Layer] ──► Cache Hit? ── YES ──► Return Cached Response
      │                                │
      NO                             END
      │
      ▼
[RAG Context Optimization]
      │
      ▼
[Provider Selection]
      │
      ▼
[LLM API Call] ──► Retry Logic ──► Fallback Chain
      │
      ▼
[Response Processing]
      │
      ▼
[Usage Tracking]
      │
      ▼
Return to Client
```

### 2. Code Assistance Flow

```
Code Assist Request
      │
      ▼
[Project Context Analysis]
      │
      ▼
[Test/Lint Results Collection]
      │
      ▼
[Safety Validation]
      │
      ▼
[Multi-Model Processing]
      │
      ▼
[Response Aggregation]
      │
      ▼
[Change Application]
      │
      ▼
Return Enhanced Code
```

### 3. Security Flow

```
Sensitive Operation
      │
      ▼
[Formal Safety Model Check]
      │
      ▼
[Resource Governor Check]
      │
      ▼
[Access Control Verification]
      │
      ▼
[Encryption at Rest]
      │
      ▼
[Audit Logging]
      │
      ▼
Execute Operation
```

## Critical Paths and Bottlenecks

### Performance Critical Paths

1. **Request Processing Chain**
   ```
   HTTP Request → Router → Controller → Service → Provider → Response
   ```

2. **Security Validation Chain**
   ```
   Request → Auth → Safety Check → Resource Check → Encryption → Storage
   ```

3. **Data Retrieval Chain**
   ```
   Cache → RAG → Provider API → Response Processing → Client
   ```

### Identified Bottlenecks

1. **Monolithic Server File** (src/server/index.js)
   - 3,195 lines causing slow startup and maintenance issues
   - Single point of failure for entire application

2. **Sequential Provider Fallback**
   - Linear fallback chain creates latency
   - No parallel processing of backup options

3. **File System Operations**
   - Synchronous file operations in some components
   - No connection pooling for external services

## Scalability Considerations

### Horizontal Scaling
- Stateless server components enable easy horizontal scaling
- Shared caching layer required for consistency
- Session affinity needed for WebSocket connections

### Vertical Scaling
- Memory-intensive operations (RAG, caching) benefit from more RAM
- CPU-bound tasks (encryption, constraint solving) benefit from faster processors
- I/O operations benefit from SSD storage

### Database Scaling
- Current file-based storage limits scalability
- Future Redis/MongoDB integration enables better scaling
- Need sharding strategy for large datasets

## Failure Modes and Recovery

### Graceful Degradation Levels

1. **Level 1**: Full functionality
2. **Level 2**: Core features only (chat, basic code assist)
3. **Level 3**: Read-only mode (cached responses only)
4. **Level 4**: Maintenance mode (health checks only)

### Recovery Strategies

1. **Automatic Failover**
   - Provider fallback chains
   - Circuit breaker patterns
   - Load balancer health checks

2. **Manual Intervention**
   - Admin dashboard for system controls
   - Emergency rollback procedures
   - Manual cache clearing

3. **Data Recovery**
   - Regular backups of critical data
   - Point-in-time recovery capabilities
   - Disaster recovery procedures

## Monitoring and Observability

### Key Metrics to Track

1. **Performance Metrics**
   - Request latency (p50, p95, p99)
   - Throughput (requests/second)
   - Error rates
   - Resource utilization

2. **Business Metrics**
   - User engagement
   - Feature adoption
   - Cost per operation
   - Model performance

3. **System Health**
   - Component availability
   - Dependency health
   - Security incidents
   - Data consistency

### Alerting Thresholds

- **Critical**: >1% error rate, >500ms average latency
- **Warning**: >0.5% error rate, >300ms average latency
- **Info**: Routine operational metrics

## Future Architecture Evolution

### Phase 1: Current State
- Monolithic server with embedded components
- File-based storage and configuration
- Basic monitoring and logging

### Phase 2: Modular Architecture (Target)
- Microservices-inspired modular design
- Distributed caching and storage
- Comprehensive observability

### Phase 3: Cloud-Native (Long-term)
- Containerized deployment
- Auto-scaling capabilities
- Advanced AI/ML operations

---
*Architecture Diagram Last Updated: February 20, 2026*
*Dependencies Current as of: CEL v4.2.0*