# Cognitive Execution Layer (CEL) - Project Structure

## Overview
This document describes the project structure of the Cognitive Execution Layer (CEL), an advanced AI-powered development platform with integrated CLI and Web IDE.

## Directory Structure

```
CEL Root/
├── cli/                          # Command Line Interface
│   ├── enhanced-cli.js           # Enhanced CLI implementation
│   ├── index.js                  # Main CLI entry point
│   ├── package.json              # CLI dependencies and scripts
│   └── src/                      # CLI source files
├── ide/                          # Web-based IDE
│   └── web-ide/                  # React-based IDE implementation
│       ├── src/
│       │   ├── components/       # React UI components
│       │   │   ├── ChatPanel.tsx # AI Assistant panel
│       │   │   ├── Editor.tsx    # Code editor component
│       │   │   ├── FileExplorer.tsx # File explorer
│       │   │   └── StatusBar.tsx # Status bar
│       │   ├── stores/           # Zustand stores
│       │   │   └── ideStore.ts   # Centralized state management
│       │   ├── App.tsx           # Main application component
│       │   ├── main.tsx          # Application entry point
│       │   └── index.css         # Global styles
│       ├── package.json          # IDE dependencies
│       └── index.html            # HTML entry point
├── src/
│   ├── server/                   # Main server implementation
│   │   ├── index.js              # Main server entry point
│   │   └── routes/               # API routes
│   ├── engines/                  # Core AI engines
│   │   ├── semantic-cache.js     # Semantic caching engine
│   │   ├── rag-engine.js         # Retrieval Augmented Generation engine
│   │   ├── advanced-usage-tracker.js # Usage tracking
│   │   ├── cost-optimizer.js     # Cost optimization engine
│   │   └── ...                   # Other engines
│   ├── providers/                # LLM provider implementations
│   │   └── provider-factory.js   # Provider abstraction layer
│   └── security/                 # Security components
│       └── keychain-manager.js   # Secure credential management
├── lib/                          # Core libraries
│   ├── formal-safety-model.js    # Safety verification system
│   └── self-healing-layer.js     # Self-healing capabilities
├── xcode/                        # Xcode integration
│   ├── CELClient.swift           # Swift client for Xcode
│   └── CELXcodeExtension/        # Xcode extension
├── docs/                         # Documentation
├── validation/                   # Validation utilities
├── stats_engine/                 # Statistical analysis engine
├── .env.example                  # Example environment variables
├── .gitignore                    # Git ignore rules
├── LICENSE                       # License information
├── README.md                     # Main project documentation
├── package.json                  # Main project dependencies
├── start-cel.sh                  # Startup script
├── health-check.sh               # Health check script
└── run-web-ide.sh                # Web IDE startup script
```

## Key Components

### CLI (Command Line Interface)
The CLI provides terminal-based access to all CEL features with AI-powered assistance. It includes:
- Interactive chat functionality
- Code generation capabilities
- Refactoring tools
- Git integration
- Testing utilities
- Goal-oriented task execution

### Web IDE
A modern, VS Code-inspired web-based IDE with:
- File explorer and project navigation
- Syntax-highlighted code editor
- Integrated AI chat panel
- Context-aware code suggestions
- One-click refactor and explanation tools
- Git integration

### Core Engines
- **Semantic Cache**: Reduces token costs by identifying and reusing similar requests
- **RAG Engine**: Optimizes context by retrieving only relevant information
- **Provider Factory**: Abstraction layer supporting multiple LLM providers
- **Keychain Manager**: Secure storage of API keys and credentials
- **Formal Safety Model**: Verification system for code safety

### Server Infrastructure
- Express.js-based API server
- OpenAI-compatible API endpoints
- WebSocket support for streaming
- Comprehensive logging and monitoring
- Health check endpoints