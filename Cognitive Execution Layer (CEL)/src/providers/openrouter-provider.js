/**
 * OpenRouter Provider - Cloud LLM provider via OpenRouter API
 * @module src/providers/openrouter-provider
 */

import { BaseProvider } from './base-provider.js';

/**
 * OpenRouter provider implementation
 * Supports multiple LLM models through OpenRouter API
 */
export class OpenRouterProvider extends BaseProvider {
  constructor(config) {
    super(config);

    this.name = 'openrouter';
    this.type = 'cloud';
    this.supportsStreaming = true;
    this.maxTokens = 128000;
    this.defaultModel = 'openai/gpt-4o-mini';

    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://openrouter.ai/api/v1';
    this.currentModel = config.defaultModel || this.defaultModel;

    // Free models list (updated 2026)
    this.freeModels = [
      'openai/gpt-4o-mini',
      'google/gemini-2.0-flash-exp:free',
      'meta-llama/llama-3.3-70b-instruct:free',
      'qwen/qwen-2.5-7b-instruct',
      'deepseek/deepseek-r1-0528:free',
    ];

    // Model pricing per 1M tokens
    this.pricing = {
      'openai/gpt-4o-mini': { input: 0.15, output: 0.60 },
      'openai/gpt-4o': { input: 2.50, output: 10.00 },
      'anthropic/claude-3.5-sonnet': { input: 3.00, output: 15.00 },
      'google/gemini-2.0-flash-exp:free': { input: 0, output: 0 },
      'meta-llama/llama-3.3-70b-instruct:free': { input: 0, output: 0 },
      'qwen/qwen-2.5-7b-instruct': { input: 0, output: 0 },
      'deepseek/deepseek-r1-0528:free': { input: 0, output: 0 },
    };

    if (!this.apiKey) {
      throw new Error('OpenRouter API key is required');
    }
  }

  /**
   * Execute a completion request
   * @param {Object} request - Completion request
   * @returns {Promise<Object>} Completion response
   */
  async complete(request) {
    this.validateRequest(request);

    const startTime = Date.now();
    const model = request.model || this.currentModel;

    const body = {
      model,
      messages: this.formatMessages(request.messages),
      max_tokens: request.maxTokens || 1024,
      temperature: request.temperature ?? 0.7,
      stream: false,
    };

    if (request.stop) {
      body.stop = request.stop;
    }

    try {
      const response = await this.retryWithBackoff(async () => {
        const res = await fetch(`${this.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'http://localhost:3000',
            'X-Title': 'CEL-Proxy',
          },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const error = new Error(`OpenRouter error: ${res.status}`);
          error.status = res.status;
          error.response = await res.text();
          throw error;
        }

        return res;
      });

      const data = await response.json();
      const latency = Date.now() - startTime;

      // Update metrics
      this.updateMetrics({
        success: true,
        tokens: data.usage?.total_tokens || 0,
        cost: this.calculateCost(model, data.usage),
        latency,
      });

      return {
        id: data.id || this.generateRequestId(),
        object: 'chat.completion',
        created: data.created || Math.floor(Date.now() / 1000),
        model: data.model || model,
        choices: data.choices,
        usage: data.usage,
        latency,
        provider: this.name,
      };
    } catch (error) {
      const latency = Date.now() - startTime;

      this.updateMetrics({
        success: false,
        error: error.message,
        latency,
      });

      throw error;
    }
  }

  /**
   * Execute a streaming completion request
   * @param {Object} request - Completion request
   * @yields {Object} Stream chunks
   */
  async *completeStream(request) {
    this.validateRequest(request);

    const model = request.model || this.currentModel;

    const body = {
      model,
      messages: this.formatMessages(request.messages),
      max_tokens: request.maxTokens || 1024,
      temperature: request.temperature ?? 0.7,
      stream: true,
    };

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'CEL-Proxy',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = new Error(`OpenRouter streaming error: ${response.status}`);
      error.status = response.status;
      throw error;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);

          if (data === '[DONE]') {
            return;
          }

          try {
            const chunk = JSON.parse(data);
            yield {
              id: chunk.id,
              object: 'chat.completion.chunk',
              created: chunk.created,
              model: chunk.model || model,
              choices: chunk.choices,
            };
          } catch {
            // Skip invalid JSON
          }
        }
      }
    }
  }

  /**
   * Check provider health
   * @returns {Promise<Object>} Health status
   */
  async healthCheck() {
    const startTime = Date.now();

    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });

      const latency = Date.now() - startTime;

      if (response.ok) {
        const data = await response.json();
        return {
          healthy: true,
          latency,
          modelsAvailable: data.data?.length || 0,
          lastChecked: Date.now(),
        };
      }

      return {
        healthy: false,
        latency,
        error: `HTTP ${response.status}`,
        lastChecked: Date.now(),
      };
    } catch (error) {
      return {
        healthy: false,
        latency: Date.now() - startTime,
        error: error.message,
        lastChecked: Date.now(),
      };
    }
  }

  /**
   * List available models
   * @returns {Promise<Array>} Model list
   */
  async listModels() {
    const response = await fetch(`${this.baseUrl}/models`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to list models: ${response.status}`);
    }

    const data = await response.json();

    return data.data.map(model => ({
      id: model.id,
      name: model.id,
      contextLength: model.context_length,
      pricing: model.pricing,
      capabilities: this.getModelCapabilities(model.id),
    }));
  }

  /**
   * Estimate cost for a request
   * @param {Object} request - Request to estimate
   * @returns {Object} Cost estimate
   */
  estimateCost(request) {
    const model = request.model || this.currentModel;
    const inputTokens = this.estimateMessagesTokens(request.messages);
    const outputTokens = request.maxTokens || 1024;

    const pricing = this.pricing[model] || { input: 0, output: 0 };

    const inputCost = (inputTokens / 1000000) * pricing.input;
    const outputCost = (outputTokens / 1000000) * pricing.output;

    return {
      inputTokens,
      outputTokens,
      estimatedCost: inputCost + outputCost,
      currency: 'USD',
      breakdown: {
        input: inputCost,
        output: outputCost,
      },
    };
  }

  /**
   * Calculate actual cost from usage
   * @param {string} model - Model name
   * @param {Object} usage - Token usage
   * @returns {number} Cost in USD
   */
  calculateCost(model, usage) {
    if (!usage) return 0;

    const pricing = this.pricing[model] || { input: 0, output: 0 };

    const inputCost = (usage.prompt_tokens / 1000000) * pricing.input;
    const outputCost = (usage.completion_tokens / 1000000) * pricing.output;

    return inputCost + outputCost;
  }

  /**
   * Get model capabilities
   * @param {string} modelId - Model ID
   * @returns {Array} Capabilities
   */
  getModelCapabilities(modelId) {
    const capabilities = [];

    if (modelId.includes('vision') || modelId.includes('gemini')) {
      capabilities.push('vision');
    }

    if (modelId.includes('code') || modelId.includes('coder')) {
      capabilities.push('code');
    }

    if (modelId.includes('128k') || modelId.includes('200k')) {
      capabilities.push('long-context');
    }

    return capabilities;
  }

  /**
   * Check if model is free
   * @param {string} model - Model name
   * @returns {boolean} True if free
   */
  isFreeModel(model) {
    return this.freeModels.some(m => model.includes(m.replace(':free', '')));
  }

  /**
   * Get recommended model for task
   * @param {string} taskType - Task type
   * @param {number} tokens - Estimated tokens
   * @returns {string} Recommended model
   */
  getRecommendedModel(taskType, tokens = 0) {
    const recommendations = {
      'code': 'openai/gpt-4o-mini',
      'refactoring': 'openai/gpt-4o-mini',
      'explanation': 'meta-llama/llama-3.3-70b-instruct:free',
      'generation': 'qwen/qwen-2.5-7b-instruct',
      'analysis': 'deepseek/deepseek-r1-0528:free',
      'general': 'google/gemini-2.0-flash-exp:free',
    };

    return recommendations[taskType] || recommendations.general;
  }
}

export default OpenRouterProvider;
