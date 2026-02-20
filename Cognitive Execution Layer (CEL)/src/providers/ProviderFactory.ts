/**
 * Provider Factory - Creates and manages LLM providers with fallback chain
 * Implements TypeScript interfaces and enhanced fallback logic
 */

import { LLMProvider, CompletionRequest, CompletionResponse, StreamChunk, HealthStatus, ModelInfo, CostEstimate } from './LLMProvider.js';
import { OpenRouterAdapter } from './OpenRouterAdapter.js';
import { OllamaAdapter } from './OllamaAdapter.js';
import { TextGenerationWebUIAdapter } from './TextGenerationWebUIAdapter.js';
import { SecretsManager } from '../../security/security-framework.js';

export interface ProviderConfig {
  apiKey?: string;
  baseUrl?: string;
  defaultModel?: string;
  timeout?: number;
  maxRetries?: number;
}

export interface ProviderFactoryConfig {
  openrouter?: ProviderConfig;
  ollama?: ProviderConfig;
  tgwebui?: ProviderConfig;
  preferLocal?: boolean;
  fallbackOrder?: string[];
}

export interface ProviderMetrics {
  requests: number;
  successes: number;
  failures: number;
  avgLatency?: number;
}

export interface FactoryMetrics {
  totalRequests: number;
  fallbacksUsed: number;
  fallbackRate: number;
  providers: Record<string, ProviderMetrics>;
}

export interface CircuitBreakerState {
  failures: number;
  openUntil: number;
}

/**
 * Enhanced Provider Factory with circuit breaker and retry logic
 */
export class ProviderFactory {
  private providers = new Map<string, LLMProvider>();
  private fallbackChain: string[] = [];
  private secretsManager: SecretsManager;
  private circuitBreaker = new Map<string, CircuitBreakerState>();
  private metrics = {
    totalRequests: 0,
    fallbacksUsed: 0,
    providerStats: new Map<string, ProviderMetrics>(),
  };

  constructor(options: { secretsManager?: SecretsManager } = {}) {
    this.secretsManager = options.secretsManager || new SecretsManager({ backend: 'env' });
  }

  /**
   * Create a provider adapter by name
   */
  create(providerName: string, config: ProviderConfig = {}): LLMProvider {
    switch (providerName) {
      case 'openrouter':
        return new OpenRouterAdapter(config as { apiKey: string; baseUrl?: string; defaultModel?: string });
      case 'ollama':
        return new OllamaAdapter(config as { baseUrl?: string; defaultModel?: string });
      case 'tgwebui':
        return new TextGenerationWebUIAdapter(config as { baseUrl: string; defaultModel?: string });
      default:
        throw new Error(`Unknown provider: ${providerName}`);
    }
  }

  /**
   * Initialize providers from configuration
   */
  async initialize(config: ProviderFactoryConfig): Promise<void> {
    console.log('🔧 Initializing Provider Factory...');

    // Initialize secrets manager
    await this.secretsManager.initialize();

    // Initialize Ollama (local, free) first if configured
    if (config.ollama) {
      try {
        const ollama = this.create('ollama', config.ollama);
        const health = await ollama.healthCheck();

        if (health.healthy) {
          this.providers.set('ollama', ollama);
          this.metrics.providerStats.set('ollama', {
            requests: 0,
            successes: 0,
            failures: 0,
          });
          console.log(`✅ Ollama provider initialized (${health.modelsAvailable} models)`);
        } else {
          console.warn(`⚠️ Ollama not available: ${health.error}`);
        }
      } catch (error: any) {
        console.warn(`⚠️ Failed to initialize Ollama: ${error.message}`);
      }
    }

    // Initialize OpenRouter (cloud) with secure API key retrieval
    if (config.openrouter) {
      try {
        const openrouterConfig = { ...config.openrouter };

        // Get API key from SecretsManager (supports env vars and Keychain)
        if (!openrouterConfig.apiKey) {
          openrouterConfig.apiKey = await this.secretsManager.getApiKey('openrouter');
        }

        if (!openrouterConfig.apiKey) {
          console.warn('⚠️ OpenRouter API key not found. Set OPENROUTER_API_KEY env var or use Keychain.');
        } else {
          const openrouter = this.create('openrouter', openrouterConfig);
          this.providers.set('openrouter', openrouter);
          this.metrics.providerStats.set('openrouter', {
            requests: 0,
            successes: 0,
            failures: 0,
          });
          console.log('✅ OpenRouter provider initialized');
        }
      } catch (error: any) {
        console.warn(`⚠️ Failed to initialize OpenRouter: ${error.message}`);
      }
    }

    // Initialize TextGenerationWebUI (self-hosted) if configured
    if (config.tgwebui) {
      try {
        const tgwebui = this.create('tgwebui', config.tgwebui);
        const health = await tgwebui.healthCheck();

        if (health.healthy) {
          this.providers.set('tgwebui', tgwebui);
          this.metrics.providerStats.set('tgwebui', {
            requests: 0,
            successes: 0,
            failures: 0,
          });
          console.log('✅ TextGenerationWebUI provider initialized');
        } else {
          console.warn(`⚠️ TextGenerationWebUI not available: ${health.error}`);
        }
      } catch (error: any) {
        console.warn(`⚠️ Failed to initialize TextGenerationWebUI: ${error.message}`);
      }
    }

    // Build fallback chain
    this.buildFallbackChain(config);

    console.log(`🔗 Fallback chain: ${this.fallbackChain.join(' → ')}`);
  }

  /**
   * Build fallback chain based on configuration and health
   */
  private buildFallbackChain(config: ProviderFactoryConfig): void {
    this.fallbackChain = [];

    // Prefer local providers first (free!)
    if (config.preferLocal !== false) {
      if (this.providers.has('ollama')) {
        this.fallbackChain.push('ollama');
      }
    }

    // Add cloud providers
    if (this.providers.has('openrouter')) {
      this.fallbackChain.push('openrouter');
    }

    // Add self-hosted providers
    if (this.providers.has('tgwebui')) {
      this.fallbackChain.push('tgwebui');
    }

    // Apply custom order if specified
    if (config.fallbackOrder && Array.isArray(config.fallbackOrder)) {
      this.fallbackChain = config.fallbackOrder.filter(name => this.providers.has(name));
    }
  }

  /**
   * Get a provider by name
   */
  getProvider(name: string): LLMProvider | null {
    return this.providers.get(name) || null;
  }

  /**
   * Get the fallback chain
   */
  getFallbackChain(): string[] {
    return [...this.fallbackChain];
  }

  /**
   * Execute with automatic fallback
   * Overload 1: Execute operation function with fallback
   */
  async executeWithFallback<T>(
    operation: (provider: LLMProvider) => Promise<T>,
    preferredProvider?: string
  ): Promise<T>;

  /**
   * Execute with automatic fallback
   * Overload 2: Execute completion request with fallback
   */
  async executeWithFallback(
    request: CompletionRequest,
    providers?: string[]
  ): Promise<CompletionResponse>;

  async executeWithFallback<T>(
    operationOrRequest: ((provider: LLMProvider) => Promise<T>) | CompletionRequest,
    preferredOrProviders?: string | string[]
  ): Promise<T | CompletionResponse> {
    // Overload 2: Execute completion request
    if (typeof operationOrRequest !== 'function') {
      return this.executeRequestWithFallback(operationOrRequest as CompletionRequest, preferredOrProviders as string[]);
    }

    // Overload 1: Execute operation function
    this.metrics.totalRequests++;

    // Build chain with preferred provider first
    let chain = [...this.fallbackChain];
    if (preferredOrProviders && typeof preferredOrProviders === 'string' && this.providers.has(preferredOrProviders)) {
      chain = [
        preferredOrProviders,
        ...chain.filter(p => p !== preferredOrProviders),
      ];
    }

    const errors: Array<{ provider: string; error: Error }> = [];

    for (const providerName of chain) {
      const provider = this.providers.get(providerName);
      if (!provider) continue;

      try {
        // Check circuit breaker
        if (this.isCircuitOpen(providerName)) {
          console.warn(`⚠️ Provider ${providerName} circuit is open, skipping`);
          continue;
        }

        // Check health before using
        const health = await provider.healthCheck();
        if (!health.healthy) {
          console.warn(`⚠️ Provider ${providerName} is unhealthy, skipping`);
          continue;
        }

        // Execute operation
        const result = await operationOrRequest(provider);

        // Update metrics
        this.updateProviderMetrics(providerName, true);
        this.onCircuitSuccess(providerName);

        return result;
      } catch (error) {
        console.warn(`⚠️ Provider ${providerName} failed:`, (error as Error).message);
        errors.push({ provider: providerName, error: error as Error });
        this.updateProviderMetrics(providerName, false);
        this.onCircuitFailure(providerName);
      }
    }

    // All providers failed
    this.metrics.fallbacksUsed++;
    throw new AggregateError(
      errors.map(e => e.error),
      `All providers failed: ${errors.map(e => `${e.provider}: ${e.error.message}`).join(', ')}`
    );
  }

  /**
   * Execute a completion request with explicit fallback provider list
   */
  private async executeRequestWithFallback(request: CompletionRequest, providers: string[] = []): Promise<CompletionResponse> {
    this.metrics.totalRequests++;

    const chain = (providers && providers.length > 0)
      ? providers.filter(p => this.providers.has(p))
      : [...this.fallbackChain];

    const errors: Array<{ provider: string; error: Error }> = [];

    for (const providerName of chain) {
      const provider = this.providers.get(providerName);
      if (!provider) continue;

      try {
        if (this.isCircuitOpen(providerName)) {
          continue;
        }

        const health = await provider.healthCheck();
        if (!health.healthy) {
          continue;
        }

        const result = await provider.complete({ ...request, stream: false });
        this.updateProviderMetrics(providerName, true);
        this.onCircuitSuccess(providerName);
        return result;
      } catch (error) {
        errors.push({ provider: providerName, error: error as Error });
        this.updateProviderMetrics(providerName, false);
        this.onCircuitFailure(providerName);
      }
    }

    this.metrics.fallbacksUsed++;
    throw new AggregateError(
      errors.map(e => e.error),
      `All providers failed: ${errors.map(e => `${e.provider}: ${e.error.message}`).join(', ')}`
    );
  }

  /**
   * Complete with fallback
   */
  async complete(request: CompletionRequest, preferredProvider?: string): Promise<CompletionResponse> {
    return this.executeWithFallback(
      async (provider) => provider.complete(request),
      preferredProvider
    );
  }

  /**
   * Complete with streaming and fallback
   */
  async *completeStream(request: CompletionRequest, preferredProvider?: string): AsyncGenerator<StreamChunk> {
    // For streaming, we need to pick a provider upfront
    let chain = [...this.fallbackChain];
    if (preferredProvider && this.providers.has(preferredProvider)) {
      chain = [
        preferredProvider,
        ...chain.filter(p => p !== preferredProvider),
      ];
    }

    for (const providerName of chain) {
      const provider = this.providers.get(providerName);
      if (!provider || !provider.supportsStreaming) continue;

      try {
        const health = await provider.healthCheck();
        if (!health.healthy) continue;

        // Stream from this provider
        if (provider.completeStream) {
          for await (const chunk of provider.completeStream(request)) {
            yield chunk;
          }
        } else {
          throw new Error(`Provider ${providerName} does not support streaming`);
        }

        this.updateProviderMetrics(providerName, true);
        return;
      } catch (error) {
        console.warn(`⚠️ Streaming failed for ${providerName}:`, (error as Error).message);
        this.updateProviderMetrics(providerName, false);
      }
    }

    throw new Error('All providers failed for streaming');
  }

  /**
   * Circuit breaker methods
   */
  private isCircuitOpen(providerName: string): boolean {
    const state = this.circuitBreaker.get(providerName);
    if (!state) return false;
    if (!state.openUntil) return false;
    return Date.now() < state.openUntil;
  }

  private onCircuitFailure(providerName: string): void {
    const state = this.circuitBreaker.get(providerName) || { failures: 0, openUntil: 0 };
    state.failures += 1;
    if (state.failures >= 5) {
      state.openUntil = Date.now() + 30_000; // 30 seconds
    }
    this.circuitBreaker.set(providerName, state);
  }

  private onCircuitSuccess(providerName: string): void {
    if (this.circuitBreaker.has(providerName)) {
      this.circuitBreaker.set(providerName, { failures: 0, openUntil: 0 });
    }
  }

  /**
   * Update provider metrics
   */
  private updateProviderMetrics(name: string, success: boolean): void {
    const stats = this.metrics.providerStats.get(name);
    if (stats) {
      stats.requests++;
      if (success) {
        stats.successes++;
      } else {
        stats.failures++;
      }
    }
  }

  /**
   * Get factory metrics
   */
  getMetrics(): FactoryMetrics {
    return {
      totalRequests: this.metrics.totalRequests,
      fallbacksUsed: this.metrics.fallbacksUsed,
      fallbackRate: this.metrics.totalRequests > 0
        ? this.metrics.fallbacksUsed / this.metrics.totalRequests
        : 0,
      providers: Object.fromEntries(this.metrics.providerStats),
    };
  }

  /**
   * Health check all providers
   */
  async healthCheckAll(): Promise<{ healthy: boolean; providers: Record<string, HealthStatus>; fallbackChain: string[] }> {
    const results: Record<string, HealthStatus> = {};

    for (const [name, provider] of this.providers) {
      results[name] = await provider.healthCheck();
    }

    return {
      healthy: Object.values(results).some(r => r.healthy),
      providers: results,
      fallbackChain: this.fallbackChain,
    };
  }

  /**
   * List all available models across providers
   */
  async listAllModels(): Promise<Array<ModelInfo & { provider: string; providerType: string }>> {
    const models: Array<ModelInfo & { provider: string; providerType: string }> = [];

    for (const [name, provider] of this.providers) {
      try {
        const providerModels = await provider.listModels();
        models.push(...providerModels.map(m => ({
          ...m,
          provider: name,
          providerType: provider.type,
        })));
      } catch (error: any) {
        console.warn(`Failed to list models for ${name}:`, error.message);
      }
    }

    return models;
  }

  /**
   * Shutdown all providers
   */
  async shutdown(): Promise<void> {
    for (const [name, provider] of this.providers) {
      try {
        if ((provider as any).shutdown) {
          await (provider as any).shutdown();
        }
        console.log(`🔌 Provider ${name} shut down`);
      } catch (error: any) {
        console.warn(`Failed to shutdown ${name}:`, error.message);
      }
    }

    this.providers.clear();
    this.fallbackChain = [];
  }
}

// Singleton instance
let factoryInstance: ProviderFactory | null = null;

/**
 * Get or create the singleton factory instance
 */
export async function getProviderFactory(config?: ProviderFactoryConfig): Promise<ProviderFactory> {
  if (!factoryInstance) {
    if (!config) {
      throw new Error('Configuration required for first initialization');
    }
    factoryInstance = new ProviderFactory();
    await factoryInstance.initialize(config);
  }
  return factoryInstance;
}

/**
 * Reset the singleton instance
 */
export function resetProviderFactory(): void {
  if (factoryInstance) {
    factoryInstance.shutdown();
    factoryInstance = null;
  }
}

export default ProviderFactory;
