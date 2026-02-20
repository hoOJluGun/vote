# Cognitive Execution Layer (CEL) - Development Guide

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- Git
- IDE with JavaScript/Node.js support

### Initial Setup

```bash
# Clone repository
git clone <repository-url>
cd cognitive-execution-layer

# Install dependencies
npm install

# Set up environment
cp .env.example .env

# Run in development mode
npm run dev
```

## Project Structure

```
cognitive-execution-layer/
├── src/
│   ├── server/
│   │   └── index.js          # Main server entry point
│   ├── engines/
│   │   ├── orchestration-engine.js
│   │   ├── project-knowledge-graph.js
│   │   ├── virtual-sandbox.js
│   │   ├── evolution-engine.js
│   │   ├── stability-engine.js
│   │   ├── anti-stagnation-engine.js
│   │   ├── constraint-solver.js
│   │   ├── temporal-simulator.js
│   │   ├── mutation-ledger.js
│   │   └── economic-resilience.js
│   ├── middleware/
│   │   ├── input-validator.js
│   │   ├── error-handler.js
│   │   ├── request-logger.js
│   │   ├── config.js
│   │   ├── health-check.js
│   │   └── graceful-shutdown.js
│   └── routes/
│       ├── main-routes.js
│       ├── orchestration-routes.js
│       ├── testing-routes.js
│       ├── context-routes.js
│       ├── reliability-routes.js
│       ├── self-healing-routes.js
│       └── additional-routes.js
├── docs/
│   ├── ARCHITECTURE.md
│   ├── OPERATIONS.md
│   └── DEVELOPMENT.md
├── tests/
│   └── (test files)
├── public/
│   └── (static files)
├── .eslintrc.json
├── .prettierrc.json
├── .editorconfig
├── package.json
└── README.md
```

## Coding Standards

### Code Style

We use ESLint and Prettier for code formatting:

```bash
# Check for issues
npm run lint

# Auto-fix issues
npm run lint:fix

# Format code
npm run format
```

### Key Rules

- **Indentation**: 2 spaces
- **Quotes**: Single quotes for strings
- **Semicolons**: Required
- **Trailing commas**: Always multiline
- **Max line length**: 100 characters (soft limit)

### CommonJS Modules

This project uses CommonJS (not ES Modules):

```javascript
// Import
const express = require('express');
const { something } = require('./module');

// Export
module.exports = { something };
module.exports = functionName;
```

### JSDoc Comments

Use JSDoc for public functions:

```javascript
/**
 * Create a new goal
 * @param {Object} goalData - Goal configuration
 * @param {string} goalData.type - Goal type
 * @param {string} goalData.description - Goal description
 * @returns {Promise<Object>} Created goal
 */
async createGoal(goalData) {
  // ...
}
```

## Adding New Features

### Adding a New Engine

1. Create the engine file in `src/engines/`:

```javascript
'use strict';

/**
 * My Engine
 * Description of what it does
 * 
 * @module src/engines/my-engine
 */

class MyEngine {
  constructor(options = {}) {
    this.initialized = false;
  }

  async initialize() {
    this.initialized = true;
  }

  getStatus() {
    return this.initialized ? 'operational' : 'not_initialized';
  }

  async shutdown() {
    console.log('[MyEngine] Shutdown complete');
  }
}

module.exports = { MyEngine };
```

2. Import in `src/server/index.js`:

```javascript
const { MyEngine } = require('../engines/my-engine');

// Initialize
app.locals.engines.myEngine = new MyEngine();
```

3. Add shutdown hook:

```javascript
gracefulShutdownManager.registerHook('myEngine', async () => {
  await app.locals.engines.myEngine.shutdown();
}, { priority: 30 });
```

### Adding a New Route

1. Create route file in `src/routes/`:

```javascript
'use strict';

const express = require('express');
const { InputValidator } = require('../middleware/input-validator');
const { ErrorHandler } = require('../middleware/error-handler');

function createMyRoutes(engines) {
  const router = express.Router();

  router.get('/v1/my-endpoint',
    ErrorHandler.asyncHandler(async (req, res) => {
      const result = await engines.myEngine.doSomething();
      res.json({ success: true, result });
    })
  );

  return router;
}

module.exports = createMyRoutes;
```

2. Mount in `src/server/index.js`:

```javascript
const createMyRoutes = require('../routes/my-routes');
app.use('/', createMyRoutes(app.locals.engines));
```

### Adding Middleware

1. Create middleware file in `src/middleware/`:

```javascript
'use strict';

function myMiddleware(options = {}) {
  return (req, res, next) => {
    // Do something
    next();
  };
}

module.exports = { myMiddleware };
```

2. Use in `src/server/index.js`:

```javascript
const { myMiddleware } = require('../middleware/my-middleware');
app.use(myMiddleware());
```

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run with watch mode
npm run test:watch

# Run with coverage
npm test -- --coverage
```

### Writing Tests

Tests should be placed in `tests/` directory:

```javascript
'use strict';

const { MyEngine } = require('../src/engines/my-engine');

describe('MyEngine', () => {
  let engine;

  beforeEach(() => {
    engine = new MyEngine();
  });

  describe('initialize', () => {
    it('should set initialized to true', async () => {
      await engine.initialize();
      expect(engine.initialized).toBe(true);
    });
  });

  describe('getStatus', () => {
    it('should return not_initialized before init', () => {
      expect(engine.getStatus()).toBe('not_initialized');
    });
  });
});
```

## Debugging

### Enable Debug Logging

```env
CEL_LOG_LEVEL=debug
CEL_NODE_ENV=development
```

### Using Console

```javascript
// Structured logging
console.log(JSON.stringify({
  event: 'something_happened',
  data: { key: 'value' },
  timestamp: new Date().toISOString()
}));
```

### Debugging with Node Inspector

```bash
node --inspect src/server/index.js
```

Then open Chrome DevTools > Node.js icon.

## Error Handling

### Using Custom Errors

```javascript
const { 
  BadRequestError, 
  NotFoundError,
  AppError 
} = require('../middleware/error-handler');

// In route handler
if (!item) {
  throw new NotFoundError('Item');
}

if (!validInput) {
  throw new BadRequestError('Invalid input format');
}
```

### Async Handler Wrapper

Always wrap async routes:

```javascript
router.get('/async-route',
  ErrorHandler.asyncHandler(async (req, res) => {
    const result = await someAsyncOperation();
    res.json({ result });
  })
);
```

## Input Validation

### Using InputValidator

```javascript
router.post('/endpoint',
  InputValidator.middleware({
    body: {
      properties: {
        name: { type: 'string', required: true, minLength: 1 },
        count: { type: 'number', required: false, min: 0 },
        items: { type: 'array', required: false },
        status: { type: 'enum', required: true, values: ['active', 'inactive'] }
      }
    }
  }),
  handler
);
```

## Pull Request Process

1. Create a feature branch
2. Make changes with tests
3. Run linting and tests
4. Update documentation if needed
5. Submit PR with description

### PR Checklist

- [ ] Code passes linting (`npm run lint`)
- [ ] Tests pass (`npm test`)
- [ ] New code has tests
- [ ] Documentation updated
- [ ] No sensitive data in commits
