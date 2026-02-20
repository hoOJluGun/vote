/**
 * Provider Factory Unit Tests
 * Comprehensive test suite for ProviderFactory with fallback, circuit breaker, and retry logic
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ProviderFactory, getProviderFactory, resetProviderFactory } from '../ProviderFactory.js';
import { LLMProvider, CompletionRequest, CompletionResponse, HealthStatus } from '../LLMProvider.js';

// Mock SecretsManager
vi.mock('../../../security/security-framework.js', () => ({
  SecretsManager: vi.fn().mockImplementation(() => ({
    initialize: vi.fn().mockResolvedValue(undefined),
    getApiKey: vi.fn().mockResolvedValue('test-api-key'),
  })),
}));

// Mock provider implementations
class MockProvider implements LLMProvider {
  readonly name: string;
  readonly type = 'cloud' as const;
  readonly supportsStreaming = true;
  readonly maxTokens = 4096;
  readonly defaultModel = 'test-model';

  private shouldFail = false;
  private shouldFailHealth = false;
  private latency = 10;

  constructor(name: string, options: { shouldFail?: boolean; shouldFailHealth?: boolean; latency?: number } = {}) {
    this.name = name;
    this.shouldFail = options.shouldFail || false;
    this.shouldFailHealth = options.shouldFailHealth || false;
    this.latency = options.latency || 10;
  }

  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    if (this.shouldFail) {
      throw new Error(`${this.name} failed`);
    }

    await vi.advanceTimersByTimeAsync(this.latency);

    return {
      id: `test-${this.name}`,
      object: 'chat.completion',
      created: Date.now(),
      model: request.model || this.defaultModel,
      choices: [{
        index: 0,
        message: { role: 'assistant', content: `Response from ${this.name}` },
        finish_reason: 'stop',
      }],
      usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
      latency: this.latency,
      provider: this.name,
    };
  }

  async *completeStream(request: CompletionRequest): AsyncGenerator<any> {
    if (this.shouldFail) {
      throw new Error(`${this.name} streaming failed`);
    }

    yield {
      id: `test-${this.name}`,
      object: 'chat.completion.chunk',
      created: Date.now(),
      model: request.model || this.defaultModel,
      choices: [{
        index: 0,
        delta: { content: `Chunk from ${this.name}` },
        finish_reason: null,
      }],
    };
  }

  async healthCheck(): Promise<HealthStatus> {
    if (this.shouldFailHealth) {
      return {
        healthy: false,
        latency: this.latency,
        error: `${this.name} unhealthy`,
        lastChecked: Date.now(),
      };
    }

    return {
      healthy: true,
      latency: this.latency,
      modelsAvailable: 5,
      lastChecked: Date.now(),
    };
  }

  async listModels() {
    return [
      { id: 'test-model', name: 'Test Model' },
    ];
  }

  estimateCost() {
    return {
      inputTokens: 10,
      outputTokens: 20,
      estimatedCost: 0.001,
      currency: 'USD',
    };
  }

  getCurrentModel() {
    return this.defaultModel;
  }

  setModel(model: string) {
    this.defaultModel = model;
  }

  // Helper methods for testing
  setShouldFail(shouldFail: boolean) {
    this.shouldFail = shouldFail;
  }

  setShouldFailHealth(shouldFailHealth: boolean) {
    this.shouldFailHealth = shouldFailHealth;
  }

  setLatency(latency: number) {
    this.latency = latency;
  }
}

describe('ProviderFactory', () => {
  let factory: ProviderFactory;
  let provider1: MockProvider;
  let provider2: MockProvider;
  let provider3: MockProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    factory = new ProviderFactory();
    provider1 = new MockProvider('provider1');
    provider2 = new MockProvider('provider2');
    provider3 = new MockProvider('provider3');
  });

  afterEach(() => {
    vi.useRealTimers();
    resetProviderFactory();
  });

  describe('Provider Creation', () => {
    it('should create OpenRouter provider', () => {
      const provider = factory.create('openrouter', { apiKey: 'test-key' });
      expect(provider.name).toBe('openrouter');
      expect(provider.type).toBe('cloud');
    });

    it('should create Ollama provider', () => {
      const provider = factory.create('ollama', { baseUrl: 'http://localhost:11434' });
      expect(provider.name).toBe('ollama');
      expect(provider.type).toBe('local');
    });

    it('should create TGWebUI provider', () => {
      const provider = factory.create('tgwebui', { baseUrl: 'http://localhost:5000' });
      expect(provider.name).toBe('tgwebui');
      expect(provider.type).toBe('local');
    });

    it('should throw error for unknown provider', () => {
      expect(() => factory.create('unknown')).toThrow('Unknown provider: unknown');
    });
  });

  describe('Fallback Chain', () => {
    beforeEach(async () => {
      // Manually add providers for testing
      (factory as any).providers.set('provider1', provider1);
      (factory as any).providers.set('provider2', provider2);
      (factory as any).providers.set('provider3', provider3);
      
      // Build fallback chain manually since we're not using initialize()
      (factory as any).fallbackChain = ['provider1', 'provider2', 'provider3'];
    });

    it('should build fallback chain in default order', () => {
      const chain = factory.getFallbackChain();
      expect(chain).toEqual(['provider1', 'provider2', 'provider3']);
    });

    it('should respect custom fallback order', () => {
      (factory as any).buildFallbackChain({
        fallbackOrder: ['provider3', 'provider1'],
      });
      const chain = factory.getFallbackChain();
      expect(chain).toEqual(['provider3', 'provider1']);
    });

    it('should filter out non-existent providers from custom order', () => {
      (factory as any).buildFallbackChain({
        fallbackOrder: ['provider3', 'nonexistent', 'provider1'],
      });
      const chain = factory.getFallbackChain();
      expect(chain).toEqual(['provider3', 'provider1']);
    });
  });

  describe('Execute with Fallback', () => {
    beforeEach(async () => {
      // Manually add providers for testing
      (factory as any).providers.set('provider1', provider1);
      (factory as any).providers.set('provider2', provider2);
      (factory as any).providers.set('provider3', provider3);
      
      // Build fallback chain manually since we're not using initialize()
      (factory as any).fallbackChain = ['provider1', 'provider2', 'provider3'];
    });

    it('should execute operation with first available provider', async () => {
      const result = await factory.executeWithFallback(async (provider) => {
        return provider.complete({ messages: [{ role: 'user', content: 'test' }] });
      });

      expect(result.provider).toBe('provider1');
      expect(result.choices[0].message.content).toBe('Response from provider1');
    });

    it('should fallback to next provider on failure', async () => {
      provider1.setShouldFail(true);

      const result = await factory.executeWithFallback(async (provider) => {
        return provider.complete({ messages: [{ role: 'user', content: 'test' }] });
      });

      expect(result.provider).toBe('provider2');
      expect(result.choices[0].message.content).toBe('Response from provider2');
    });

    it('should fallback through multiple providers', async () => {
      provider1.setShouldFail(true);
      provider2.setShouldFail(true);

      const result = await factory.executeWithFallback(async (provider) => {
        return provider.complete({ messages: [{ role: 'user', content: 'test' }] });
      });

      expect(result.provider).toBe('provider3');
      expect(result.choices[0].message.content).toBe('Response from provider3');
    });

    it('should throw error when all providers fail', async () => {
      provider1.setShouldFail(true);
      provider2.setShouldFail(true);
      provider3.setShouldFail(true);

      await expect(
        factory.executeWithFallback(async (provider) => {
          return provider.complete({ messages: [{ role: 'user', content: 'test' }] });
        })
      ).rejects.toThrow('All providers failed');
    });

    it('should use preferred provider when specified', async () => {
      const result = await factory.executeWithFallback(
        async (provider) => {
          return provider.complete({ messages: [{ role: 'user', content: 'test' }] });
        },
        'provider2'
      );

      expect(result.provider).toBe('provider2');
    });

    it('should skip unhealthy providers', async () => {
      provider2.setShouldFailHealth(true);

      const result = await factory.executeWithFallback(async (provider) => {
        return provider.complete({ messages: [{ role: 'user', content: 'test' }] });
      });

      expect(result.provider).toBe('provider1');
    });
  });

  describe('Circuit Breaker', () => {
    beforeEach(async () => {
      // Manually add providers for testing
      (factory as any).providers.set('provider1', provider1);
      
      // Build fallback chain manually since we're not using initialize()
      (factory as any).fallbackChain = ['provider1'];
    });

    it('should open circuit after 5 failures', async () => {
      // Fail 5 times to open circuit
      for (let i = 0; i < 5; i++) {
        provider1.setShouldFail(true);
        try {
          await factory.executeWithFallback(async (provider) => {
            return provider.complete({ messages: [{ role: 'user', content: 'test' }] });
          });
        } catch {
          // Expected to fail
        }
      }

      // 6th attempt should be skipped due to open circuit
      provider1.setShouldFail(false);
      await expect(
        factory.executeWithFallback(async (provider) => {
          return provider.complete({ messages: [{ role: 'user', content: 'test' }] });
        })
      ).rejects.toThrow('All providers failed');
    });

    it('should close circuit on success', async () => {
      // Open circuit first
      for (let i = 0; i < 5; i++) {
        provider1.setShouldFail(true);
        try {
          await factory.executeWithFallback(async (provider) => {
            return provider.complete({ messages: [{ role: 'user', content: 'test' }] });
          });
        } catch {
          // Expected to fail
        }
      }

      // Wait for circuit to close (mock time)
      vi.advanceTimersByTime(31000);

      // Successful request should close circuit
      provider1.setShouldFail(false);
      const result = await factory.executeWithFallback(async (provider) => {
        return provider.complete({ messages: [{ role: 'user', content: 'test' }] });
      });

      expect(result.provider).toBe('provider1');
    });
  });

  describe('Streaming with Fallback', () => {
    beforeEach(async () => {
      // Manually add providers for testing
      (factory as any).providers.set('provider1', provider1);
      (factory as any).providers.set('provider2', provider2);
      
      // Build fallback chain manually since we're not using initialize()
      (factory as any).fallbackChain = ['provider1', 'provider2'];
    });

    it('should stream from first available provider', async () => {
      const chunks = [];
      for await (const chunk of factory.completeStream({ messages: [{ role: 'user', content: 'test' }] })) {
        chunks.push(chunk);
      }

      expect(chunks).toHaveLength(1);
      expect(chunks[0].choices[0].delta.content).toBe('Chunk from provider1');
    });

    it('should fallback to next provider on streaming failure', async () => {
      provider1.setShouldFail(true);

      const chunks = [];
      for await (const chunk of factory.completeStream({ messages: [{ role: 'user', content: 'test' }] })) {
        chunks.push(chunk);
      }

      expect(chunks).toHaveLength(1);
      expect(chunks[0].choices[0].delta.content).toBe('Chunk from provider2');
    });

    it('should throw error when all providers fail for streaming', async () => {
      provider1.setShouldFail(true);
      provider2.setShouldFail(true);

      const stream = factory.completeStream({ messages: [{ role: 'user', content: 'test' }] });
      await expect(stream.next()).rejects.toThrow('All providers failed for streaming');
    });
  });

  describe('Metrics', () => {
    beforeEach(async () => {
      // Manually add providers for testing
      (factory as any).providers.set('provider1', provider1);
      
      // Build fallback chain manually since we're not using initialize()
      (factory as any).fallbackChain = ['provider1'];
      
      // Initialize provider stats
      (factory as any).metrics.providerStats.set('provider1', {
        requests: 0,
        successes: 0,
        failures: 0,
      });
    });

    it('should track successful requests', async () => {
      await factory.executeWithFallback(async (provider) => {
        return provider.complete({ messages: [{ role: 'user', content: 'test' }] });
      });

      const metrics = factory.getMetrics();
      expect(metrics.totalRequests).toBe(1);
      expect(metrics.fallbacksUsed).toBe(0);
      expect(metrics.providers.provider1.requests).toBe(1);
      expect(metrics.providers.provider1.successes).toBe(1);
      expect(metrics.providers.provider1.failures).toBe(0);
    });

    it('should track failed requests and fallbacks', async () => {
      provider1.setShouldFail(true);

      try {
        await factory.executeWithFallback(async (provider) => {
          return provider.complete({ messages: [{ role: 'user', content: 'test' }] });
        });
      } catch {
        // Expected to fail
      }

      const metrics = factory.getMetrics();
      expect(metrics.totalRequests).toBe(1);
      expect(metrics.fallbacksUsed).toBe(1);
      expect(metrics.providers.provider1.requests).toBe(1);
      expect(metrics.providers.provider1.successes).toBe(0);
      expect(metrics.providers.provider1.failures).toBe(1);
    });
  });

  describe('Health Check', () => {
    beforeEach(async () => {
      // Manually add providers for testing
      (factory as any).providers.set('provider1', provider1);
      (factory as any).providers.set('provider2', provider2);
      
      // Build fallback chain manually since we're not using initialize()
      (factory as any).fallbackChain = ['provider1', 'provider2'];
    });

    it('should check health of all providers', async () => {
      const health = await factory.healthCheckAll();

      expect(health.healthy).toBe(true);
      expect(health.providers.provider1.healthy).toBe(true);
      expect(health.providers.provider2.healthy).toBe(true);
      expect(health.fallbackChain).toEqual(['provider1', 'provider2']);
    });

    it('should report unhealthy when all providers are unhealthy', async () => {
      provider1.setShouldFailHealth(true);
      provider2.setShouldFailHealth(true);

      const health = await factory.healthCheckAll();

      expect(health.healthy).toBe(false);
      expect(health.providers.provider1.healthy).toBe(false);
      expect(health.providers.provider2.healthy).toBe(false);
    });
  });

  describe('Singleton Pattern', () => {
    it('should create singleton on first call', async () => {
      const factory1 = await getProviderFactory({
        ollama: { baseUrl: 'http://localhost:11434' },
      });

      const factory2 = await getProviderFactory();

      expect(factory1).toBe(factory2);
    });

    it('should require config on first initialization', async () => {
      await expect(getProviderFactory()).rejects.toThrow('Configuration required for first initialization');
    });

    it('should reset singleton', async () => {
      const factory1 = await getProviderFactory({
        ollama: { baseUrl: 'http://localhost:11434' },
      });

      resetProviderFactory();

      const factory2 = await getProviderFactory({
        ollama: { baseUrl: 'http://localhost:11434' },
      });

      expect(factory1).not.toBe(factory2);
    });
  });
});
