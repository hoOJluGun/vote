/**
 * Ollama Adapter - Local LLM provider via Ollama
 * Implements LLMProvider interface for Ollama
 */

import { LLMProvider, CompletionRequest, CompletionResponse, StreamChunk, HealthStatus, ModelInfo, CostEstimate, Message } from './LLMProvider.js';
import { BaseProvider } from './base-provider.js';

export class OllamaAdapter extends BaseProvider implements LLMProvider {
  readonly name = 'ollama';
  readonly type = 'local' as const;
  readonly supportsStreaming = true;
  readonly maxTokens = 32768;
  readonly defaultModel = 'llama3.2';

  private baseUrl: string;

  constructor(config: { baseUrl?: string; defaultModel?: string }) {
    super();
    this.baseUrl = config.baseUrl || 'http://localhost:11434';
    if (config.defaultModel) {
      this.currentModel = config.defaultModel;
    }

    // Common models with their context lengths
    this.modelContextLengths = {
      'llama3.2': 128000,
      'llama3.1': 128000,
      'llama3': 8192,
      'mistral': 32768,
      'mixtral': 32768,
      'codellama': 16384,
      'deepseek-coder': 16384,
      'qwen2.5': 32768,
      'gemma2': 8192,
      'phi3': 128000,
    };
  }

  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    this.validateRequest(request);

    const startTime = Date.now();
    const model = request.model || this.currentModel;

    const body = {
      model,
      messages: this.formatMessages(request.messages),
      stream: false,
      options: {
        num_predict: request.maxTokens || 1024,
        temperature: request.temperature ?? 0.7,
        top_p: request.topP ?? 0.9,
      },
    };

    try {
      const response = await this.retryWithBackoff(async () => {
        const res = await fetch(`${this.baseUrl}/api/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const error = new Error(`Ollama error: ${res.status}`);
          (error as any).status = res.status;
          (error as any).response = await res.text();
          throw error;
        }

        return res;
      });

      const data = await response.json();
      const latency = Date.now() - startTime;

      // Ollama response format
      const usage = {
        prompt_tokens: data.prompt_eval_count || 0,
        completion_tokens: data.eval_count || 0,
        total_tokens: (data.prompt_eval_count || 0) + (data.eval_count || 0),
      };

      // Update metrics (local models are free!)
      this.updateMetrics({
        success: true,
        tokens: usage.total_tokens,
        cost: 0, // Local models are free
        latency,
      });

      return {
        id: this.generateRequestId(),
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: data.model || model,
        choices: [{
          index: 0,
          message: data.message,
          finish_reason: data.done ? 'stop' : null,
        }],
        usage,
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
      stream: true,
      options: {
        num_predict: request.maxTokens || 1024,
        temperature: request.temperature ?? 0.7,
      },
    };

    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = new Error(`Ollama streaming error: ${response.status}`);
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
        if (!line.trim()) continue;

        try {
          const data = JSON.parse(line);

          if (data.message?.content) {
            yield {
              id: this.generateRequestId(),
              object: 'chat.completion.chunk',
              created: Math.floor(Date.now() / 1000),
              model: data.model || model,
              choices: [{
                index: 0,
                delta: {
                  content: data.message.content,
                },
                finish_reason: data.done ? 'stop' : null,
              }],
            };
          }
        } catch {
          // Skip invalid JSON
        }
      }
    }
  }

  async healthCheck(): Promise<HealthStatus> {
    const start = Date.now();
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
      });

      const latency = Date.now() - start;
      if (response.ok) {
        const data = await response.json();
        return {
          healthy: true,
          latency,
          modelsAvailable: Array.isArray(data?.models) ? data.models.length : undefined,
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
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error(`Failed to list models: ${response.status}`);
      }

      const data = await response.json();
      const models = Array.isArray(data?.models) ? data.models : [];

      return models.map((model: any) => ({
        id: model.name,
        name: model.name,
        contextLength: this.modelContextLengths[model.name],
        capabilities: model.details?.capabilities || [],
      }));
    } catch (error: any) {
      throw new Error(`Failed to list models: ${error.message}`);
    }
  }

  estimateCost(request: CompletionRequest): CostEstimate {
    const inputTokens = this.estimateMessagesTokens(request.messages);
    const outputTokens = request.maxTokens || 1024;
    return { inputTokens, outputTokens, estimatedCost: 0, currency: 'USD', breakdown: { input: 0, output: 0 } };
  }

  getCurrentModel(): string {
    return this.currentModel;
  }

  setModel(model: string): void {
    this.currentModel = model;
  }
}
