/**
 * LLM Control Plane v4.2.1 - Next Generation Agent IDE Orchestration Engine
 * 
 * Main production server with full set of features:
 * - Intelligent development environment orchestrator
 * - Project knowledge graph
 * - Multi-agent architecture
 * - Simulation and solution evaluation system
 * - Self-learning improvement cycle
 * - Cognitive workspace
 * - Agent protocol
 * - Mathematical solution evaluation model
 * - Deterministic execution layer
 * - Resource management
 * - Formal safety model
 * - Stability theory
 * - Evolution engine
 * - Anti-stagnation mechanism
 * - Constraint solver
 * - Semantic caching for cost optimization
 * - ProviderFactory for flexible LLM routing
 * - Keychain integration for secure key management
 */

import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { AdvancedUsageTracker } from '../engines/advanced-usage-tracker.js';
import { CostOptimizer } from '../engines/cost-optimizer.js';
import { ProjectContextAnalyzer } from '../engines/project-context-analyzer.js';
import { CodeTesterLinter } from '../engines/code-tester-linter.js';
import { CodeAnalysis } from '../engines/code-analysis.js';
import { CodeApplier } from '../engines/code-applier.js';
import { FileAgentManager } from '../engines/file-agent-manager.js';
import { VirtualSandbox } from '../engines/virtual-sandbox.js';
import { ProjectKnowledgeGraph } from '../engines/project-knowledge-graph.js';
import { OrchestrationEngine } from '../engines/orchestration-engine.js';
import { CognitiveWorkspaceCore } from '../engines/cognitive-workspace-core.js';
import { AgentProtocol } from '../engines/agent-protocol.js';
import { SolutionEvaluationModel } from '../engines/solution-evaluation-model.js';
import { DeterministicExecutionLayer } from '../engines/deterministic-execution-layer.js';
import { ResourceGovernor } from '../engines/resource-governor.js';
import { FormalSafetyModel } from '../engines/formal-safety-model.js';
import { StabilityTheoryEngine } from '../engines/stability-theory-engine.js';
import { EvolutionEngine } from '../engines/evolution-engine.js';
import { AntiStagnationEngine } from '../engines/anti-stagnation-engine.js';
import { ConstraintSolver } from '../engines/constraint-solver.js';
import { getProviderFactory } from '../providers/provider-factory.js';
import { getSemanticCache } from '../engines/semantic-cache.js';
import { getRAGEngine } from '../engines/rag-engine.js';
import { getKeychainManager } from '../security/keychain-manager.js';
import { SelfHealingLayer } from '../../lib/self-healing-layer.js';

// For serving static files
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from project root
dotenv.config({ path: path.join(process.cwd(), '.env') });

const app = express();
app.use(express.json({ limit: "10mb" }));

// Serve static files from public folder
app.use(express.static(path.join(__dirname, '..', '..', 'public')));

const PORT = process.env.PORT || 3000;
const OPENROUTER_BASE = process.env.OPENROUTER_BASE || 'https://openrouter.ai/api/v1';

// Use 127.0.0.1 for local access only
const LISTEN_ADDRESS = '127.0.0.1';

// Create usage tracker and cost optimizer
const USAGE_BUDGET_LIMIT = parseInt(process.env.USAGE_BUDGET_LIMIT) || null;
const usageTracker = new AdvancedUsageTracker(USAGE_BUDGET_LIMIT);
const costOptimizer = new CostOptimizer();

// Initialize ProviderFactory and other components
let providerFactory = null;
let semanticCache = null;
let ragEngine = null;
let keychainManager = null;

// Managers for the project
let fileAgentManager = null;
// Task orchestration engine
let orchestrationEngine = null;
// Cognitive workspace
let cognitiveWorkspace = null;
// Agent protocol
let agentProtocol = null;
// Solution evaluation model
let solutionEvaluationModel = null;
// Deterministic execution layer
let deterministicExecutionLayer = null;
// Resource management
let resourceGovernor = null;
// Formal safety model
let formalSafetyModel = null;
// Stability theory
let stabilityEngine = null;
// Evolution engine
let evolutionEngine = null;
// Anti-stagnation mechanism
let antiStagnationEngine = null;
// Constraint solver
let constraintSolver = null;
// Self-healing layer
let selfHealingLayer = null;

// Load existing logs
usageTracker.loadLogs();

/**
 * Initialize providers and other core components
 */
async function initializeProviders() {
  try {
    // Initialize keychain manager
    keychainManager = await getKeychainManager();
    
    // Configure providers
    const config = {
      preferLocal: process.env.PREFER_LOCAL_MODELS !== 'false',
      fallbackOrder: process.env.PROVIDER_FALLBACK_ORDER?.split(',') || [],
      openrouter: {
        baseUrl: OPENROUTER_BASE,
        // API key will be retrieved from SecretsManager automatically
      },
      ollama: process.env.OLLAMA_ENABLED === 'true' ? {
        baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
      } : undefined,
    };

    providerFactory = await getProviderFactory(config);
    semanticCache = await getSemanticCache({
      maxSize: parseInt(process.env.SEMANTIC_CACHE_SIZE) || 1000,
      ttl: parseInt(process.env.SEMANTIC_CACHE_TTL) || 24 * 60 * 60 * 1000, // 24 hours
      similarityThreshold: parseFloat(process.env.SEMANTIC_SIMILARITY_THRESHOLD) || 0.85
    });
    
    ragEngine = await getRAGEngine({
      contextWindowSize: parseInt(process.env.CONTEXT_WINDOW_SIZE) || 3072,
      chunkSize: parseInt(process.env.CHUNK_SIZE) || 512,
      overlap: parseInt(process.env.OVERLAP) || 50,
      topK: parseInt(process.env.TOP_K) || 5
    });
    
    console.log('✅ Keychain Manager initialized');
    console.log('✅ ProviderFactory initialized');
    console.log('✅ SemanticCache initialized');
    console.log('✅ RAG Engine initialized');
  } catch (error) {
    console.error('❌ Failed to initialize providers:', error);
    process.exit(1);
  }
}

/**
 * Initialize all core components
 */
async function initializeComponents() {
  try {
    fileAgentManager = new FileAgentManager();
    orchestrationEngine = new OrchestrationEngine();
    cognitiveWorkspace = new CognitiveWorkspaceCore();
    agentProtocol = new AgentProtocol();
    solutionEvaluationModel = new SolutionEvaluationModel();
    deterministicExecutionLayer = new DeterministicExecutionLayer();
    resourceGovernor = new ResourceGovernor();
    formalSafetyModel = new FormalSafetyModel();
    stabilityEngine = new StabilityTheoryEngine();
    evolutionEngine = new EvolutionEngine();
    antiStagnationEngine = new AntiStagnationEngine();
    constraintSolver = new ConstraintSolver();
    selfHealingLayer = new SelfHealingLayer();
    
    // Load project documents for RAG if project path is provided
    if (process.env.PROJECT_PATH) {
      await ragEngine.loadProjectDocuments(process.env.PROJECT_PATH);
      console.log(`📚 Loaded project documents for RAG from ${process.env.PROJECT_PATH}`);
    }
    
    console.log('✅ All components initialized');
  } catch (error) {
    console.error('❌ Failed to initialize components:', error);
    process.exit(1);
  }
}

/**
 * Route to get list of models using ProviderFactory
 */
app.get("/v1/models", async (req, res) => {
  if (!providerFactory) {
    return res.status(500).json({ error: "ProviderFactory not initialized" });
  }

  try {
    const models = await providerFactory.listAllModels();
    const response = {
      object: "list",
      data: models.map(m => ({
        id: m.id,
        object: "model",
        created: Date.now(),
        owned_by: m.provider || "unknown"
      }))
    };

    res.json(response);
  } catch (error) {
    console.error("Failed to fetch models:", error);
    res.status(500).json({
      error: "Failed to fetch models",
      details: error.message
    });
  }
});

/**
 * Chat completion route using ProviderFactory
 */
app.post("/v1/chat/completions", async (req, res) => {
  if (!providerFactory) {
    return res.status(500).json({ error: "ProviderFactory not initialized" });
  }

  const startTime = Date.now();
  const { model, messages, stream, ...rest } = req.body;

  // Prepare request for provider
  const request = {
    model: model,
    messages: messages,
    stream: stream || false,
    ...rest
  };

  try {
    // Use RAG to optimize context if available
    let optimizedMessages = messages;
    if (ragEngine && process.env.USE_RAG === 'true') {
      const lastMessage = messages[messages.length - 1]?.content || '';
      const contextQuery = `${messages[0]?.content || ''} ${lastMessage}`.substring(0, 500);
      
      try {
        const optimizedContext = await ragEngine.optimizeContext(contextQuery, {
          fileContext: req.headers['x-file-context'] || null,
          projectStructure: req.headers['x-project-structure'] || null
        });
        
        // Replace or augment the original messages with optimized context
        if (optimizedContext.relevantInfo) {
          // Modify the last message to include relevant context
          optimizedMessages = [...messages];
          const lastMsgIdx = optimizedMessages.length - 1;
          optimizedMessages[lastMsgIdx] = {
            ...optimizedMessages[lastMsgIdx],
            content: `${optimizedMessages[lastMsgIdx].content}\n\nRelevant context:\n${optimizedContext.relevantInfo}`
          };
          
          // Update the request with optimized messages
          request.messages = optimizedMessages;
        }
      } catch (ragError) {
        console.warn("RAG context optimization failed, proceeding with original context:", ragError.message);
      }
    }
    
    // Use semantic cache if available and not streaming
    if (semanticCache && !stream) {
      // Extract prompt from messages
      const lastMessage = optimizedMessages[optimizedMessages.length - 1]?.content || '';
      
      // Get cached response or generate new one
      const response = await semanticCache.getCachedOrGenerate(
        lastMessage,
        async () => {
          // Generate new response using provider factory
          const result = await providerFactory.complete(request);
          return result;
        }
      );

      // If we got a cached response, return it directly
      if (response.similarity !== undefined) {
        console.log(`🎯 Returning cached response with ${response.similarity * 100}% similarity`);
        res.json(response);
        return;
      }
      
      // If response was generated, send it normally
      res.json(response);
    } else {
      // Direct call to provider factory without caching
      if (stream) {
        // For streaming, we need to handle the response differently
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders();

        try {
          for await (const chunk of providerFactory.completeStream(request)) {
            res.write(`data: ${JSON.stringify(chunk)}\n\n`);
          }
          res.write(`data: [DONE]\n\n`);
        } catch (error) {
          console.error("Streaming error:", error);
          res.write(`data: {"error": "${error.message}"}\n\n`);
        } finally {
          res.end();
        }
      } else {
        // Non-streaming response
        const response = await providerFactory.complete(request);
        res.json(response);
      }
    }

    // Track usage after successful response
    const duration = Date.now() - startTime;
    usageTracker.trackRequest({
      endpoint: '/v1/chat/completions',
      model: model,
      duration,
      tokens: rest.max_tokens || 0,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Chat completion error:", error);
    res.status(500).json({
      error: "Chat completion failed",
      details: error.message
    });
  }
});

/**
 * Route to recommend model
 */
app.get("/recommend-model/:taskType/:tokens", (req, res) => {
  if (!providerFactory) {
    return res.status(500).json({ error: "ProviderFactory not initialized" });
  }

  try {
    const { taskType, tokens } = req.params;
    const constraints = {
      maxCost: parseFloat(req.query.maxCost) || undefined,
      maxLatency: parseInt(req.query.maxLatency) || undefined
    };

    const bestProvider = providerFactory.getBestProvider(taskType, parseInt(tokens), constraints);

    if (!bestProvider) {
      return res.status(404).json({
        error: "No suitable provider found",
        message: "No provider meets the specified constraints"
      });
    }

    res.json({
      recommendedModel: bestProvider.model,
      provider: bestProvider.providerName,
      score: bestProvider.score,
      estimatedCost: bestProvider.provider.estimateCost({
        messages: [{role: 'user', content: ''}],
        maxTokens: parseInt(tokens)
      }),
      providerMetrics: providerFactory.getMetrics().providers[bestProvider.providerName]
    });
  } catch (error) {
    console.error("Model recommendation error:", error);
    res.status(500).json({
      error: "Model recommendation failed",
      details: error.message
    });
  }
});

/**
 * Health check route
 */
app.get("/health", (req, res) => {
  const healthStatus = {
    status: "healthy",
    version: "4.2.1",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    providers: providerFactory ? providerFactory.getMetrics() : "not initialized",
    components: {
      apiServer: "operational",
      usageTracker: "operational", 
      costOptimizer: "operational",
      semanticCache: semanticCache ? semanticCache.getStats() : "not initialized",
      ragEngine: ragEngine ? ragEngine.getStats() : "not initialized",
      keychainManager: keychainManager ? "initialized" : "not initialized",
      selfHealingLayer: selfHealingLayer ? "initialized" : "not initialized"
    },
    gshi: 0.95, // Global System Health Index - placeholder
  };

  res.json(healthStatus);
});

/**
 * Route for code generation
 */
app.post("/v1/code/generate", async (req, res) => {
  if (!providerFactory) {
    return res.status(500).json({ error: "ProviderFactory not initialized" });
  }

  try {
    const { description, language, context } = req.body;

    const request = {
      model: 'openrouter/auto',
      messages: [
        {
          role: 'system',
          content: `You are an expert code generation assistant. Generate clean, well-documented code in ${language || 'the requested language'}. ${context || ''}`
        },
        {
          role: 'user',
          content: `Generate code based on this description: ${description}`
        }
      ],
      max_tokens: 1024,
      temperature: 0.7
    };

    const response = await providerFactory.complete(request);
    const generatedCode = response.choices[0].message.content;

    res.json({
      code: generatedCode
    });
  } catch (error) {
    console.error("Code generation error:", error);
    res.status(500).json({
      error: "Code generation failed",
      details: error.message
    });
  }
});

/**
 * Route for code refactoring
 */
app.post("/v1/code/refactor", async (req, res) => {
  if (!providerFactory) {
    return res.status(500).json({ error: "ProviderFactory not initialized" });
  }

  try {
    const { code, target_improvements, language } = req.body;

    const request = {
      model: 'openrouter/auto',
      messages: [
        {
          role: 'system',
          content: `You are an expert code refactoring assistant. Refactor the provided code to improve ${target_improvements || 'readability and performance'}. Maintain functionality while improving code quality. Language: ${language || 'any'}.`
        },
        {
          role: 'user',
          content: `Refactor this code:\n\n${code}`
        }
      ],
      max_tokens: 1024,
      temperature: 0.5
    };

    const response = await providerFactory.complete(request);
    const refactoredCode = response.choices[0].message.content;

    res.json({
      refactored_code: refactoredCode
    });
  } catch (error) {
    console.error("Code refactoring error:", error);
    res.status(500).json({
      error: "Code refactoring failed",
      details: error.message
    });
  }
});

/**
 * Route for running goal-oriented tasks
 */
app.post("/v1/orchestrate-goal", async (req, res) => {
  if (!orchestrationEngine) {
    return res.status(500).json({ error: "Orchestration engine not initialized" });
  }

  try {
    const { goal, context } = req.body;

    // Process the goal using orchestration engine
    const result = await orchestrationEngine.executeGoal(goal, context);

    res.json({
      result: result
    });
  } catch (error) {
    console.error("Goal orchestration error:", error);
    res.status(500).json({
      error: "Goal orchestration failed",
      details: error.message
    });
  }
});

/**
 * Route for self-healing process
 */
app.post("/v1/heal", async (req, res) => {
  if (!selfHealingLayer) {
    return res.status(500).json({ error: "Self-healing layer not initialized" });
  }

  try {
    const { files, run_tests } = req.body;

    const report = await selfHealingLayer.heal(files, run_tests);

    res.json({
      report: report
    });
  } catch (error) {
    console.error("Healing process error:", error);
    res.status(500).json({
      error: "Healing process failed",
      details: error.message
    });
  }
});

/**
 * Load routes from subdirectories
 */
async function loadRoutes() {
  const routesDir = path.join(__dirname, 'routes');
  const routeFiles = await fs.readdir(routesDir);

  for (const file of routeFiles) {
    if (file.endsWith('.js')) {
      const routeModule = await import(path.join(routesDir, file));
      const routePath = `/v1/${file.replace('.js', '')}`;
      app.use(routePath, routeModule.default);
      console.log(`📋 Loaded route: ${routePath}`);
    }
  }
}

/**
 * Start the server after initialization
 */
async function startServer() {
  await initializeProviders();
  await initializeComponents();
  await loadRoutes();
  
  app.listen(PORT, LISTEN_ADDRESS, () => {
    console.log(`🚀 CEL v4.2.1 server running on http://${LISTEN_ADDRESS}:${PORT}`);
    console.log(`📊 ProviderFactory ready with ${providerFactory ? providerFactory.getFallbackChain().length : 0} providers in chain`);
    console.log(`🧠 Semantic cache initialized with ${semanticCache ? semanticCache.getStats().size : 0} entries`);
    console.log(`🔍 RAG engine loaded ${ragEngine ? ragEngine.getStats().totalChunks : 0} chunks from ${ragEngine ? ragEngine.getStats().totalDocs : 0} documents`);
    console.log(`🔐 Keychain manager initialized: ${!!keychainManager}`);
    console.log(`🛡️ Self-healing layer initialized: ${!!selfHealingLayer}`);
    console.log(`🔒 Protected endpoints listening on ${LISTEN_ADDRESS}`);
  });
}

// Start the server
startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

// Error handling
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

export default app;

export default app;

export default app;

export default app;

        // Обновляем производительность модели
        costOptimizer.updateModelPerformance(model, duration, true, 0);
        
        // Читаем ответ
        const data = await response.text();
        res.status(response.status).send(data);
        responseSent = true;
        
        // Попробуем извлечь информацию о токенах из ответа
        let tokensIn = tokens;
        let tokensOut = 0;
        let estimatedCost = 0;
        
        try {
          const jsonData = JSON.parse(data);
          if (jsonData.usage) {
            tokensIn = jsonData.usage.prompt_tokens || tokensIn;
            tokensOut = jsonData.usage.completion_tokens || 0;
            
            // Рассчитываем реальную стоимость с помощью оптимизатора
            const costCalculation = costOptimizer.calculateCost(model, tokensIn, tokensOut);
            estimatedCost = costCalculation.cost;
          }
        } catch (e) {
          // Если не удалось расарсить JSON, используем оценки выше
        }
        
        // Логируем успешный запрос
        await usageTracker.logRequest({
          model: model,
          tokensIn,
          tokensOut,
          estimatedCost,
          duration: duration,
          status: response.status,
          taskType: taskType,
          userAgent: req.get('User-Agent') || 'unknown',
          ip: req.ip
        });
        
        // Обновляем историю использования в оптимизаторе
        costOptimizer.updateUsageHistory({
          model,
          tokensIn: tokens,
          tokensOut: 0,
          estimatedCost: 0,
          duration,
          status: response.status
        });
        
        // Записываем изменение в эволюционный движок
        if (!evolutionEngine) {
          evolutionEngine = new EvolutionEngine();
        }
        
        evolutionEngine.recordChange({
          structuralChange: 0.02, // небольшое изменение
          complexityDelta: 0.01,
          couplingDelta: 0.005,
          riskDelta: 0.002,
          performanceDelta: 0.002,
          maintainabilityDelta: 0.01
        });
        
        console.log(`✅ Code assist response sent successfully via ${model} (${duration}ms)`);
        break; // Успешно отправлено, выходим из цикла
      } else if (shouldFallback(response.status)) {
        // Обновляем производительность модели
        costOptimizer.updateModelPerformance(model, duration, false, 0);
        
        // Обновляем статистику fallback
        costOptimizer.updateFallbackStats(true); // Успешный fallback
        
        // Если статус указывает на необходимость fallback, логируем и пробуем следующую модель
        console.warn(`⚠️ Model ${model} returned status ${response.status}, trying next`);
        const errorData = await response.text();
        console.warn(`Error from ${model}:`, errorData);
        
        // Логируем неудачный запрос
        await usageTracker.logRequest({
          model: model,
          tokensIn: tokens,
          tokensOut: 0,
          estimatedCost: 0,
          duration: duration,
          status: response.status,
          taskType: taskType,
          userAgent: req.get('User-Agent') || 'unknown',
          ip: req.ip
        });
        
        // Обновляем историю использования в оптимизаторе
        costOptimizer.updateUsageHistory({
          model,
          tokensIn: tokens,
          tokensOut: 0,
          estimatedCost: 0,
          duration,
          status: response.status
        });
        
        // Продолжаем цикл, чтобы попробовать следующую модель
        continue;
      } else {
        // Обновляем производительность модели
        costOptimizer.updateModelPerformance(model, duration, false, 0);
        
        // Если статус НЕ указывает на необходимость fallback, отправляем ошибку
        // Нормализуем ошибку в OpenAI-совместимый формат
        const errorData = await response.text();
        const normalizedError = {
          error: {
            message: `Upstream error: ${response.statusText} (${response.status}): ${errorData}`,
            type: "invalid_request_error",
            code: response.status
          }
        };
        
        res.status(response.status).json(normalizedError);
        responseSent = true;
        
        // Логируем ошибочный запрос
        await usageTracker.logRequest({
          model: model,
          tokensIn: tokens,
          tokensOut: 0,
          estimatedCost: 0,
          duration: duration,
          status: response.status,
          taskType: taskType,
          userAgent: req.get('User-Agent') || 'unknown',
          ip: req.ip
        });
        
        // Обновляем историю использования в оптимизаторе
        costOptimizer.updateUsageHistory({
          model,
          tokensIn: tokens,
          tokensOut: 0,
          estimatedCost: 0,
          duration,
          status: response.status
        });
        
        console.log(`❌ Error response sent: ${response.status}`);
        break; // Ошибку отправили, выходим из цикла
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      // Обновляем производительность модели
      costOptimizer.updateModelPerformance(model, duration, false, 0);
      
      // Обновляем статистику fallback
      costOptimizer.updateFallbackStats(false);
      
      console.error(`💥 Network error with model ${model} during code assist:`, error.message);
      
      // Логируем сетевую ошибку
      await usageTracker.logRequest({
        model: model,
        tokensIn: tokens,
        tokensOut: 0,
        estimatedCost: 0,
        duration: duration,
        status: 500,
        taskType: taskType,
        userAgent: req.get('User-Agent') || 'unknown',
        ip: req.ip
      });
      
      // Обновляем историю использования в оптимизаторе
      costOptimizer.updateUsageHistory({
        model,
        tokensIn: tokens,
        tokensOut: 0,
        estimatedCost: 0,
        duration,
        status: 500
      });
      
      // Пробуем следующую модель при сетевых ошибках
      if (model === modelChain[modelChain.length - 1]) {
        const normalizedError = {
          error: {
            message: `Proxy connection error: ${error.message}`,
            type: "invalid_request_error"
          }
        };
        
        res.status(500).json(normalizedError);
        responseSent = true;
        console.log(`💥 Final model failed, sending error to client`);
      }
      // Продолжаем цикл, чтобы попробовать следующую модель
    }
    
    // Если один из предыдущих блоков отправил ответ, выходим из цикла
    if (responseSent) {
      break;
    }
  }
  
  // Если цикл закончился, а ответ так и не был отправлен, отправляем общую ошибку
  if (!responseSent) {
    const duration = Date.now() - startTime;
    const normalizedError = {
      error: {
        message: "All fallback models failed for code assist",
        type: "invalid_request_error"
      }
    };
    
    res.status(503).json(normalizedError);
    
    // Логируем ситуацию, когда все модели не сработали
    await usageTracker.logRequest({
      model: 'all_failed',
      tokensIn: tokens,
      tokensOut: 0,
      estimatedCost: 0,
      duration: duration,
      status: 503,
      taskType: taskType,
      userAgent: req.get('User-Agent') || 'unknown',
      ip: req.ip
    });
    
    // Обновляем историю использования в оптимизаторе
    costOptimizer.updateUsageHistory({
      model: 'all_failed',
      tokensIn: tokens,
      tokensOut: 0,
      estimatedCost: 0,
      duration,
      status: 503
    });
    
    console.log(`💀 All models failed for code assist, sent error to client`);
  }
});

/**
 * 🔟 Endpoint для получения отчета о качестве кода
 */
app.post("/v1/code-quality-report", async (req, res) => {
  try {
    const { filePath, testResults, lintResults } = req.body;
    
    if (!filePath) {
      return res.status(400).json({
        error: {
          message: "File path is required",
          type: "invalid_request_error"
        }
      });
    }
    
    // Проверяем безопасность операции
    if (!formalSafetyModel) {
      formalSafetyModel = new FormalSafetyModel();
    }
    
    const safetyCheck = formalSafetyModel.validateOperation({
      type: 'code_quality_report',
      payload: { filePath }
    });
    
    if (!safetyCheck.safe) {
      console.warn(`🚨 Safety violation in code quality report:`, safetyCheck.violations);
      return res.status(400).json({
        error: {
          message: `Safety check failed: ${safetyCheck.violations.join(', ')}`,
          type: "invalid_request_error"
        }
      });
    }
    
    // Если результаты тестов или линтинга не предоставлены, запускаем их
    let finalTestResults = testResults;
    let finalLintResults = lintResults;
    
    if (!finalTestResults) {
      finalTestResults = await CodeTesterLinter.runTestsForFile(filePath);
    }
    
    if (!finalLintResults) {
      finalLintResults = await CodeTesterLinter.runLintForFile(filePath);
    }
    
    // Анализируем результаты
    const analyzedTestResults = CodeAnalysis.analyzeTestResults(finalTestResults.results || finalTestResults);
    const analyzedLintResults = CodeAnalysis.analyzeLintResults(finalLintResults.results || finalLintResults);
    
    // Генерируем отчет о качестве кода
    const report = CodeAnalysis.generateCodeQualityReport(analyzedTestResults, analyzedLintResults);
    
    res.json(report);
  } catch (error) {
    console.error("❌ Error in /v1/code-quality-report:", error);
    res.status(500).json({
      error: {
        message: "Failed to generate code quality report",
        type: "invalid_request_error"
      }
    });
  }
});

/**
 * 🔠 Endpoint для применения исправлений к коду
 */
app.post("/v1/apply-fixes", async (req, res) => {
  try {
    const { filePath, fixes } = req.body;
    
    if (!filePath) {
      return res.status(400).json({
        error: {
          message: "File path is required",
          type: "invalid_request_error"
        }
      });
    }
    
    if (!Array.isArray(fixes) || fixes.length === 0) {
      return res.status(400).json({
        error: {
          message: "Array of fixes is required",
          type: "invalid_request_error"
        }
      });
    }
    
    // Проверяем безопасность операции
    if (!formalSafetyModel) {
      formalSafetyModel = new FormalSafetyModel();
    }
    
    const safetyCheck = formalSafetyModel.validateOperation({
      type: 'apply_fixes',
      payload: { filePath, fixes }
    });
    
    if (!safetyCheck.safe) {
      console.warn(`🚨 Safety violation in apply fixes:`, safetyCheck.violations);
      return res.status(400).json({
        error: {
          message: `Safety check failed: ${safetyCheck.violations.join(', ')}`,
          type: "invalid_request_error"
        }
      });
    }
    
    // Проверяем ограничения ресурсов
    if (!resourceGovernor) {
      resourceGovernor = new ResourceGovernor();
    }
    
    const resourceCheck = resourceGovernor.checkResourceLimits({
      type: 'apply_fixes',
      fixCount: fixes.length
    });
    
    if (!resourceCheck.allowed) {
      console.warn(`📉 Resource limit exceeded:`, resourceCheck.reason);
      return res.status(429).json({
        error: {
          message: `Resource limit exceeded: ${resourceCheck.reason}`,
          type: "invalid_request_error"
        }
      });
    }
    
    // Применяем исправления к файлу
    const result = await CodeApplier.applyFixesWithValidation(filePath, fixes);
    
    res.json(result);
  } catch (error) {
    console.error("❌ Error in /v1/apply-fixes:", error);
    res.status(500).json({
      error: {
        message: "Failed to apply fixes",
        type: "invalid_request_error"
      }
    });
  }
});

/**
 * 🔢 Endpoint для управления агентами файлов
 */
app.post("/v1/file-agents/:action", async (req, res) => {
  try {
    const { action } = req.params;
    const { filePath } = req.body;
    
    if (!fileAgentManager) {
      fileAgentManager = new FileAgentManager(process.cwd());
    }
    
    let result;
    
    switch(action) {
      case 'add':
        if (!filePath) {
          return res.status(400).json({
            error: {
              message: "File path is required",
              type: "invalid_request_error"
            }
          });
        }
        result = await fileAgentManager.addFileToMonitoring(filePath);
        break;
        
      case 'remove':
        if (!filePath) {
          return res.status(400).json({
            error: {
              message: "File path is required",
              type: "invalid_request_error"
            }
          });
        }
        fileAgentManager.removeFileFromMonitoring(filePath);
        result = { success: true, message: `File ${filePath} removed from monitoring` };
        break;
        
      case 'analyze-current':
        result = await fileAgentManager.monitorAllActiveFiles();
        break;
        
      case 'suggest-all':
        result = await fileAgentManager.generateAllSuggestions();
        break;
        
      case 'full-analysis':
        result = await fileAgentManager.fullProjectAnalysis();
        break;
        
      default:
        return res.status(400).json({
          error: {
            message: "Invalid action. Use add, remove, analyze-current, suggest-all, or full-analysis",
            type: "invalid_request_error"
          }
        });
    }
    
    res.json(result);
  } catch (error) {
    console.error("❌ Error in /v1/file-agents:", error);
    res.status(500).json({
      error: {
        message: "Failed to manage file agents",
        type: "invalid_request_error"
      }
    });
  }
});

/**
 * 🆓 Endpoint для безопасного тестирования изменений в песочнице
 */
app.post("/v1/sandbox-test", async (req, res) => {
  try {
    const { changes, testConfig } = req.body;
    
    if (!Array.isArray(changes) || changes.length === 0) {
      return res.status(400).json({
        error: {
          message: "Array of changes is required",
          type: "invalid_request_error"
        }
      });
    }
    
    // Проверяем безопасность операции
    if (!formalSafetyModel) {
      formalSafetyModel = new FormalSafetyModel();
    }
    
    const safetyCheck = formalSafetyModel.validateOperation({
      type: 'sandbox_test',
      payload: { changes }
    });
    
    if (!safetyCheck.safe) {
      console.warn(`🚨 Safety violation in sandbox test:`, safetyCheck.violations);
      return res.status(400).json({
        error: {
          message: `Safety check failed: ${safetyCheck.violations.join(', ')}`,
          type: "invalid_request_error"
        }
      });
    }
    
    // Проверяем ограничения ресурсов
    if (!resourceGovernor) {
      resourceGovernor = new ResourceGovernor();
    }
    
    const resourceCheck = resourceGovernor.checkResourceLimits({
      type: 'sandbox_test',
      changeCount: changes.length
    });
    
    if (!resourceCheck.allowed) {
      console.warn(`📉 Resource limit exceeded:`, resourceCheck.reason);
      return res.status(429).json({
        error: {
          message: `Resource limit exceeded: ${resourceCheck.reason}`,
          type: "invalid_request_error"
        }
      });
    }
    
    // Создаем песочницу
    const sandbox = new VirtualSandbox(process.cwd());
    const createResult = await sandbox.createSandbox();
    
    if (!createResult.success) {
      return res.status(500).json({
        error: {
          message: `Failed to create sandbox: ${createResult.error}`,
          type: "invalid_request_error"
        }
      });
    }
    
    // Применяем изменения к песочнице
    const applyResult = await sandbox.applyChangesToSandbox(changes);
    
    if (!applyResult.success) {
      await sandbox.destroySandbox();
      return res.status(500).json({
        error: {
          message: `Failed to apply changes to sandbox: ${applyResult.error}`,
          type: "invalid_request_error"
        }
      });
    }
    
    // Запускаем тесты в песочнице
    const testResults = await sandbox.runTestsInSandbox(testConfig || {});
    
    // Уничтожаем песочницу
    await sandbox.destroySandbox();
    
    res.json({
      success: true,
      testResults,
      appliedChanges: applyResult.appliedChanges
    });
  } catch (error) {
    console.error("❌ Error in /v1/sandbox-test:", error);
    res.status(500).json({
      error: {
        message: "Failed to run sandbox test",
        type: "invalid_request_error"
      }
    });
  }
});

/**
 * 🆗 Endpoint для оркестрации выполнения целей
 */
app.post("/v1/orchestrate-goal", async (req, res) => {
  try {
    const { query, context } = req.body;
    
    if (!query) {
      return res.status(400).json({
        error: {
          message: "Goal query is required",
          type: "invalid_request_error"
        }
      });
    }
    
    // Проверяем безопасность операции
    if (!formalSafetyModel) {
      formalSafetyModel = new FormalSafetyModel();
    }
    
    const safetyCheck = formalSafetyModel.validateOperation({
      type: 'orchestrate_goal',
      payload: { query, context }
    });
    
    if (!safetyCheck.safe) {
      console.warn(`🚨 Safety violation in goal orchestration:`, safetyCheck.violations);
      return res.status(400).json({
        error: {
          message: `Safety check failed: ${safetyCheck.violations.join(', ')}`,
          type: "invalid_request_error"
        }
      });
    }
    
    // Проверяем ограничения ресурсов
    if (!resourceGovernor) {
      resourceGovernor = new ResourceGovernor();
    }
    
    const resourceCheck = resourceGovernor.checkResourceLimits({
      type: 'orchestrate_goal',
      complexity: context?.complexity || 'medium'
    });
    
    if (!resourceCheck.allowed) {
      console.warn(`📉 Resource limit exceeded:`, resourceCheck.reason);
      return res.status(429).json({
        error: {
          message: `Resource limit exceeded: ${resourceCheck.reason}`,
          type: "invalid_request_error"
        }
      });
    }
    
    // Создаем оркестратор, если он не создан
    if (!orchestrationEngine) {
      orchestrationEngine = new OrchestrationEngine(process.cwd());
    }
    
    // Выполняем цель
    const result = await orchestrationEngine.executeGoal({
      query,
      context: context || {}
    });
    
    res.json(result);
  } catch (error) {
    console.error("❌ Error in /v1/orchestrate-goal:", error);
    res.status(500).json({
      error: {
        message: "Failed to orchestrate goal execution",
        type: "invalid_request_error"
      }
    });
  }
});

/**
 * 🆘 Endpoint для получения информации о надежности системы
 */
app.get("/v1/reliability-info", async (req, res) => {
  try {
    // Инициализируем движки, если они не были инициализированы
    if (!stabilityEngine) {
      stabilityEngine = new StabilityTheoryEngine();
    }
    
    if (!evolutionEngine) {
      evolutionEngine = new EvolutionEngine();
    }
    
    if (!antiStagnationEngine) {
      antiStagnationEngine = new AntiStagnationEngine();
    }
    
    const stabilityStatus = stabilityEngine.getSystemStabilityStatus();
    const evolutionStatus = evolutionEngine.analyzeTrends();
    const diversityStatus = antiStagnationEngine.assessDiversity();
    
    res.json({
      reliability: {
        stability: stabilityStatus,
        evolution: evolutionStatus,
        diversity: diversityStatus,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error("❌ Error in /v1/reliability-info:", error);
    res.status(500).json({
      error: {
        message: "Failed to get reliability information",
        type: "invalid_request_error"
      }
    });
  }
});

/**
 * 🆘 Endpoint для получения статуса устойчивости системы
 */
app.get("/v1/stability-status", async (req, res) => {
  try {
    if (!stabilityEngine) {
      stabilityEngine = new StabilityTheoryEngine();
    }
    
    // Обновляем метрики устойчивости
    stabilityEngine.updateMetrics({
      conflict: Math.random() > 0.95, // имитация редких конфликтов
      rollback: Math.random() > 0.97, // имитация редких откатов
      resourceSpike: Math.random() > 0.98, // имитация редких всплесков ресурсов
      architectureDrift: Math.random() > 0.96 // имитация редких отклонений архитектуры
    });
    
    const stabilityStatus = stabilityEngine.getSystemStabilityStatus();
    
    // Активируем защитные меры при низкой устойчивости
    const protectionResult = stabilityEngine.activateProtectionMeasures();
    
    res.json({
      stability: stabilityStatus,
      protection: protectionResult,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("❌ Error in /v1/stability-status:", error);
    res.status(500).json({
      error: {
        message: "Failed to get stability status",
        type: "invalid_request_error"
      }
    });
  }
});

/**
 * 🆘 Endpoint для получения прогноза эволюции архитектуры
 */
app.get("/v1/architecture-evolution-prediction", async (req, res) => {
  try {
    if (!evolutionEngine) {
      evolutionEngine = new EvolutionEngine();
    }
    
    const forecast = evolutionEngine.forecastArchitectureDecay();
    const trends = evolutionEngine.analyzeTrends();
    const statistics = evolutionEngine.getChangeStatistics();
    
    res.json({
      forecast,
      trends,
      statistics,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("❌ Error in /v1/architecture-evolution-prediction:", error);
    res.status(500).json({
      error: {
        message: "Failed to get architecture evolution prediction",
        type: "invalid_request_error"
      }
    });
  }
});

/**
 * 🆘 Endpoint для проверки деградации архитектуры
 */
app.get("/v1/architecture-degradation-check", async (req, res) => {
  try {
    if (!evolutionEngine) {
      evolutionEngine = new EvolutionEngine();
    }
    
    const degradationReport = evolutionEngine.detectArchitectureDegradation();
    
    res.json({
      degradation: degradationReport,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("❌ Error in /v1/architecture-degradation-check:", error);
    res.status(500).json({
      error: {
        message: "Failed to check architecture degradation",
        type: "invalid_request_error"
      }
    });
  }
});

/**
 * 🆘 Endpoint для получения рекомендаций по предотвращению застоя
 */
app.get("/v1/anti-stagnation-recommendations", async (req, res) => {
  try {
    if (!antiStagnationEngine) {
      antiStagnationEngine = new AntiStagnationEngine();
    }
    
    const recommendations = antiStagnationEngine.getImprovementRecommendations();
    const stats = antiStagnationEngine.getUsageStatistics();
    
    res.json({
      recommendations,
      statistics: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("❌ Error in /v1/anti-stagnation-recommendations:", error);
    res.status(500).json({
      error: {
        message: "Failed to get anti-stagnation recommendations",
        type: "invalid_request_error"
      }
    });
  }
});

/**
 * 🆘 Endpoint для решения ограничений дизайна
 */
app.post("/v1/solve-design-constraints", async (req, res) => {
  try {
    const { problem, constraints } = req.body;
    
    if (!problem) {
      return res.status(400).json({
        error: {
          message: "Problem definition is required",
          type: "invalid_request_error"
        }
      });
    }
    
    if (!constraintSolver) {
      constraintSolver = new ConstraintSolver();
    }
    
    // Добавляем ограничения, если они предоставлены
    if (constraints && Array.isArray(constraints)) {
      for (const constraint of constraints) {
        constraintSolver.addConstraint(constraint);
      }
    }
    
    // Решаем задачу с ограничениями
    const result = constraintSolver.solveWithConstraints(problem);
    
    res.json({
      solution: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("❌ Error in /v1/solve-design-constraints:", error);
    res.status(500).json({
      error: {
        message: "Failed to solve design constraints",
        type: "invalid_request_error"
      }
    });
  }
});

/**
 * 🆘 Endpoint для получения статистики по решению ограничений
 */
app.get("/v1/constraint-solver-statistics", async (req, res) => {
  try {
    if (!constraintSolver) {
      constraintSolver = new ConstraintSolver();
    }
    
    const stats = constraintSolver.getConstraintStatistics();
    
    res.json({
      statistics: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("❌ Error in /v1/constraint-solver-statistics:", error);
    res.status(500).json({
      error: {
        message: "Failed to get constraint solver statistics",
        type: "invalid_request_error"
      }
    });
  }
});

/**
 * 🆘 Endpoint для получения текущего уровня разнообразия стратегий
 */
app.get("/v1/diversity-assessment", async (req, res) => {
  try {
    if (!antiStagnationEngine) {
      antiStagnationEngine = new AntiStagnationEngine();
    }
    
    const diversity = antiStagnationEngine.assessDiversity();
    
    res.json({
      diversity: diversity,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("❌ Error in /v1/diversity-assessment:", error);
    res.status(500).json({
      error: {
        message: "Failed to assess diversity",
        type: "invalid_request_error"
      }
    });
  }
});

/**
 * 🆘 Endpoint для принудительного впрыска случайной стратегии
 */
app.post("/v1/inject-random-strategy", async (req, res) => {
  try {
    if (!antiStagnationEngine) {
      antiStagnationEngine = new AntiStagnationEngine();
    }
    
    const policy = antiStagnationEngine.injectRandomStrategy();
    
    res.json({
      policy: policy,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("❌ Error in /v1/inject-random-strategy:", error);
    res.status(500).json({
      error: {
        message: "Failed to inject random strategy",
        type: "invalid_request_error"
      }
    });
  }
});

/**
 * 🆘 Endpoint для принудительного впрыска случайной модели
 */
app.post("/v1/inject-random-model", async (req, res) => {
  try {
    if (!antiStagnationEngine) {
      antiStagnationEngine = new AntiStagnationEngine();
    }
    
    const policy = antiStagnationEngine.injectRandomModel();
    
    res.json({
      policy: policy,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("❌ Error in /v1/inject-random-model:", error);
    res.status(500).json({
      error: {
        message: "Failed to inject random model",
        type: "invalid_request_error"
      }
    });
  }
});

/**
 * 🆘 Endpoint для получения текущей политики исследования
 */
app.post("/v1/exploration-policy", async (req, res) => {
  try {
    if (!antiStagnationEngine) {
      antiStagnationEngine = new AntiStagnationEngine();
    }
    
    const context = req.body.context || {};
    const policy = antiStagnationEngine.getExplorationPolicy(context);
    
    res.json({
      policy: policy,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("❌ Error in /v1/exploration-policy:", error);
    res.status(500).json({
      error: {
        message: "Failed to get exploration policy",
        type: "invalid_request_error"
      }
    });
  }
});

/**
 * 🆘 Endpoint для получения текущего уровня энтропии архитектуры
 */
app.get("/v1/architecture-entropy", async (req, res) => {
  try {
    if (!evolutionEngine) {
      evolutionEngine = new EvolutionEngine();
    }
    
    const entropy = evolutionEngine.architectureEntropy;
    const history = evolutionEngine.entropyHistory.slice(-20); // последние 20 значений
    
    res.json({
      entropy: entropy,
      history: history,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("❌ Error in /v1/architecture-entropy:", error);
    res.status(500).json({
      error: {
        message: "Failed to get architecture entropy",
        type: "invalid_request_error"
      }
    });
  }
});

/**
 * 🆘 Endpoint для получения текущего уровня устойчивости системы
 */
app.get("/v1/system-stability-index", async (req, res) => {
  try {
    if (!stabilityEngine) {
      stabilityEngine = new StabilityTheoryEngine();
    }
    
    const stabilityIndex = stabilityEngine.calculateStabilityIndex();
    
    res.json({
      stabilityIndex: stabilityIndex,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("❌ Error in /v1/system-stability-index:", error);
    res.status(500).json({
      error: {
        message: "Failed to get system stability index",
        type: "invalid_request_error"
      }
    });
  }
});

/**
 * 🆘 Endpoint для регистрации агента в системе
 */
app.post("/v1/register-agent", async (req, res) => {
  try {
    const { agentId, agentSpec } = req.body;
    
    if (!agentId) {
      return res.status(400).json({
        error: {
          message: "Agent ID is required",
          type: "invalid_request_error"
        }
      });
    }
    
    if (!stabilityEngine) {
      stabilityEngine = new StabilityTheoryEngine();
    }
    
    stabilityEngine.registerAgent(agentId, agentSpec);
    
    res.json({
      success: true,
      agentId: agentId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("❌ Error in /v1/register-agent:", error);
    res.status(500).json({
      error: {
        message: "Failed to register agent",
        type: "invalid_request_error"
      }
    });
  }
});

/**
 * 🆘 Endpoint для обновления статуса агента
 */
app.post("/v1/update-agent-status", async (req, res) => {
  try {
    const { agentId, status, additionalData } = req.body;
    
    if (!agentId || !status) {
      return res.status(400).json({
        error: {
          message: "Agent ID and status are required",
          type: "invalid_request_error"
        }
      });
    }
    
    if (!stabilityEngine) {
      stabilityEngine = new StabilityTheoryEngine();
    }
    
    stabilityEngine.updateAgentStatus(agentId, status, additionalData);
    
    res.json({
      success: true,
      agentId: agentId,
      status: status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("❌ Error in /v1/update-agent-status:", error);
    res.status(500).json({
      error: {
        message: "Failed to update agent status",
        type: "invalid_request_error"
      }
    });
  }
});

/**
 * 🆘 Endpoint для изоляции нестабильных агентов
 */
app.post("/v1/isolate-unstable-agents", async (req, res) => {
  try {
    if (!stabilityEngine) {
      stabilityEngine = new StabilityTheoryEngine();
    }
    
    const isolationReport = stabilityEngine.isolateUnstableAgents();
    
    res.json({
      isolationReport: isolationReport,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("❌ Error in /v1/isolate-unstable-agents:", error);
    res.status(500).json({
      error: {
        message: "Failed to isolate unstable agents",
        type: "invalid_request_error"
      }
    });
  }
});

/**
 * 🆘 Endpoint для обнаружения конфликтов между агентами
 */
app.get("/v1/detect-conflicts", async (req, res) => {
  try {
    if (!stabilityEngine) {
      stabilityEngine = new StabilityTheoryEngine();
    }
    
    const conflictReport = stabilityEngine.detectConflicts();
    
    res.json({
      conflictReport: conflictReport,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("❌ Error in /v1/detect-conflicts:", error);
    res.status(500).json({
      error: {
        message: "Failed to detect conflicts",
        type: "invalid_request_error"
      }
    });
  }
});

/**
 * 🆘 Endpoint для балансировки нагрузки между агентами
 */
app.get("/v1/balance-load", async (req, res) => {
  try {
    if (!stabilityEngine) {
      stabilityEngine = new StabilityTheoryEngine();
    }
    
    const loadDistribution = stabilityEngine.balanceLoad();
    
    res.json({
      loadDistribution: loadDistribution,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("❌ Error in /v1/balance-load:", error);
    res.status(500).json({
      error: {
        message: "Failed to balance load",
        type: "invalid_request_error"
      }
    });
  }
});

/**
 * 🆘 Endpoint для активации защитных мер при низкой устойчивости
 */
app.post("/v1/activate-protection-measures", async (req, res) => {
  try {
    if (!stabilityEngine) {
      stabilityEngine = new StabilityTheoryEngine();
    }
    
    const protectionResult = stabilityEngine.activateProtectionMeasures();
    
    res.json({
      protectionResult: protectionResult,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("❌ Error in /v1/activate-protection-measures:", error);
    res.status(500).json({
      error: {
        message: "Failed to activate protection measures",
        type: "invalid_request_error"
      }
    });
  }
});

/**
 * 🆘 Endpoint для получения статистики по решению ограничений
 */
app.get("/v1/constraint-statistics", async (req, res) => {
  try {
    if (!constraintSolver) {
      constraintSolver = new ConstraintSolver();
    }
    
    const stats = constraintSolver.getConstraintStatistics();
    
    res.json({
      statistics: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("❌ Error in /v1/constraint-statistics:", error);
    res.status(500).json({
      error: {
        message: "Failed to get constraint statistics",
        type: "invalid_request_error"
      }
    });
  }
});

/**
 * 🆘 Endpoint для очистки всех ограничений
 */
app.post("/v1/clear-all-constraints", async (req, res) => {
  try {
    if (!constraintSolver) {
      constraintSolver = new ConstraintSolver();
    }
    
    constraintSolver.clearConstraints();
    
    res.json({
      success: true,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("❌ Error in /v1/clear-all-constraints:", error);
    res.status(500).json({
      error: {
        message: "Failed to clear all constraints",
        type: "invalid_request_error"
      }
    });
  }
});

/**
 * 🆘 Endpoint для добавления ограничения
 */
app.post("/v1/add-constraint", async (req, res) => {
  try {
    const { constraint } = req.body;
    
    if (!constraint) {
      return res.status(400).json({
        error: {
          message: "Constraint object is required",
          type: "invalid_request_error"
        }
      });
    }
    
    if (!constraintSolver) {
      constraintSolver = new ConstraintSolver();
    }
    
    const id = constraintSolver.addConstraint(constraint);
    
    res.json({
      success: true,
      constraintId: id,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("❌ Error in /v1/add-constraint:", error);
    res.status(500).json({
      error: {
        message: "Failed to add constraint",
        type: "invalid_request_error"
      }
    });
  }
});

/**
 * 🆘 Endpoint для удаления ограничения
 */
app.delete("/v1/remove-constraint/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({
        error: {
          message: "Constraint ID is required",
          type: "invalid_request_error"
        }
      });
    }
    
    if (!constraintSolver) {
      constraintSolver = new ConstraintSolver();
    }
    
    const result = constraintSolver.removeConstraint(id);
    
    res.json({
      success: result,
      constraintId: id,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("❌ Error in /v1/remove-constraint:", error);
    res.status(500).json({
      error: {
        message: "Failed to remove constraint",
        type: "invalid_request_error"
      }
    });
  }
});

/**
 * 🆘 Endpoint для получения текущих ограничений
 */
app.get("/v1/current-constraints", async (req, res) => {
  try {
    if (!constraintSolver) {
      constraintSolver = new ConstraintSolver();
    }
    
    res.json({
      constraints: constraintSolver.constraints,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("❌ Error in /v1/current-constraints:", error);
    res.status(500).json({
      error: {
        message: "Failed to get current constraints",
        type: "invalid_request_error"
      }
    });
  }
});

/**
 * 🆘 Endpoint для получения статистики использования анти-застревающего механизма
 */
app.get("/v1/anti-stagnation-stats", async (req, res) => {
  try {
    if (!antiStagnationEngine) {
      antiStagnationEngine = new AntiStagnationEngine();
    }
    
    const stats = antiStagnationEngine.getUsageStatistics();
    
    res.json({
      statistics: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("❌ Error in /v1/anti-stagnation-stats:", error);
    res.status(500).json({
      error: {
        message: "Failed to get anti-stagnation statistics",
        type: "invalid_request_error"
      }
    });
  }
});

/**
 * 🆘 Endpoint для сброса анти-застревающего механизма
 */
app.post("/v1/reset-anti-stagnation", async (req, res) => {
  try {
    if (!antiStagnationEngine) {
      antiStagnationEngine = new AntiStagnationEngine();
    }
    
    antiStagnationEngine.reset();
    
    res.json({
      success: true,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("❌ Error in /v1/reset-anti-stagnation:", error);
    res.status(500).json({
      error: {
        message: "Failed to reset anti-stagnation engine",
        type: "invalid_request_error"
      }
    });
  }
});

/**
 * 🆘 Endpoint для настройки параметров анти-застревающего механизма
 */
app.post("/v1/configure-anti-stagnation", async (req, res) => {
  try {
    const { options } = req.body;
    
    if (!options) {
      return res.status(400).json({
        error: {
          message: "Options object is required",
          type: "invalid_request_error"
        }
      });
    }
    
    if (!antiStagnationEngine) {
      antiStagnationEngine = new AntiStagnationEngine();
    }
    
    antiStagnationEngine.configure(options);
    
    res.json({
      success: true,
      options: options,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("❌ Error in /v1/configure-anti-stagnation:", error);
    res.status(500).json({
      error: {
        message: "Failed to configure anti-stagnation engine",
        type: "invalid_request_error"
      }
    });
  }
});

/**
 * 🆘 Endpoint для получения текущих параметров анти-застревающего механизма
 */
app.get("/v1/anti-stagnation-config", async (req, res) => {
  try {
    if (!antiStagnationEngine) {
      antiStagnationEngine = new AntiStagnationEngine();
    }
    
    res.json({
      config: {
        epsilonGreedyFactor: antiStagnationEngine.epsilonGreedyFactor,
        forcedModelRotationInterval: antiStagnationEngine.forcedModelRotationInterval,
        randomStrategyInjectionInterval: antiStagnationEngine.randomStrategyInjectionInterval
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("❌ Error in /v1/anti-stagnation-config:", error);
    res.status(500).json({
      error: {
        message: "Failed to get anti-stagnation configuration",
        type: "invalid_request_error"
      }
    });
  }
});

/**
 * 🆘 Endpoint для получения текущего уровня эволюции системы
 */
app.get("/v1/evolution-level", async (req, res) => {
  try {
    if (!evolutionEngine) {
      evolutionEngine = new EvolutionEngine();
    }
    
    const level = evolutionEngine.getChangeStatistics();
    
    res.json({
      level: level,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("❌ Error in /v1/evolution-level:", error);
    res.status(500).json({
      error: {
        message: "Failed to get evolution level",
        type: "invalid_request_error"
      }
    });
  }
});

/**
 * 🆘 Endpoint для получения статистики по изменению системы
 */
app.get("/v1/change-statistics", async (req, res) => {
  try {
    if (!evolutionEngine) {
      evolutionEngine = new EvolutionEngine();
    }
    
    const stats = evolutionEngine.getChangeStatistics();
    
    res.json({
      statistics: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("❌ Error in /v1/change-statistics:", error);
    res.status(500).json({
      error: {
        message: "Failed to get change statistics",
        type: "invalid_request_error"
      }
    });
  }
});

/**
 * 🆘 Endpoint для получения текущего вектора изменений
 */
app.post("/v1/calculate-change-vector", async (req, res) => {
  try {
    const { changeData } = req.body;
    
    if (!changeData) {
      return res.status(400).json({
        error: {
          message: "Change data object is required",
          type: "invalid_request_error"
        }
      });
    }
    
    if (!evolutionEngine) {
      evolutionEngine = new EvolutionEngine();
    }
    
    const vector = evolutionEngine.calculateChangeVector(changeData);
    
    res.json({
      vector: vector,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("❌ Error in /v1/calculate-change-vector:", error);
    res.status(500).json({
      error: {
        message: "Failed to calculate change vector",
        type: "invalid_request_error"
      }
    });
  }
});

/**
 * 🆘 Endpoint для получения анализа тенденций системы
 */
app.get("/v1/trend-analysis", async (req, res) => {
  try {
    if (!evolutionEngine) {
      evolutionEngine = new EvolutionEngine();
    }
    
    const analysis = evolutionEngine.analyzeTrends();
    
    res.json({
      analysis: analysis,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("❌ Error in /v1/trend-analysis:", error);
    res.status(500).json({
      error: {
        message: "Failed to get trend analysis",
        type: "invalid_request_error"
      }
    });
  }
});

/**
 * 🆘 Endpoint для получения текущего состояния ресурсного управления
 */
app.get("/v1/resource-status", async (req, res) => {
  try {
    if (!resourceGovernor) {
      resourceGovernor = new ResourceGovernor();
    }
    
    const status = resourceGovernor.getCurrentResourceStatus();
    
    res.json({
      status: status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("❌ Error in /v1/resource-status:", error);
    res.status(500).json({
      error: {
        message: "Failed to get resource status",
        type: "invalid_request_error"
      }
    });
  }
});

/**
 * 🆘 Endpoint для получения текущего состояния безопасности
 */
app.get("/v1/safety-status", async (req, res) => {
  try {
    if (!formalSafetyModel) {
      formalSafetyModel = new FormalSafetyModel();
    }
    
    const status = formalSafetyModel.getSafetyStatus();
    
    res.json({
      status: status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("❌ Error in /v1/safety-status:", error);
    res.status(500).json({
      error: {
        message: "Failed to get safety status",
        type: "invalid_request_error"
      }
    });
  }
});

/**
 * 🆘 Endpoint для получения текущего когнитивного состояния системы
 */
app.get("/v1/cognitive-state", async (req, res) => {
  try {
    if (!cognitiveWorkspace) {
      cognitiveWorkspace = new CognitiveWorkspaceCore(process.cwd());
    }
    
    const state = cognitiveWorkspace.getCurrentCognitiveState();
    
    res.json({
      state: state,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("❌ Error in /v1/cognitive-state:", error);
    res.status(500).json({
      error: {
        message: "Failed to get cognitive state",
        type: "invalid_request_error"
      }
    });
  }
});

/**
 * 🆘 Endpoint для получения текущего детерминистского состояния выполнения
 */
app.get("/v1/deterministic-state", async (req, res) => {
  try {
    if (!deterministicExecutionLayer) {
      deterministicExecutionLayer = new DeterministicExecutionLayer();
    }
    
    const state = deterministicExecutionLayer.getCurrentExecutionState();
    
    res.json({
      state: state,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("❌ Error in /v1/deterministic-state:", error);
    res.status(500).json({
      error: {
        message: "Failed to get deterministic execution state",
        type: "invalid_request_error"
      }
    });
  }
});

/**
 * 🆘 Endpoint для получения истории детерминистского выполнения
 */
app.get("/v1/deterministic-history", async (req, res) => {
  try {
    if (!deterministicExecutionLayer) {
      deterministicExecutionLayer = new DeterministicExecutionLayer();
    }
    
    const history = deterministicExecutionLayer.getExecutionHistory();
    
    res.json({
      history: history,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("❌ Error in /v1/deterministic-history:", error);
    res.status(500).json({
      error: {
        message: "Failed to get deterministic execution history",
        type: "invalid_request_error"
      }
    });
  }
});

/**
 * 🆘 Endpoint для получения снимка выполнения
 */
app.get("/v1/get-execution-snapshot/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({
        error: {
          message: "Snapshot ID is required",
          type: "invalid_request_error"
        }
      });
    }
    
    if (!deterministicExecutionLayer) {
      deterministicExecutionLayer = new DeterministicExecutionLayer();
    }
    
    const snapshot = deterministicExecutionLayer.getSnapshotById(id);
    
    if (!snapshot) {
      return res.status(404).json({
        error: {
          message: "Snapshot not found",
          type: "not_found_error"
        }
      });
    }
    
    res.json({
      snapshot: snapshot,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("❌ Error in /v1/get-execution-snapshot:", error);
    res.status(500).json({
      error: {
        message: "Failed to get execution snapshot",
        type: "invalid_request_error"
      }
    });
  }
});

/**
 * 🆘 Endpoint для воспроизведения выполнения из снимка
 */
app.post("/v1/replay-execution/:snapshotId", async (req, res) => {
  try {
    const { snapshotId } = req.params;
    
    if (!snapshotId) {
      return res.status(400).json({
        error: {
          message: "Snapshot ID is required",
          type: "invalid_request_error"
        }
      });
    }
    
    // Создаем детерминистский слой выполнения, если он не создан
    if (!deterministicExecutionLayer) {
      deterministicExecutionLayer = new DeterministicExecutionLayer();
    }
    
    // Пытаемся воспроизвести выполнение
    const replayResult = await deterministicExecutionLayer.replayExecution(snapshotId);
    
    res.json({
      success: replayResult.success,
      result: replayResult.result,
      differences: replayResult.differences,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("❌ Error in /v1/replay-execution:", error);
    res.status(500).json({
      error: {
        message: "Failed to replay execution",
        type: "invalid_request_error"
      }
    });
  }
});

/**
 * 🆘 Endpoint для получения когнитивного представления проекта
 */
app.get("/v1/cognitive-view", async (req, res) => {
  try {
    // Создаем когнитивное рабочее пространство, если оно не создано
    if (!cognitiveWorkspace) {
      cognitiveWorkspace = new CognitiveWorkspaceCore(process.cwd());
    }
    
    // Строим когнитивную модель
    const cognitiveModel = await cognitiveWorkspace.buildConceptualModel();
    
    // Получаем сжатое когнитивное представление для LLM
    const cognitiveView = cognitiveWorkspace.getCognitiveViewForLLM();
    
    res.json({
      success: true,
      cognitiveModel,
      cognitiveView,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("❌ Error in /v1/cognitive-view:", error);
    res.status(500).json({
      error: {
        message: "Failed to generate cognitive view of the project",
        type: "invalid_request_error"
      }
    });
  }
});

/**
 * 🆘 Endpoint для оценки решения
 */
app.post("/v1/evaluate-solution", async (req, res) => {
  try {
    const { solution } = req.body;
    
    if (!solution) {
      return res.status(400).json({
        error: {
          message: "Solution object is required",
          type: "invalid_request_error"
        }
      });
    }
    
    // Создаем модель оценки, если она не создана
    if (!solutionEvaluationModel) {
      solutionEvaluationModel = new SolutionEvaluationModel();
    }
    
    // Оцениваем решение
    const evaluation = solutionEvaluationModel.evaluateSolution(solution);
    
    res.json({
      success: true,
      evaluation,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("❌ Error in /v1/evaluate-solution:", error);
    res.status(500).json({
      error: {
        message: "Failed to evaluate solution",
        type: "invalid_request_error"
      }
    });
  }
});

/**
 * 🆘 Endpoint для проверки безопасности операции
 */
app.post("/v1/check-safety", async (req, res) => {
  try {
    const { operation } = req.body;
    
    if (!operation) {
      return res.status(400).json({
        error: {
          message: "Operation object is required",
          type: "invalid_request_error"
        }
      });
    }
    
    // Создаем модель безопасности, если она не создана
    if (!formalSafetyModel) {
      formalSafetyModel = new FormalSafetyModel();
    }
    
    // Проверяем безопасность операции
    const safetyCheck = formalSafetyModel.validateOperation(operation);
    
    res.json({
      safe: safetyCheck.safe,
      violations: safetyCheck.violations,
      warnings: safetyCheck.warnings,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("❌ Error in /v1/check-safety:", error);
    res.status(500).json({
      error: {
        message: "Failed to check operation safety",
        type: "invalid_request_error"
      }
    });
  }
});

// Serve API documentation
app.get("/docs/api", (req, res) => {
  res.sendFile(path.join(process.cwd(), "docs/api/swagger-ui.html"));
});

app.get("/docs/api/openapi-spec.json", (req, res) => {
  res.sendFile(path.join(process.cwd(), "docs/api/openapi-spec.json"));
});

/**
 * 🔤 Endpoint для главной страницы - веб-интерфейс мониторинга или JSON API info
 */
app.get("/", (req, res) => {
  // Если запрос JSON (например, из тестов), возвращаем API информацию
  if (req.accepts('application/json')) {
    res.json({
      message: "Cognitive Execution Layer (CEL) API",
      version: "4.2.0",
      endpoints: {
        health: "/health",
        usage: "/usage",
        models: "/v1/models",
        chat: "/v1/chat/completions",
        codeAssist: "/v1/code-assist",
        projectContext: "/v1/project-context/*",
        documentation: "/docs/api"
      }
    });
  } else {
    // Иначе возвращаем HTML дашборд
    res.sendFile(path.join(__dirname, '..', '..', 'public', 'dashboard.html'));
  }
});

// Ограничиваем прослушивание только локальному интерфейсу
app.listen(PORT, LISTEN_ADDRESS, () => {
  console.log(`🚀 LLM Control Plane v4.0 is running on http://${LISTEN_ADDRESS}:${PORT}`);
  console.log(`📋 Available models: ${FALLBACK_MODELS.length} free models`);
  console.log(`📊 Dashboard available at: http://${LISTEN_ADDRESS}:${PORT}`);
  if (USAGE_BUDGET_LIMIT) {
    console.log(`💰 Usage budget limit: ${USAGE_BUDGET_LIMIT} tokens`);
  }
  console.log(`🎯 Ready to serve as next-generation agent IDE orchestration engine!`);
});