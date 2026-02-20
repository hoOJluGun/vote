/**
 * LLM Control Plane v4.0 - Next Generation Agent IDE Orchestration Engine
 * 
 * Основной production-сервер с полным набором функций:
 * - Интеллектуальный оркестратор среды разработки
 * - Граф знаний проекта
 * - Многоагентная архитектура
 * - Система симуляции и оценки решений
 * - Самообучающийся цикл улучшения
 * - Когнитивное рабочее пространство
 * - Протокол взаимодействия агентов
 * - Математическая модель оценки решений
 * - Детерминистский слой выполнения
 * - Управление ресурсами
 * - Формальная модель безопасности
 * - Теория устойчивости
 * - Эволюционный движок
 * - Анти-застревающий механизм
 * - Решатель ограничений
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

// Для обслуживания статических файлов
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Загружаем переменные окружения из корня проекта
dotenv.config({ path: path.join(process.cwd(), '.env') });

const app = express();
app.use(express.json({ limit: "10mb" }));

// Обслуживание статических файлов из папки public
app.use(express.static(path.join(__dirname, '..', '..', 'public')));

const PORT = process.env.PORT || 3000;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_BASE = process.env.OPENROUTER_BASE;
// Используем 127.0.0.1 для локального доступа
const LISTEN_ADDRESS = '127.0.0.1';

// Создаем трекер использования и оптимизатор затрат
const USAGE_BUDGET_LIMIT = parseInt(process.env.USAGE_BUDGET_LIMIT) || null;
const usageTracker = new AdvancedUsageTracker(USAGE_BUDGET_LIMIT);
const costOptimizer = new CostOptimizer();

// Менеджеры для проекта
let fileAgentManager = null;
// Оркестратор выполнения задач
let orchestrationEngine = null;
// Когнитивное рабочее пространство
let cognitiveWorkspace = null;
// Протокол взаимодействия агентов
let agentProtocol = null;
// Модель оценки решений
let solutionEvaluationModel = null;
// Детерминистский слой выполнения
let deterministicExecutionLayer = null;
// Управление ресурсами
let resourceGovernor = null;
// Формальная модель безопасности
let formalSafetyModel = null;
// Теория устойчивости
let stabilityEngine = null;
// Эволюционный движок
let evolutionEngine = null;
// Анти-застревающий механизм
let antiStagnationEngine = null;
// Решатель ограничений
let constraintSolver = null;

// Загружаем существующие логи
usageTracker.loadLogs();

if (!OPENROUTER_API_KEY) {
  console.error("❌ Missing OPENROUTER_API_KEY in .env");
  process.exit(1);
}

if (!OPENROUTER_BASE) {
  console.error("❌ Missing OPENROUTER_BASE in .env");
  process.exit(1);
}

/**
 * Список всех бесплатных моделей
 */
const ALL_FREE_MODELS = [
  "upstage/solar-pro-3:free",
  "openai/gpt-oss-20b:free",
  "arcee-ai/trinity-large-preview:free",
  "stepfun/step-3.5-flash:free",
  "z-ai/glm-4.5-air:free",
  "deepseek/deepseek-r1-0528:free",
  "nvidia/nemotron-3-nano-30b-a3b:free",
  "openai/gpt-oss-120b:free",
  "arcee-ai/trinity-mini:free",
  "nvidia/nemotron-nano-9b-v2:free",
  "nvidia/nemotron-nano-12b-v2-vl:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "qwen/qwen3-coder:free",
  "qwen/qwen3-next-80b-a3b-instruct:free",
  "google/gemma-3-27b-it:free",
  "liquid/lfm-2.5-1.2b-thinking:free",
  "liquid/lfm-2.5-1.2b-instruct:free",
  "cognitivecomputations/dolphin-mistral-24b-venice-edition:free",
  "mistralai/mistral-small-3.1-24b-instruct:free",
  "google/gemma-3n-e4b-it:free",
  "nousresearch/hermes-3-llama-3.1-405b:free",
  "google/gemma-3n-e2b-it:free",
  "qwen/qwen3-4b:free",
  "google/gemma-3-4b-it:free",
  "meta-llama/llama-3.2-3b-instruct:free",
  "google/gemma-3-12b-it:free"
];

/**
 * Группировка моделей по типу и возможностям
 */
const MODEL_GROUPS = {
  // Быстрые и легковесные для коротких запросов
  fast: [
    "stepfun/step-3.5-flash:free",
    "meta-llama/llama-3.2-3b-instruct:free",
    "google/gemma-3-4b-it:free",
    "nvidia/nemotron-nano-9b-v2:free",
    "liquid/lfm-2.5-1.2b-instruct:free"
  ],
  // Баланс между возможностями и скоростью
  balanced: [
    "upstage/solar-pro-3:free",
    "z-ai/glm-4.5-air:free",
    "google/gemma-3-12b-it:free",
    "qwen/qwen3-4b:free",
    "google/gemma-3-27b-it:free"
  ],
  // Более способные для сложных запросов
  capable: [
    "arcee-ai/trinity-large-preview:free",
    "qwen/qwen3-coder:free",
    "mistralai/mistral-small-3.1-24b-instruct:free",
    "openai/gpt-oss-20b:free",
    "meta-llama/llama-3.3-70b-instruct:free"
  ],
  // Мощные для сложных задач
  powerful: [
    "qwen/qwen3-next-80b-a3b-instruct:free",
    "nousresearch/hermes-3-llama-3.1-405b:free",
    "openai/gpt-oss-120b:free",
    "deepseek/deepseek-r1-0528:free",
    "nvidia/nemotron-3-nano-30b-a3b:free"
  ]
};

/**
 * Комбинированный список моделей для fallback
 */
let FALLBACK_MODELS = ALL_FREE_MODELS;

/**
 * Проверяем, является ли статус причиной для fallback
 */
function shouldFallback(status) {
  return status === 429 || status === 402 || status === 503;
}

/**
 * Оценка длины промпта в токенах (приблизительно)
 * Это грубая оценка - в реальном приложении лучше использовать tiktoken или аналог
 */
function estimatePromptTokens(messages) {
  const text = messages.map(msg => msg.content).join(' ');
  // Грубая оценка: 1 токен ≈ 4 символа
  return Math.ceil(text.length / 4);
}

/**
 * Определение типа задачи по содержимому запроса
 */
function detectTaskType(messages) {
  // Получаем последнюю сообщение
  const lastMessage = messages[messages.length - 1];
  
  // Извлекаем содержимое сообщения
  let content = '';
  if (lastMessage && lastMessage.content) {
    if (typeof lastMessage.content === 'string') {
      content = lastMessage.content;
    } else if (typeof lastMessage.content === 'object') {
      // Если это объект, пробуем извлечь поле text или value
      content = lastMessage.content.text || lastMessage.content.value || '';
    }
  }
  
  // Преобразуем в нижний регистр для сравнения
  const lowerContent = typeof content === 'string' ? content.toLowerCase() : '';
  
  if (lowerContent.includes('refactor') || lowerContent.includes('переформулир')) {
    return 'refactoring';
  } else if (lowerContent.includes('comment') || lowerContent.includes('комментарий')) {
    return 'commenting';
  } else if (lowerContent.includes('generate') || lowerContent.includes('create') || lowerContent.includes('создай')) {
    return 'generation';
  } else if (lowerContent.includes('explain') || lowerContent.includes('объясни')) {
    return 'explanation';
  } else {
    return 'general';
  }
}

/**
 * Обновляет список моделей на основе их здоровья
 */
function updateFallbackModels() {
  const healthyModels = costOptimizer.getHealthyModels();
  if (healthyModels.length > 0) {
    // Фильтруем только нужные модели
    const targetModels = ALL_FREE_MODELS;
    const filteredModels = healthyModels.filter(model => targetModels.includes(model));
    
    if (filteredModels.length > 0) {
      FALLBACK_MODELS = filteredModels;
      console.log(`🔄 Updated fallback models based on health: ${FALLBACK_MODELS.join(', ')}`);
    } else {
      // Если целевые модели не здоровы, используем все доступные
      FALLBACK_MODELS = ALL_FREE_MODELS;
      console.log(`⚠️ Target models not healthy, using all available models`);
    }
  } else {
    // Если нет здоровых моделей, используем все
    FALLBACK_MODELS = ALL_FREE_MODELS;
    console.log(`⚠️ No healthy models found, using all available models`);
  }
}

/**
 * Интеллектуальный выбор модели на основе длины промпта, типа задачи и бюджета
 */
function selectModel(messages, taskType, tokens) {
  // Определяем оставшийся бюджет
  const remainingBudget = USAGE_BUDGET_LIMIT ? USAGE_BUDGET_LIMIT - usageTracker.currentTokensUsed : Infinity;
  
  // Используем оптимизатор для рекомендации модели
  const recommendation = costOptimizer.recommendModel(taskType, tokens, remainingBudget);
  
  if (recommendation) {
    console.log(`💡 Recommended model: ${recommendation.model} (score: ${recommendation.score.toFixed(3)}, predicted cost: $${recommendation.prediction.predictedCost.toFixed(6)})`);
    return recommendation.model;
  } else {
    // Если не удается уложиться в бюджет, возвращаем первую доступную модель
    console.log(`💰 Budget exceeded. Falling back to first available model.`);
    return ALL_FREE_MODELS[0];
  }
}

/**
 * Функция для добавления контекста проекта к сообщениям
 */
function addProjectContext(messages) {
  // Извлекаем контекст из последнего сообщения, если он есть
  const lastMessage = messages[messages.length - 1];
  let content = '';
  
  if (lastMessage && lastMessage.content) {
    if (typeof lastMessage.content === 'string') {
      content = lastMessage.content;
    } else if (typeof lastMessage.content === 'object') {
      // Если это объект, пробуем извлечь поле text или value
      content = lastMessage.content.text || lastMessage.content.value || '';
    }
  }
  
  // Проверяем, содержит ли запрос информацию о файле
  // Обычно Xcode передает путь к файлу и его содержимое в пользовательском сообщении
  if (content && (content.includes('__XCODE_FILE_PATH__') || content.includes('__XCODE_SELECTION__'))) {
    // Извлекаем информацию о файле из сообщения
    const filePathMatch = content.match(/__XCODE_FILE_PATH__:\s*(.+?)\s*\n/);
    const selectionMatch = content.match(/__XCODE_SELECTION__:\s*\n([\s\S]*?)\n__XCODE_/);
    const fullTextMatch = content.match(/__XCODE_FULL_TEXT__:\s*\n([\s\S]*)/);
    
    if (filePathMatch || selectionMatch || fullTextMatch) {
      // Создаем системное сообщение с контекстом проекта
      const projectContext = {
        role: "system",
        content: `Контекст проекта:\n` +
                 `- Рабочая директория: ${process.cwd()}\n` +
                 `- Текущий файл: ${filePathMatch ? filePathMatch[1] : 'неизвестен'}\n` +
                 `- Выделенный текст: ${selectionMatch ? selectionMatch[1] : 'не предоставлен'}\n` +
                 `- Полный текст файла: ${fullTextMatch ? fullTextMatch[1].substring(0, 2000) + (fullTextMatch[1].length > 2000 ? '...(обрезано)' : '') : 'не предоставлен'}\n\n` +
                 `При ответе на запрос пользователя, учитывайте этот контекст проекта.`
      };
      
      // Добавляем контекст в начало сообщений
      return [projectContext, ...messages];
    }
  }
  
  // Если Xcode не передал явный контекст, добавляем базовую информацию о проекте
  return [{
    role: "system",
    content: `Контекст проекта:\n` +
             `- Вы работаете с проектом в директории: ${process.cwd()}\n` +
             `- Ваша задача - помочь пользователю в разработке программного обеспечения\n` +
             `- При анализе или написании кода учитывайте, что вы работаете в контексте реального проекта\n\n` +
             `При ответе на запрос пользователя, учитывайте этот контекст проекта.`
  }, ...messages];
}

/**
 * 1️⃣ Эндпоинт для Xcode: получить список моделей
 */
app.get("/v1/models", async (req, res) => {
  try {
    // Обновляем модели перед каждым запросом (опционально, можно сделать реже)
    updateFallbackModels();
    
    console.log(`📋 Models requested from ${req.ip}`);
    res.json({
      object: "list",
      data: FALLBACK_MODELS.map((id) => ({
        id,
        object: "model",
        created: 0,
        owned_by: "openrouter"
      }))
    });
  } catch (error) {
    console.error("❌ Error in /v1/models:", error);
    
    // Логируем ошибку
    await usageTracker.logRequest({
      model: 'unknown',
      tokensIn: 0,
      tokensOut: 0,
      estimatedCost: 0,
      duration: 0,
      status: 500
    });
    
    res.status(500).json({
      error: {
        message: "Failed to fetch models",
        type: "invalid_request_error"
      }
    });
  }
});

/**
 * 2️⃣ Перехват chat/completions
 * Интеллектуальная маршрутизация с fallback, стримингом и логированием
 */
app.post("/v1/chat/completions", async (req, res) => {
  console.log(`🚀 Chat completion requested: ${req.ip}`);
  
  // Проверяем, не превышен ли бюджет
  if (usageTracker.shouldDisableProxy()) {
    const normalizedError = {
      error: {
        message: "Usage budget exceeded. Proxy temporarily disabled.",
        type: "invalid_request_error"
      }
    };
    
    console.log(`🛑 Budget exceeded, request denied`);
    res.status(429).json(normalizedError);
    return;
  }
  
  // Проверяем безопасность операции
  if (!formalSafetyModel) {
    formalSafetyModel = new FormalSafetyModel();
  }
  
  const safetyCheck = formalSafetyModel.validateOperation({
    type: 'llm_request',
    payload: req.body
  });
  
  if (!safetyCheck.safe) {
    console.warn(`🚨 Safety violation in LLM request:`, safetyCheck.violations);
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
    type: 'llm_request',
    tokens: estimatePromptTokens(req.body.messages || [])
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
  
  // Поддержка стриминга
  const isStreaming = req.body.stream === true;
  
  // Устанавливаем заголовки для стриминга, если нужно
  if (isStreaming) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
  } else {
    res.setHeader('Content-Type', 'application/json');
  }

  let responseSent = false;
  const startTime = Date.now();
  
  // Добавляем контекст проекта к сообщениям
  const messagesWithContext = addProjectContext(req.body.messages);
  
  // Определяем параметры запроса
  const tokens = estimatePromptTokens(messagesWithContext);
  const taskType = detectTaskType(messagesWithContext);
  
  // Определяем целевую модель с помощью интеллектуального выбора
  const selectedModel = selectModel(messagesWithContext, taskType, tokens);
  console.log(`🎯 Selected model for request: ${selectedModel} (tokens: ~${tokens}, task: ${taskType})`);
  
  // Попробовать модели по цепочке fallback, начиная с выбранной
  const modelChain = [selectedModel, ...FALLBACK_MODELS.filter(m => m !== selectedModel)];
  
  for (const model of modelChain) {
    try {
      const body = {
        ...req.body,
        messages: messagesWithContext,  // Используем сообщения с контекстом
        model: model  // Используем модель из цепочки
      };
      
      // Уменьшаем max_tokens для снижения задержки
      if (!body.max_tokens || body.max_tokens > 1024) {
        body.max_tokens = Math.min(body.max_tokens || 1024, 1024);
      }

      console.log(`📡 Forwarding request to ${model}...`);
      const response = await fetch(
        `${OPENROUTER_BASE}/chat/completions`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "http://localhost",
            "X-Title": "Xcode Proxy"
          },
          body: JSON.stringify(body)
        }
      );
      
      const duration = Date.now() - startTime;
      
      if (response.ok) {
        // Обновляем производительность модели
        costOptimizer.updateModelPerformance(model, duration, true, 0);
        
        // Если стриминг, передаем данные чанками
        if (isStreaming) {
          // Проверяем, поддерживает ли тело ответа асинхронное чтение
          if (response.body && response.body.getReader) {
            const reader = response.body.getReader();
            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                res.write(value);
              }
            } finally {
              reader.releaseLock();
            }
          } else {
            // Резервный вариант для совместимости
            const responseBuffer = await response.buffer();
            res.write(responseBuffer);
          }
          res.end();
          responseSent = true;
          
          // Логируем успешный стриминг запрос
          await usageTracker.logRequest({
            model: model,
            tokensIn: tokens,
            tokensOut: 0, // Для стриминга сложно точно определить количество токенов на выходе
            estimatedCost: 0, // Можно улучшить, вычисляя стоимость по токенам
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
          
          console.log(`✅ Streaming response sent successfully via ${model} (${duration}ms)`);
          break; // Успешно отправлено, выходим из цикла
        } else {
          // Если не стриминг, читаем весь ответ и отправляем
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
            structuralChange: 0.01, // небольшое изменение
            complexityDelta: 0.005,
            couplingDelta: 0.002,
            riskDelta: 0.001,
            performanceDelta: 0.001,
            maintainabilityDelta: 0.001
          });
          
          console.log(`✅ Response sent successfully via ${model} (${duration}ms)`);
          break; // Успешно отправлено, выходим из цикла
        }
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
      
      console.error(`💥 Network error with model ${model}:`, error.message);
      
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
        message: "All fallback models failed",
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
    
    console.log(`💀 All models failed, sent error to client`);
  }
});

/**
 * Эндпоинт для получения статистики использования
 */
app.get("/usage", async (req, res) => {
  try {
    const stats = await usageTracker.getUsageStats();
    
    res.json({
      cpu: 0, // Mock value
      memory: 0, // Mock value
      disk: 0, // Mock value
      requests: stats.totalRequests,
      tokensUsed: stats.totalTokensUsed,
      avgResponseTime: stats.avgResponseTime,
      successRate: stats.successRate
    });
  } catch (error) {
    console.error("❌ Error in /usage:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * 3️⃣ Health check
 */
app.get("/health", async (req, res) => {
  // Обновляем модели перед проверкой
  updateFallbackModels();
  
  const stats = await usageTracker.getUsageStats();
  const costStats = costOptimizer.getUsageStats();
  const fallbackStats = costOptimizer.getFallbackStats();
  
  console.log(`🏥 Health check requested: ${stats.totalRequests} total requests`);
  
  // Получаем статус устойчивости
  let stabilityStatus = null;
  if (stabilityEngine) {
    stabilityStatus = stabilityEngine.getSystemStabilityStatus();
  }
  
  res.json({ 
    status: "ok", 
    usage: stats,
    costStats,
    fallbackStats,
    budgetExceeded: usageTracker.shouldDisableProxy(),
    activeModels: FALLBACK_MODELS,
    currentTokensUsed: usageTracker.currentTokensUsed,
    budgetLimit: USAGE_BUDGET_LIMIT,
    modelHealth: FALLBACK_MODELS.map(model => ({
      model,
      health: costOptimizer.getModelHealth(model)
    })),
    stabilityStatus
  });
});

/**
 * 4️⃣ Endpoint для получения статистики использования
 */
app.get("/usage", async (req, res) => {
  const stats = await usageTracker.getUsageStats();
  const costStats = costOptimizer.getUsageStats();
  const fallbackStats = costOptimizer.getFallbackStats();
  const history = usageTracker.getHistory(24); // Последние 24 часа
  
  console.log(`📊 Usage stats requested: ${stats.totalRequests} total requests`);
  
  res.json({
    stats,
    costStats,
    fallbackStats,
    recentActivity: history,
    budgetLimit: USAGE_BUDGET_LIMIT,
    currentUsage: usageTracker.currentTokensUsed,
    budgetExceeded: usageTracker.shouldDisableProxy()
  });
});

/**
 * 5️⃣ Endpoint для получения рекомендаций по моделям
 */
app.get("/recommend-model/:taskType/:tokens", (req, res) => {
  const taskType = req.params.taskType;
  const tokens = parseInt(req.params.tokens);
  const remainingBudget = USAGE_BUDGET_LIMIT ? USAGE_BUDGET_LIMIT - usageTracker.currentTokensUsed : Infinity;
  
  const recommendation = costOptimizer.recommendModel(taskType, tokens, remainingBudget);
  
  if (recommendation) {
    console.log(`🔍 Model recommendation: ${recommendation.model} for ${taskType} task with ${tokens} tokens`);
    // Возвращаем структуру, совместимую с тестами
    res.json({
      recommendedModel: recommendation.model,
      model: recommendation.model, // Для обратной совместимости
      score: recommendation.score,
      prediction: recommendation.prediction,
      reasoning: `Recommended ${recommendation.model} based on task type "${taskType}", estimated tokens ${tokens}, and budget constraints. Score: ${recommendation.score.toFixed(3)}`
    });
  } else {
    res.status(400).json({ error: "No suitable model found within budget constraints" });
  }
});

/**
 * 6️⃣ Endpoint для получения контекста проекта
 */
app.get("/v1/project-context/*", async (req, res) => {
  try {
    // Получаем путь к файлу из части URL после "/v1/project-context/"
    const filePath = decodeURIComponent(req.params[0]);
    
    if (!filePath) {
      return res.status(400).json({
        error: {
          message: "File path is required",
          type: "invalid_request_error"
        }
      });
    }
    
    // Получаем полный контекст проекта
    const context = await ProjectContextAnalyzer.getFullProjectContext(filePath);
    
    // Добавляем информацию о зависимостях
    try {
      context.dependencies = await ProjectContextAnalyzer.getDependencies(context.projectRoot);
    } catch (depError) {
      console.warn("Could not retrieve dependencies:", depError.message);
      context.dependencies = {};
    }
    
    res.json(context);
  } catch (error) {
    console.error("❌ Error in /v1/project-context:", error);
    res.status(500).json({
      error: {
        message: "Failed to fetch project context",
        type: "invalid_request_error"
      }
    });
  }
});

/**
 * 7️⃣ Endpoint для запуска тестов
 */
app.post("/v1/run-tests", async (req, res) => {
  try {
    const { filePath } = req.body;
    
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
      type: 'run_tests',
      payload: { filePath }
    });
    
    if (!safetyCheck.safe) {
      console.warn(`🚨 Safety violation in test run:`, safetyCheck.violations);
      return res.status(400).json({
        error: {
          message: `Safety check failed: ${safetyCheck.violations.join(', ')}`,
          type: "invalid_request_error"
        }
      });
    }
    
    // Запускаем тесты для файла
    const testResults = await CodeTesterLinter.runTestsForFile(filePath);
    
    res.json(testResults);
  } catch (error) {
    console.error("❌ Error in /v1/run-tests:", error);
    res.status(500).json({
      error: {
        message: "Failed to run tests",
        type: "invalid_request_error"
      }
    });
  }
});

/**
 * 8️⃣ Endpoint для запуска линтера
 */
app.post("/v1/lint-code", async (req, res) => {
  try {
    const { filePath } = req.body;
    
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
      type: 'run_linter',
      payload: { filePath }
    });
    
    if (!safetyCheck.safe) {
      console.warn(`🚨 Safety violation in lint run:`, safetyCheck.violations);
      return res.status(400).json({
        error: {
          message: `Safety check failed: ${safetyCheck.violations.join(', ')}`,
          type: "invalid_request_error"
        }
      });
    }
    
    // Запускаем линтер для файла
    const lintResults = await CodeTesterLinter.runLintForFile(filePath);
    
    res.json(lintResults);
  } catch (error) {
    console.error("❌ Error in /v1/lint-code:", error);
    res.status(500).json({
      error: {
        message: "Failed to lint code",
        type: "invalid_request_error"
      }
    });
  }
});

/**
 * 9️⃣ Интерактивный ассистент кода - основной эндпоинт
 */
app.post("/v1/code-assist", async (req, res) => {
  console.log(`🚀 Code assist requested: ${req.ip}`);
  
  // Проверяем, не превышен ли бюджет
  if (usageTracker.shouldDisableProxy()) {
    const normalizedError = {
      error: {
        message: "Usage budget exceeded. Proxy temporarily disabled.",
        type: "invalid_request_error"
      }
    };
    
    console.log(`🛑 Budget exceeded, request denied`);
    res.status(429).json(normalizedError);
    return;
  }
  
  const { file, selection, projectSnapshot, testResults, lintResults, changeDiff, userIntent } = req.body;
  
  if (!file) {
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
    formalSafetyModel.addConstraint({
      type: 'range',
      variable: 'fileChangeSize',
      min: 0,
      max: 10000, // Ограничение на размер изменений файла в байтах
      weight: 1.0
    });
  }
  
  const safetyCheck = formalSafetyModel.validateOperation({
    type: 'code_assist',
    payload: { file, selection }
  });
  
  if (!safetyCheck.safe) {
    console.warn(`🚨 Safety violation in code assist:`, safetyCheck.violations);
    return res.status(400).json({
      error: {
        message: `Safety check failed: ${safetyCheck.violations.join(', ')}`,
        type: "invalid_request_error"
      }
    });
  }
  
  // Подготовим сообщения для модели с полным контекстом
  const systemContext = [];
  
  // Добавляем основной контекст проекта
  const projectContext = await ProjectContextAnalyzer.getFullProjectContext(file);
  systemContext.push({
    role: "system",
    content: `Контекст проекта:\n` +
             `- Рабочая директория: ${projectContext.projectRoot}\n` +
             `- Тип проекта: ${projectContext.metadata.projectType}\n` +
             `- Языки программирования: ${projectContext.metadata.languages.join(', ')}\n` +
             `- Фреймворки: ${projectContext.metadata.detectedFrameworks.join(', ')}\n` +
             `- Всего файлов в проекте: ${projectContext.structure.totalFiles}\n` +
             `- Git репозиторий: ${projectContext.gitChanges.hasGit ? 'Да' : 'Нет'}`
  });
  
  // Добавляем результаты тестов, если есть
  if (testResults) {
    const analyzedTestResults = CodeAnalysis.analyzeTestResults(testResults.results || testResults);
    systemContext.push({
      role: "system",
      content: `Результаты анализа тестов:\n${analyzedTestResults.summary}\n` +
               `Проблемы: ${analyzedTestResults.issues.length > 0 ? analyzedTestResults.issues.map(i => i.message).join('; ') : 'нет проблем'}`
    });
  }
  
  // Добавляем результаты линтинга, если есть
  if (lintResults) {
    const analyzedLintResults = CodeAnalysis.analyzeLintResults(lintResults.results || lintResults);
    systemContext.push({
      role: "system",
      content: `Результаты аналализа линтера:\n${analyzedLintResults.summary}\n` +
               `Замечания: ${analyzedLintResults.issues.length > 0 ? analyzedLintResults.issues.map(i => i.message).join('; ') : 'нет замечаний'}`
    });
  }
  
  // Добавляем информацию об изменениях, если есть
  if (changeDiff) {
    systemContext.push({
      role: "system",
      content: `Последние изменения пользователя:\n${changeDiff}`
    });
  }
  
  // Добавляем контекст файла
  const fileContext = [];
  if (selection) {
    fileContext.push({
      role: "user",
      content: `Выделенный фрагмент кода:\n\`\`\`${path.extname(file).substring(1)}\n${selection}\n\`\`\``
    });
  }
  
  // Основной запрос пользователя
  const userRequest = req.body.messages ? req.body.messages : [{ role: "user", content: "Проанализируйте этот код и предложите улучшения." }];
  
  // Формируем полный набор сообщений
  const messages = [
    ...systemContext,
    ...fileContext,
    ...userRequest
  ];
  
  // Определяем параметры запроса
  const tokens = estimatePromptTokens(messages);
  const taskType = detectTaskType(messages);
  
  // Определяем целевую модель с помощью интеллектуального выбора
  const selectedModel = selectModel(messages, taskType, tokens);
  console.log(`🎯 Selected model for code assist: ${selectedModel} (tokens: ~${tokens}, task: ${taskType})`);
  
  // Попробовать модели по цепочке fallback, начиная с выбранной
  const modelChain = [selectedModel, ...FALLBACK_MODELS.filter(m => m !== selectedModel)];
  
  let responseSent = false;
  const startTime = Date.now();
  
  for (const model of modelChain) {
    try {
      const body = {
        messages,
        model: model,  // Используем модель из цепочки
        stream: false  // Пока не поддерживаем стриминг в этом эндпоинте
      };
      
      // Уменьшаем max_tokens для снижения задержки
      if (!req.body.max_tokens || req.body.max_tokens > 1024) {
        body.max_tokens = Math.min(req.body.max_tokens || 1024, 1024);
      }

      console.log(`📡 Forwarding code assist request to ${model}...`);
      const response = await fetch(
        `${OPENROUTER_BASE}/chat/completions`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "http://localhost",
            "X-Title": "Xcode Proxy"
          },
          body: JSON.stringify(body)
        }
      );
      
      const duration = Date.now() - startTime;
      
      if (response.ok) {
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