/**
 * OpenRouter Adapter - Cloud LLM provider via OpenRouter API
 * Implements LLMProvider interface for OpenRouter
 */

import { LLMProvider, CompletionRequest, CompletionResponse, StreamChunk, HealthStatus, ModelInfo, CostEstimate, Message } from './LLMProvider.js';
import { BaseProvider } from './base-provider.js';

export class OpenRouterAdapter extends BaseProvider implements LLMProvider {
  readonly name = 'openrouter';
  readonly type = 'cloud' as const;
  readonly supportsStreaming = true;
  readonly maxTokens = 128000;
  readonly defaultModel = 'openai/gpt-4o-mini';

  private apiKey: string;
  private baseUrl: string;

  constructor(config: { apiKey: string; baseUrl?: string; defaultModel?: string }) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://openrouter.ai/api/v1';
    if (config.defaultModel) {
      this.currentModel = config.defaultModel;
    }

    if (!this.apiKey) {
      throw new Error('OpenRouter API key is required');
    }

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
  }

  async complete(request: CompletionRequest): Promise<CompletionResponse> {
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
          (error as any).status = res.status;
          (error as any).response = await res.text();
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
    } catch (error: any) {
      const latency = Date.now() - startTime;

      this.updateMetrics({
        success: false,
        error: error.message,
        latency,
      });

      throw error;
    }
  }

  async *completeStream(request: CompletionRequest): AsyncGenerator<StreamChunk> {
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
      (error as any).status = response.status;
      throw error;
    }

    const reader = response.body!.getReader();
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

  async healthCheck(): Promise<HealthStatus> {
    const start = Date.now();
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });

      const latency = Date.now() - start;

      if (response.ok) {
        const data = await response.json();
        return {
          healthy: true,
          latency,
          modelsAvailable: Array.isArray(data?.data) ? data.data.length : undefined,
          lastChecked: Date.now(),
        };
      } else {
        return {
          healthy: false,
          latency,
          error: `HTTP ${response.status}`,
          lastChecked: Date.now(),
        };
      }
    } catch (error: any) {
      return {
        healthy: false,
        latency: Date.now() - start,
        error: error.message,
        lastChecked: Date.now(),
      };
    }
  }

  async listModels(): Promise<ModelInfo[]> {
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to list models: ${response.status}`);
      }

      const data = await response.json();
      const models = Array.isArray(data?.data) ? data.data : [];

      return models.map((model: any) => ({
        id: model.id,
        name: model.name || model.id,
        contextLength: model.context_length,
        pricing: this.pricing[model.id],
        capabilities: model.capabilities || [],
      }));
    } catch (error: any) {
      throw new Error(`Failed to list models: ${error.message}`);
    }
  }

  estimateCost(request: CompletionRequest): CostEstimate {
    const inputTokens = this.estimateMessagesTokens(request.messages);
    const outputTokens = request.maxTokens || 1024;
    const model = request.model || this.currentModel;
    const pricing = this.pricing[model];

    if (!pricing) {
      return { inputTokens, outputTokens, estimatedCost: 0, currency: 'USD' };
    }

    const inputCost = (inputTokens / 1_000_000) * pricing.input;
    const outputCost = (outputTokens / 1_000_000) * pricing.output;

    return {
      inputTokens,
      outputTokens,
      estimatedCost: inputCost + outputCost,
      currency: 'USD',
      breakdown: { input: inputCost, output: outputCost },
    };
  }

  getCurrentModel(): string {
    return this.currentModel;
  }

  setModel(model: string): void {
    this.currentModel = model;
  }

  private calculateCost(model: string, usage?: { prompt_tokens?: number; completion_tokens?: number }): number {
    if (!usage) return 0;
    const pricing = this.pricing[model];
    if (!pricing) return 0;

    const inputCost = (usage.prompt_tokens || 0 / 1_000_000) * pricing.input;
    const outputCost = (usage.completion_tokens || 0 / 1_000_000) * pricing.output;

    return inputCost + outputCost;
  }
}
