import http from 'http';
import https from 'https';
import axios from 'axios';

export class TextGenerationWebUIAdapter {
  constructor(config = {}) {
    this.name = 'tgwebui';
    this.type = 'local';
    this.supportsStreaming = true;
    this.maxTokens = 32768;
    this.defaultModel = 'default';

    this.baseUrl = config.baseUrl;
    if (!this.baseUrl) {
      throw new Error('tgwebui baseUrl is required');
    }

    this.currentModel = config.defaultModel || this.defaultModel;

    const isHttps = this.baseUrl.startsWith('https://');
    const agent = isHttps ? new https.Agent({ keepAlive: true }) : new http.Agent({ keepAlive: true });

    this.http = axios.create({
      baseURL: this.baseUrl,
      timeout: config.timeout || 30000,
      httpAgent: agent,
      httpsAgent: agent,
      headers: {
        'Content-Type': 'application/json',
        ...(config.headers || {}),
      },
    });
  }

  getCurrentModel() {
    return this.currentModel;
  }

  setModel(model) {
    this.currentModel = model;
  }

  async healthCheck() {
    const start = Date.now();
    try {
      const res = await this.http.get('/v1/models', { validateStatus: () => true });
      const latency = Date.now() - start;
      if (res.status >= 200 && res.status < 300) {
        return { healthy: true, latency, modelsAvailable: Array.isArray(res.data?.data) ? res.data.data.length : undefined, lastChecked: Date.now() };
      }
      return { healthy: false, latency, error: `HTTP ${res.status}`, lastChecked: Date.now() };
    } catch (e) {
      return { healthy: false, latency: Date.now() - start, error: e.message, lastChecked: Date.now() };
    }
  }

  async listModels() {
    const res = await this.http.get('/v1/models');
    const data = res.data;
    const models = Array.isArray(data?.data) ? data.data : [];
    return models.map((m) => ({ id: m.id || m.name, name: m.id || m.name }));
  }

  estimateCost(request) {
    const inputTokens = this.estimateMessagesTokens(request.messages);
    const outputTokens = request.maxTokens || 1024;
    return { inputTokens, outputTokens, estimatedCost: 0, currency: 'USD', breakdown: { input: 0, output: 0 } };
  }

  estimateTokens(text) {
    if (!text) return 0;
    return Math.ceil(text.length / 4);
  }

  estimateMessagesTokens(messages) {
    if (!messages || !Array.isArray(messages)) return 0;
    let total = 0;
    for (const m of messages) {
      total += 4;
      total += this.estimateTokens(m.role || '');
      total += this.estimateTokens(m.content || '');
    }
    return total;
  }

  async complete(request) {
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
    return {
      ...res.data,
      latency: Date.now() - start,
      provider: this.name,
    };
  }

  async *completeStream(request) {
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
        }
      }
    }
  }
}

export default TextGenerationWebUIAdapter;
