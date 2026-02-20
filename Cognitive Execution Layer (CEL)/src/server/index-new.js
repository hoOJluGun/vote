/**
 * CEL Server - Refactored with modular architecture
 * Cognitive Execution Layer - LLM Control Plane for Autonomous Engineering
 * @module src/server
 */

import express from 'express';
import cors from 'cors';
import http from 'http';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Import container and middleware
import { createAppContainer, getGlobalContainer, initializeGlobalContainer } from './container/index.js';
import { createSecurityMiddleware } from './middleware/security.js';

// Import routes
import { chatRoutes } from './routes/chat.js';
import { orchestrationRoutes } from './routes/orchestration.js';
import { cognitiveRoutes } from './routes/cognitive.js';
import { reliabilityRoutes } from './routes/reliability.js';
import { systemRoutes } from './routes/system.js';
import { xcodeRoutes } from './routes/xcode.js';

// Import utilities and engines
import { UsageTracker } from '../utils/usage-tracker.js';
import { CostOptimizer } from '../engines/cost-optimizer.js';
import { FormalSafetyModel } from '../engines/formal-safety-model.js';
import { ResourceGovernor } from '../engines/resource-governor.js';
import { StabilityEngine } from '../engines/stability-engine.js';
import { EvolutionEngine } from '../engines/evolution-engine.js';
import { ConstraintSolver } from '../engines/constraint-solver.js';
import { OrchestrationEngine } from '../engines/orchestration-engine.js';
import { CognitiveWorkspaceCore } from '../engines/cognitive-workspace-core.js';
import { SolutionEvaluationModel } from '../engines/solution-evaluation-model.js';
import { SecurityFramework } from '../../security/security-framework.js';
import { InputValidator } from '../../lib/input-validator.js';
import { MetaGovernor } from '../../lib/meta-governor.js';
import { SelfHealingLayer } from '../../lib/self-healing-layer.js';
import { HumanOverride } from '../../lib/human-override.js';
import { ExplainabilityLayer } from '../../lib/explainability-layer.js';
import { ChaosEngineering } from '../../lib/chaos-engineering.js';
import { ByzantineTolerance } from '../../lib/byzantine-tolerance.js';
import { CatastrophicRollback } from '../../lib/catastrophic-rollback.js';
import { SafePatchGenerator } from '../../lib/safe-patch-generator.js';
import { GoalIntegrityLedger } from '../engines/goal-integrity-ledger.js';
import { AntiStagnationEngine } from '../engines/anti-stagnation-engine.js';
import { EntropyDriftMonitor } from '../engines/entropy-drift-monitor.js';
import { ObservabilityStack } from '../engines/observability-stack.js';
import { AgentProtocol } from '../engines/agent-protocol.js';
import { FileAgentManager } from '../engines/file-agent-manager.js';
import { ProjectKnowledgeGraph } from '../engines/project-knowledge-graph.js';
import { BootRecovery } from '../engines/boot-recovery.js';
import { ShutdownProcedures } from '../engines/shutdown-procedures.js';
import { ControlHierarchy } from '../engines/control-hierarchy.js';
import { ComplexityManagement } from '../engines/complexity-management.js';
import { ShadowExecutionLayer } from '../engines/shadow-execution-layer.js';
import { DeterministicExecutionLayer } from '../engines/deterministic-execution-layer.js';
import { TemporalSimulator } from '../engines/temporal-simulator.js';
import { EconomicResilience } from '../engines/economic-resilience.js';
import { FormalResilienceModel } from '../engines/formal-resilience-model.js';
import { AdvancedUsageTracker } from '../engines/advanced-usage-tracker.js';

// Configuration
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CONFIG = {
  PORT: process.env.PORT || 3000,
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
  OPENROUTER_BASE_URL: 'https://openrouter.ai/api/v1',
  FALLBACK_MODELS: [
    'openai/gpt-4o-mini',
    'anthropic/claude-3-haiku',
    'google/gemini-2.0-flash-exp:free',
    'meta-llama/llama-3.1-8b-instruct:free',
    'qwen/qwen-2.5-7b-instruct',
  ],
  USAGE_BUDGET_LIMIT: parseInt(process.env.USAGE_BUDGET_LIMIT || '1000000', 10),
  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,
  NODE_ENV: process.env.NODE_ENV || 'development',
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
};

// Logger setup
const logger = {
  info: (...args) => console.log('ℹ️', ...args),
  warn: (...args) => console.warn('⚠️', ...args),
  error: (...args) => console.error('❌', ...args),
  debug: (...args) => CONFIG.NODE_ENV === 'development' && console.log('🔍', ...args),
};

/**
 * Initialize all services
 * @returns {Object} Initialized services
 */
async function initializeServices() {
  logger.info('Initializing services...');

  // Core services
  const usageTracker = new UsageTracker();
  const costOptimizer = new CostOptimizer(CONFIG.FALLBACK_MODELS);
  const formalSafetyModel = new FormalSafetyModel();
  const resourceGovernor = new ResourceGovernor();
  const stabilityEngine = new StabilityEngine();
  const evolutionEngine = new EvolutionEngine();
  const constraintSolver = new ConstraintSolver();
  const orchestrationEngine = new OrchestrationEngine();
  const cognitiveWorkspaceCore = new CognitiveWorkspaceCore();
  const solutionEvaluationModel = new SolutionEvaluationModel();
  const securityFramework = new SecurityFramework({
    encryptionKey: CONFIG.ENCRYPTION_KEY,
  });
  const inputValidator = new InputValidator();

  // Advanced services
  const metaGovernor = new MetaGovernor();
  const selfHealingLayer = new SelfHealingLayer();
  const humanOverride = new HumanOverride();
  const explainabilityLayer = new ExplainabilityLayer();
  const chaosEngineering = new ChaosEngineering();
  const byzantineTolerance = new ByzantineTolerance();
  const catastrophicRollback = new CatastrophicRollback();
  const safePatchGenerator = new SafePatchGenerator();
  const goalIntegrityLedger = new GoalIntegrityLedger();
  const antiStagnationEngine = new AntiStagnationEngine();
  const entropyDriftMonitor = new EntropyDriftMonitor();
  const observabilityStack = new ObservabilityStack();
  const agentProtocol = new AgentProtocol();
  const fileAgentManager = new FileAgentManager(process.cwd());
  const projectKnowledgeGraph = new ProjectKnowledgeGraph();

  // System services
  const bootRecovery = new BootRecovery();
  const shutdownProcedures = new ShutdownProcedures();
  const controlHierarchy = new ControlHierarchy();
  const complexityManagement = new ComplexityManagement();
  const shadowExecutionLayer = new ShadowExecutionLayer();
  const deterministicExecutionLayer = new DeterministicExecutionLayer();
  const temporalSimulator = new TemporalSimulator();
  const economicResilience = new EconomicResilience();
  const formalResilienceModel = new FormalResilienceModel();
  const advancedUsageTracker = new AdvancedUsageTracker();

  logger.info('All services initialized successfully');

  return {
    usageTracker,
    costOptimizer,
    formalSafetyModel,
    resourceGovernor,
    stabilityEngine,
    evolutionEngine,
    constraintSolver,
    orchestrationEngine,
    cognitiveWorkspaceCore,
    solutionEvaluationModel,
    securityFramework,
    inputValidator,
    metaGovernor,
    selfHealingLayer,
    humanOverride,
    explainabilityLayer,
    chaosEngineering,
    byzantineTolerance,
    catastrophicRollback,
    safePatchGenerator,
    goalIntegrityLedger,
    antiStagnationEngine,
    entropyDriftMonitor,
    observabilityStack,
    agentProtocol,
    fileAgentManager,
    projectKnowledgeGraph,
    bootRecovery,
    shutdownProcedures,
    controlHierarchy,
    complexityManagement,
    shadowExecutionLayer,
    deterministicExecutionLayer,
    temporalSimulator,
    economicResilience,
    formalResilienceModel,
    advancedUsageTracker,
  };
}

/**
 * Create and configure Express app
 * @param {Object} services - Initialized services
 * @returns {express.Application} Configured Express app
 */
function createApp(services) {
  const app = express();

  // Create security middleware
  const securityMiddleware = createSecurityMiddleware({
    formalSafetyModel: services.formalSafetyModel,
    resourceGovernor: services.resourceGovernor,
    inputValidator: services.inputValidator,
    securityFramework: services.securityFramework,
  });

  // Apply global middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
    exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
    credentials: true,
  }));

  // Security headers
  app.use(securityMiddleware.securityHeaders);

  // Request logging
  app.use(securityMiddleware.logRequest);

  // Input sanitization
  app.use(securityMiddleware.sanitizeInput);

  // Request validation
  app.use(securityMiddleware.validateRequest);

  // Rate limiting
  app.use(securityMiddleware.rateLimit({
    windowMs: 60000, // 1 minute
    maxRequests: 100, // 100 requests per minute
  }));

  // Prepare dependencies for routes
  const routeDeps = {
    ...services,
    config: CONFIG,
    logger,
  };

  // Register routes
  chatRoutes(app, routeDeps);
  orchestrationRoutes(app, routeDeps);
  cognitiveRoutes(app, routeDeps);
  reliabilityRoutes(app, routeDeps);
  systemRoutes(app, routeDeps);
  xcodeRoutes(app, routeDeps);

  // Serve static dashboard
  app.use(express.static(join(__dirname, '../../public')));

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({
      error: {
        message: `Route ${req.method} ${req.path} not found`,
        type: 'not_found',
      },
    });
  });

  // Error handler
  app.use(securityMiddleware.handleError);

  return app;
}

/**
 * Start the server
 */
async function startServer() {
  try {
    logger.info('🚀 Starting CEL Server...');
    logger.info(`Environment: ${CONFIG.NODE_ENV}`);

    // Initialize services
    const services = await initializeServices();

    // Create app
    const app = createApp(services);

    // Create HTTP server
    const server = http.createServer(app);

    // Graceful shutdown handling
    const gracefulShutdown = async (signal) => {
      logger.info(`\n📡 Received ${signal}, starting graceful shutdown...`);

      // Stop accepting new connections
      server.close(() => {
        logger.info('✅ HTTP server closed');
      });

      // Run shutdown procedures
      if (services.shutdownProcedures) {
        try {
          await services.shutdownProcedures.execute();
          logger.info('✅ Shutdown procedures completed');
        } catch (error) {
          logger.error('❌ Error during shutdown procedures:', error);
        }
      }

      // Cleanup resources
      if (services.observabilityStack) {
        await services.observabilityStack.flush();
      }

      process.exit(0);
    };

    // Register shutdown handlers
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      gracefulShutdown('uncaughtException');
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    });

    // Start listening
    server.listen(CONFIG.PORT, () => {
      logger.info(`✅ CEL Server running on port ${CONFIG.PORT}`);
      logger.info(`📊 Dashboard: http://localhost:${CONFIG.PORT}/dashboard.html`);
      logger.info(`🏥 Health check: http://localhost:${CONFIG.PORT}/health`);
      logger.info(`📱 Xcode Dashboard: http://localhost:${CONFIG.PORT}/xcode-dashboard.html`);
    });

    return { app, server, services };
  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Export for testing
export { createApp, initializeServices, CONFIG, logger };

// Start server if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startServer();
}

export default startServer;
