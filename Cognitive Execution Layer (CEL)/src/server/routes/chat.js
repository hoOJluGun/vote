/**
 * Chat Routes - Handles LLM chat completions and code assistance
 * @module src/server/routes/chat
 */

import fetch from 'node-fetch';

/**
 * Create chat routes
 * @param {Object} app - Express app instance
 * @param {Object} deps - Dependencies
 * @param {Object} deps.usageTracker - Usage tracker instance
 * @param {Object} deps.costOptimizer - Cost optimizer instance
 * @param {Object} deps.formalSafetyModel - Safety model instance
 * @param {Object} deps.resourceGovernor - Resource governor instance
 * @param {Object} deps.config - Configuration object
 */
export function chatRoutes(app, deps) {
  const { usageTracker, costOptimizer, formalSafetyModel, resourceGovernor, config } = deps;
  const { OPENROUTER_API_KEY, OPENROUTER_BASE, ALL_FREE_MODELS, FALLBACK_MODELS, USAGE_BUDGET_LIMIT } = config;

  /**
   * Helper: Estimate prompt tokens
   */
  function estimatePromptTokens(messages) {
    const text = messages.map((msg) => msg.content).join(' ');
    return Math.ceil(text.length / 4);
  }

  /**
   * Helper: Detect task type
   */
  function detectTaskType(messages) {
    const lastMessage = messages[messages.length - 1];
    let content = '';
    if (lastMessage && lastMessage.content) {
      if (typeof lastMessage.content === 'string') {
        content = lastMessage.content;
      } else if (typeof lastMessage.content === 'object') {
        content = lastMessage.content.text || lastMessage.content.value || '';
      }
    }

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
   * Helper: Add project context
   */
  function addProjectContext(messages) {
    const lastMessage = messages[messages.length - 1];
    let content = '';

    if (lastMessage && lastMessage.content) {
      if (typeof lastMessage.content === 'string') {
        content = lastMessage.content;
      } else if (typeof lastMessage.content === 'object') {
        content = lastMessage.content.text || lastMessage.content.value || '';
      }
    }

    if (content && (content.includes('__XCODE_FILE_PATH__') || content.includes('__XCODE_SELECTION__'))) {
      const filePathMatch = content.match(/__XCODE_FILE_PATH__:\s*(.+?)\s*\n/);
      const selectionMatch = content.match(/__XCODE_SELECTION__:\s*\n([\s\S]*?)\n__XCODE_/);
      const fullTextMatch = content.match(/__XCODE_FULL_TEXT__:\s*\n([\s\S]*)/);

      if (filePathMatch || selectionMatch || fullTextMatch) {
        const projectContext = {
          role: 'system',
          content:
            `Контекст проекта:\n` +
            `- Рабочая директория: ${process.cwd()}\n` +
            `- Текущий файл: ${filePathMatch ? filePathMatch[1] : 'неизвестен'}\n` +
            `- Выделенный текст: ${selectionMatch ? selectionMatch[1] : 'не предоставлен'}\n` +
            `- Полный текст файла: ${fullTextMatch ? fullTextMatch[1].substring(0, 2000) + (fullTextMatch[1].length > 2000 ? '...(обрезано)' : '') : 'не предоставлен'}\n\n` +
            `При ответе на запрос пользователя, учитывайте этот контекст проекта.`,
        };

        return [projectContext, ...messages];
      }
    }

    return [
      {
        role: 'system',
        content:
          `Контекст проекта:\n` +
          `- Вы работаете с проектом в директории: ${process.cwd()}\n` +
          `- Ваша задача - помочь пользователю в разработке программного обеспечения\n` +
          `- При анализе или написании кода учитывайте, что вы работаете в контексте реального проекта\n\n` +
          `При ответе на запрос пользователя, учитывайте этот контекст проекта.`,
      },
      ...messages,
    ];
  }

  /**
   * Helper: Select model based on task
   */
  function selectModel(messages, taskType, tokens) {
    const remainingBudget = USAGE_BUDGET_LIMIT ? USAGE_BUDGET_LIMIT - usageTracker.currentTokensUsed : Infinity;
    const recommendation = costOptimizer.recommendModel(taskType, tokens, remainingBudget);

    if (recommendation) {
      console.log(`💡 Recommended model: ${recommendation.model} (score: ${recommendation.score.toFixed(3)})`);
      return recommendation.model;
    } else {
      console.log(`💰 Budget exceeded. Falling back to first available model.`);
      return ALL_FREE_MODELS[0];
    }
  }

  /**
   * Helper: Should fallback
   */
  function shouldFallback(status) {
    return status === 429 || status === 402 || status === 503;
  }

  /**
   * GET /v1/models - Get available models
   */
  app.get('/v1/models', async (req, res) => {
    try {
      console.log(`📋 Models requested from ${req.ip}`);
      res.json({
        object: 'list',
        data: FALLBACK_MODELS.map((id) => ({
          id,
          object: 'model',
          created: 0,
          owned_by: 'openrouter',
        })),
      });
    } catch (error) {
      console.error('❌ Error in /v1/models:', error);

      await usageTracker.logRequest({
        model: 'unknown',
        tokensIn: 0,
        tokensOut: 0,
        estimatedCost: 0,
        duration: 0,
        status: 500,
      });

      res.status(500).json({
        error: {
          message: 'Failed to fetch models',
          type: 'invalid_request_error',
        },
      });
    }
  });

  /**
   * POST /v1/chat/completions - Main chat completion endpoint
   */
  app.post('/v1/chat/completions', async (req, res) => {
    console.log(`🚀 Chat completion requested: ${req.ip}`);

    // Budget check
    if (usageTracker.shouldDisableProxy()) {
      console.log(`🛑 Budget exceeded, request denied`);
      return res.status(429).json({
        error: {
          message: 'Usage budget exceeded. Proxy temporarily disabled.',
          type: 'invalid_request_error',
        },
      });
    }

    // Safety check
    const safetyCheck = formalSafetyModel.validateOperation({
      type: 'llm_request',
      payload: req.body,
    });

    if (!safetyCheck.safe) {
      console.warn(`🚨 Safety violation in LLM request:`, safetyCheck.violations);
      return res.status(400).json({
        error: {
          message: `Safety check failed: ${safetyCheck.violations.join(', ')}`,
          type: 'invalid_request_error',
        },
      });
    }

    // Resource check
    const resourceCheck = resourceGovernor.checkResourceLimits({
      type: 'llm_request',
      tokens: estimatePromptTokens(req.body.messages || []),
    });

    if (!resourceCheck.allowed) {
      console.warn(`📉 Resource limit exceeded:`, resourceCheck.reason);
      return res.status(429).json({
        error: {
          message: `Resource limit exceeded: ${resourceCheck.reason}`,
          type: 'invalid_request_error',
        },
      });
    }

    const isStreaming = req.body.stream === true;

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

    const messagesWithContext = addProjectContext(req.body.messages);
    const tokens = estimatePromptTokens(messagesWithContext);
    const taskType = detectTaskType(messagesWithContext);
    const selectedModel = selectModel(messagesWithContext, taskType, tokens);

    console.log(`🎯 Selected model: ${selectedModel} (tokens: ~${tokens}, task: ${taskType})`);

    const modelChain = [selectedModel, ...FALLBACK_MODELS.filter((m) => m !== selectedModel)];

    for (const model of modelChain) {
      try {
        const body = {
          ...req.body,
          messages: messagesWithContext,
          model: model,
        };

        if (!body.max_tokens || body.max_tokens > 1024) {
          body.max_tokens = Math.min(body.max_tokens || 1024, 1024);
        }

        console.log(`📡 Forwarding request to ${model}...`);
        const response = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'http://localhost',
            'X-Title': 'Xcode Proxy',
          },
          body: JSON.stringify(body),
        });

        const duration = Date.now() - startTime;

        if (response.ok) {
          costOptimizer.updateModelPerformance(model, duration, true, 0);

          if (isStreaming) {
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
              const responseBuffer = await response.buffer();
              res.write(responseBuffer);
            }
            res.end();
            responseSent = true;

            await usageTracker.logRequest({
              model: model,
              tokensIn: tokens,
              tokensOut: 0,
              estimatedCost: 0,
              duration: duration,
              status: response.status,
              taskType: taskType,
              userAgent: req.get('User-Agent') || 'unknown',
              ip: req.ip,
            });

            console.log(`✅ Streaming response sent via ${model} (${duration}ms)`);
            break;
          } else {
            const data = await response.text();
            res.status(response.status).send(data);
            responseSent = true;

            let tokensIn = tokens;
            let tokensOut = 0;
            let estimatedCost = 0;

            try {
              const jsonData = JSON.parse(data);
              if (jsonData.usage) {
                tokensIn = jsonData.usage.prompt_tokens || tokensIn;
                tokensOut = jsonData.usage.completion_tokens || 0;
                const costCalculation = costOptimizer.calculateCost(model, tokensIn, tokensOut);
                estimatedCost = costCalculation.cost;
              }
            } catch (e) {
              // JSON parse error, use estimates
            }

            await usageTracker.logRequest({
              model: model,
              tokensIn,
              tokensOut,
              estimatedCost,
              duration: duration,
              status: response.status,
              taskType: taskType,
              userAgent: req.get('User-Agent') || 'unknown',
              ip: req.ip,
            });

            console.log(`✅ Response sent via ${model} (${duration}ms)`);
            break;
          }
        } else if (shouldFallback(response.status)) {
          costOptimizer.updateModelPerformance(model, duration, false, 0);
          costOptimizer.updateFallbackStats(true);

          console.warn(`⚠️ Model ${model} returned status ${response.status}, trying next`);
          const errorData = await response.text();
          console.warn(`Error from ${model}:`, errorData);

          await usageTracker.logRequest({
            model: model,
            tokensIn: tokens,
            tokensOut: 0,
            estimatedCost: 0,
            duration: duration,
            status: response.status,
            taskType: taskType,
            userAgent: req.get('User-Agent') || 'unknown',
            ip: req.ip,
          });

          continue;
        } else {
          costOptimizer.updateModelPerformance(model, duration, false, 0);

          const errorData = await response.text();
          const normalizedError = {
            error: {
              message: `Upstream error: ${response.statusText} (${response.status}): ${errorData}`,
              type: 'invalid_request_error',
              code: response.status,
            },
          };

          res.status(response.status).json(normalizedError);
          responseSent = true;

          await usageTracker.logRequest({
            model: model,
            tokensIn: tokens,
            tokensOut: 0,
            estimatedCost: 0,
            duration: duration,
            status: response.status,
            taskType: taskType,
            userAgent: req.get('User-Agent') || 'unknown',
            ip: req.ip,
          });

          console.log(`❌ Error response sent: ${response.status}`);
          break;
        }
      } catch (error) {
        const duration = Date.now() - startTime;
        costOptimizer.updateModelPerformance(model, duration, false, 0);
        costOptimizer.updateFallbackStats(false);

        console.error(`💥 Network error with model ${model}:`, error.message);

        await usageTracker.logRequest({
          model: model,
          tokensIn: tokens,
          tokensOut: 0,
          estimatedCost: 0,
          duration: duration,
          status: 500,
          taskType: taskType,
          userAgent: req.get('User-Agent') || 'unknown',
          ip: req.ip,
        });

        if (model === modelChain[modelChain.length - 1]) {
          res.status(500).json({
            error: {
              message: `Proxy connection error: ${error.message}`,
              type: 'invalid_request_error',
            },
          });
          responseSent = true;
          console.log(`💥 Final model failed, sending error to client`);
        }
      }

      if (responseSent) {
        break;
      }
    }

    if (!responseSent) {
      const duration = Date.now() - startTime;
      res.status(503).json({
        error: {
          message: 'All fallback models failed',
          type: 'invalid_request_error',
        },
      });

      await usageTracker.logRequest({
        model: 'all_failed',
        tokensIn: tokens,
        tokensOut: 0,
        estimatedCost: 0,
        duration: duration,
        status: 503,
        taskType: taskType,
        userAgent: req.get('User-Agent') || 'unknown',
        ip: req.ip,
      });

      console.log(`💀 All models failed, sent error to client`);
    }
  });

  /**
   * POST /v1/code-assist - Interactive code assistant
   */
  app.post('/v1/code-assist', async (req, res) => {
    console.log(`🚀 Code assist requested: ${req.ip}`);

    if (usageTracker.shouldDisableProxy()) {
      return res.status(429).json({
        error: {
          message: 'Usage budget exceeded. Proxy temporarily disabled.',
          type: 'invalid_request_error',
        },
      });
    }

    const { file, selection, projectSnapshot, testResults, lintResults, changeDiff, userIntent } = req.body;

    if (!file) {
      return res.status(400).json({
        error: {
          message: 'File path is required',
          type: 'invalid_request_error',
        },
      });
    }

    const safetyCheck = formalSafetyModel.validateOperation({
      type: 'code_assist',
      payload: { file, selection },
    });

    if (!safetyCheck.safe) {
      console.warn(`🚨 Safety violation in code assist:`, safetyCheck.violations);
      return res.status(400).json({
        error: {
          message: `Safety check failed: ${safetyCheck.violations.join(', ')}`,
          type: 'invalid_request_error',
        },
      });
    }

    // Build messages with context
    const systemContext = [];

    try {
      const { ProjectContextAnalyzer } = await import('../../engines/project-context-analyzer.js');
      const projectContext = await ProjectContextAnalyzer.getFullProjectContext(file);

      systemContext.push({
        role: 'system',
        content:
          `Контекст проекта:\n` +
          `- Рабочая директория: ${projectContext.projectRoot}\n` +
          `- Тип проекта: ${projectContext.metadata.projectType}\n` +
          `- Языки программирования: ${projectContext.metadata.languages.join(', ')}\n` +
          `- Фреймворки: ${projectContext.metadata.detectedFrameworks.join(', ')}\n` +
          `- Всего файлов в проекте: ${projectContext.structure.totalFiles}\n` +
          `- Git репозиторий: ${projectContext.gitChanges.hasGit ? 'Да' : 'Нет'}`,
      });
    } catch (error) {
      console.warn('Could not get project context:', error.message);
    }

    const fileContext = [];
    if (selection) {
      const path = await import('path');
      fileContext.push({
        role: 'user',
        content: `Выделенный фрагмент кода:\n\`\`\`${path.extname(file).substring(1)}\n${selection}\n\`\`\``,
      });
    }

    const userRequest = req.body.messages
      ? req.body.messages
      : [{ role: 'user', content: 'Проанализируйте этот код и предложите улучшения.' }];

    const messages = [...systemContext, ...fileContext, ...userRequest];
    const tokens = estimatePromptTokens(messages);
    const taskType = detectTaskType(messages);
    const selectedModel = selectModel(messages, taskType, tokens);

    console.log(`🎯 Selected model for code assist: ${selectedModel}`);

    // Forward to chat completions with context
    req.body.messages = messages;
    req.body.model = selectedModel;

    // Use the chat completions logic
    const mockRes = {
      setHeader: () => { },
      status: (code) => ({ json: (data) => res.status(code).json(data), send: (data) => res.status(code).send(data) }),
      write: () => { },
      end: () => { },
    };

    // Simplified response for code assist
    try {
      const body = {
        messages,
        model: selectedModel,
        stream: false,
        max_tokens: 1024,
      };

      const response = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'http://localhost',
          'X-Title': 'Xcode Proxy',
        },
        body: JSON.stringify(body),
      });

      const data = await response.text();
      res.status(response.status).send(data);

      await usageTracker.logRequest({
        model: selectedModel,
        tokensIn: tokens,
        tokensOut: 0,
        estimatedCost: 0,
        duration: 0,
        status: response.status,
        taskType: taskType,
        userAgent: req.get('User-Agent') || 'unknown',
        ip: req.ip,
      });
    } catch (error) {
      console.error(`💥 Code assist error:`, error.message);
      res.status(500).json({
        error: {
          message: `Code assist error: ${error.message}`,
          type: 'invalid_request_error',
        },
      });
    }
  });
}
