/**
 * TextGenerationWebUI Adapter - Self-hosted LLM provider via Text Generation WebUI
 * Implements LLMProvider interface for Text Generation WebUI
 */

import { LLMProvider, CompletionRequest, CompletionResponse, StreamChunk, HealthStatus, ModelInfo, CostEstimate, Message } from './LLMProvider.js';
import axios from 'axios';
import * as https from 'node:https';
import * as http from 'node:http';

export class TextGenerationWebUIAdapter implements LLMProvider {
  readonly name = 'tgwebui';
  readonly type = 'local' as const;
  readonly supportsStreaming = true;
  readonly maxTokens = 32768;
  readonly defaultModel = 'default';

  private baseUrl: string;
  private http: any;
  private currentModel: string;

  constructor(config: { baseUrl: string; defaultModel?: string }) {
    if (!config.baseUrl) {
      throw new Error('tgwebui baseUrl is required');
    }

    this.baseUrl = config.baseUrl;
    this.currentModel = config.defaultModel || this.defaultModel;

    // Initialize HTTP client with keep-alive
    const isHttps = this.baseUrl.startsWith('https://');
    const agent = isHttps ? 
      new https.Agent({ keepAlive: true }) : 
      new http.Agent({ keepAlive: true });

    this.http = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
      httpAgent: agent,
      httpsAgent: agent,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    const model = request.model || this.currentModel;

    const body = {
      model,
      messages: request.messages,
      max_tokens: request.maxTokens || 1024,
      temperature: request.temperature ?? 0.7,
      top_p: request.topP ?? 0.9,
      stream: false,
    };

    const start = Date.now();
    const res = await this.http.post('/v1/chat/completions', body);
    const latency = Date.now() - start;

    return {
      ...res.data,
      latency,
      provider: this.name,
    };
  }

  async *completeStream(request: CompletionRequest): AsyncGenerator<StreamChunk> {
    const model = request.model || this.currentModel;

    const body = {
      model,
      messages: request.messages,
      max_tokens: request.maxTokens || 1024,
      temperature: request.temperature ?? 0.7,
      top_p: request.topP ?? 0.9,
      stream: true,
    };

    const res = await this.http.post('/v1/chat/completions', body, {
      responseType: 'stream',
      headers: { Accept: 'text/event-stream' },
    });

    const stream = res.data;
    let buffer = '';

    for await (const chunk of stream) {
      buffer += chunk.toString('utf8');
      const parts = buffer.split('\n');
      buffer = parts.pop() || '';

      for (const line of parts) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const data = trimmed.slice(5).trim();
        if (!data) continue;
        if (data === '[DONE]') return;

        try {
          yield JSON.parse(data);
        } catch {
          // Skip invalid JSON
        }
      }
    }
  }

  async healthCheck(): Promise<HealthStatus> {
    const start = Date.now();
    try {
      const res = await this.http.get('/v1/models', { validateStatus: () => true });
      const latency = Date.now() - start;

      if (res.status >= 200 && res.status < 300) {
        return {
          healthy: true,
          latency,
          modelsAvailable: Array.isArray(res.data?.data) ? res.data.data.length : undefined,
          lastChecked: Date.now(),
        };
      } else {
        return {
          healthy: false,
          latency,
          error: `HTTP ${res.status}`,
          lastChecked: Date.now(),
        };
      }
    } catch (e: any) {
      return {
        healthy: false,
        latency: Date.now() - start,
        error: e.message,
        lastChecked: Date.now(),
      };
    }
  }

  async listModels(): Promise<ModelInfo[]> {
    const res = await this.http.get('/v1/models');
    const data = res.data;
    const models = Array.isArray(data?.data) ? data.data : [];

    return models.map((m: any) => ({ id: m.id || m.name, name: m.id || m.name }));
  }

  estimateCost(request: CompletionRequest): CostEstimate {
    const inputTokens = this.estimateMessagesTokens(request.messages);
    const outputTokens = request.maxTokens || 1024;
    return { inputTokens, outputTokens, estimatedCost: 0, currency: 'USD', breakdown: { input: 0, output: 0 } };
  }

  estimateTokens(text: string): number {
    if (!text) return 0;
    return Math.ceil(text.length / 4);
  }

  estimateMessagesTokens(messages: Message[]): number {
    if (!messages || !Array.isArray(messages)) return 0;
    let total = 0;
    for (const message of messages) {
      total += 4; // role, content markers
      total += this.estimateTokens(message.content || '');
      total += this.estimateTokens(message.role || '');
    }
    return total;
  }

  getCurrentModel(): string {
    return this.currentModel;
  }

  setModel(model: string): void {
    this.currentModel = model;
  }
}
