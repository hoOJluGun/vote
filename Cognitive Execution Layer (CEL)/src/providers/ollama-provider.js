/**
 * Ollama Provider - Local LLM provider via Ollama
 * @module src/providers/ollama-provider
 */

import { BaseProvider } from './base-provider.js';

/**
 * Ollama provider implementation
 * Supports local LLM models through Ollama
 */
export class OllamaProvider extends BaseProvider {
  constructor(config = {}) {
    super(config);

    this.name = 'ollama';
    this.type = 'local';
    this.supportsStreaming = true;
    this.maxTokens = 32768;
    this.defaultModel = 'llama3.2';

    this.baseUrl = config.baseUrl || 'http://localhost:11434';
    this.currentModel = config.defaultModel || this.defaultModel;

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
          error.status = res.status;
          error.response = await res.text();
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

  /**
   * Check provider health
   * @returns {Promise<Object>} Health status
   */
  async healthCheck() {
    const startTime = Date.now();

    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      const latency = Date.now() - startTime;

      if (response.ok) {
        const data = await response.json();
        return {
          healthy: true,
          latency,
          modelsAvailable: data.models?.length || 0,
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
    const response = await fetch(`${this.baseUrl}/api/tags`);

    if (!response.ok) {
      throw new Error(`Failed to list models: ${response.status}`);
    }

    const data = await response.json();

    return data.models.map(model => ({
      id: model.name,
      name: model.name,
      contextLength: this.getContextLength(model.name),
      size: model.size,
      modified: model.modified_at,
      capabilities: this.getModelCapabilities(model.name),
    }));
  }

  /**
   * Estimate cost for a request (always 0 for local models)
   * @param {Object} request - Request to estimate
   * @returns {Object} Cost estimate
   */
  estimateCost(request) {
    const inputTokens = this.estimateMessagesTokens(request.messages);
    const outputTokens = request.maxTokens || 1024;

    return {
      inputTokens,
      outputTokens,
      estimatedCost: 0, // Local models are free!
      currency: 'USD',
      breakdown: {
        input: 0,
        output: 0,
      },
    };
  }

  /**
   * Get context length for model
   * @param {string} modelName - Model name
   * @returns {number} Context length
   */
  getContextLength(modelName) {
    const baseName = modelName.split(':')[0].toLowerCase();

    for (const [name, length] of Object.entries(this.modelContextLengths)) {
      if (baseName.includes(name)) {
        return length;
      }
    }

    return 4096; // Default
  }

  /**
   * Get model capabilities
   * @param {string} modelName - Model name
   * @returns {Array} Capabilities
   */
  getModelCapabilities(modelName) {
    const capabilities = [];
    const name = modelName.toLowerCase();

    if (name.includes('code') || name.includes('coder')) {
      capabilities.push('code');
    }

    if (name.includes('vision')) {
      capabilities.push('vision');
    }

    if (name.includes('embed')) {
      capabilities.push('embeddings');
    }

    return capabilities;
  }

  /**
   * Pull a model
   * @param {string} modelName - Model to pull
   * @returns {Promise<Object>} Pull result
   */
  async pullModel(modelName) {
    const response = await fetch(`${this.baseUrl}/api/pull`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: modelName }),
    });

    if (!response.ok) {
      throw new Error(`Failed to pull model: ${response.status}`);
    }

    return { success: true, model: modelName };
  }

  /**
   * Delete a model
   * @param {string} modelName - Model to delete
   * @returns {Promise<Object>} Delete result
   */
  async deleteModel(modelName) {
    const response = await fetch(`${this.baseUrl}/api/delete`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: modelName }),
    });

    if (!response.ok) {
      throw new Error(`Failed to delete model: ${response.status}`);
    }

    return { success: true, model: modelName };
  }

  /**
   * Get model info
   * @param {string} modelName - Model name
   * @returns {Promise<Object>} Model info
   */
  async getModelInfo(modelName) {
    const response = await fetch(`${this.baseUrl}/api/show`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: modelName }),
    });

    if (!response.ok) {
      throw new Error(`Failed to get model info: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Check if Ollama is running
   * @returns {Promise<boolean>} True if running
   */
  async isRunning() {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'HEAD',
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

export default OllamaProvider;
