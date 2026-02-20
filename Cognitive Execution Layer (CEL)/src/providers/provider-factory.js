/**
 * Provider Factory - Creates and manages LLM providers with fallback chain
 * @module src/providers/provider-factory
 */

import { OpenRouterProvider } from './openrouter-provider.js';
import { OllamaProvider } from './ollama-provider.js';
import { SecretsManager } from '../../security/security-framework.js';

/**
 * Provider Factory
 * Manages multiple LLM providers with automatic fallback
 */
export class ProviderFactory {
  constructor(options = {}) {
    this.providers = new Map();
    this.fallbackChain = [];
    this.secretsManager = options.secretsManager || new SecretsManager({ backend: 'env' });
    this.metrics = {
      totalRequests: 0,
      fallbacksUsed: 0,
      providerStats: new Map(),
    };
  }

  /**
   * Initialize providers from configuration
   * @param {Object} config - Provider configuration
   */
  async initialize(config) {
    console.log('🔧 Initializing Provider Factory...');

    // Initialize secrets manager
    await this.secretsManager.initialize();

    // Initialize Ollama (local, free) first if configured
    if (config.ollama) {
      try {
        const ollamaConfig = { ...config.ollama };
        const ollama = new OllamaProvider(ollamaConfig);
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
      } catch (error) {
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
          const openrouter = new OpenRouterProvider(openrouterConfig);
          this.providers.set('openrouter', openrouter);
          this.metrics.providerStats.set('openrouter', {
            requests: 0,
            successes: 0,
            failures: 0,
          });
          console.log('✅ OpenRouter provider initialized');
        }
      } catch (error) {
        console.warn(`⚠️ Failed to initialize OpenRouter: ${error.message}`);
      }
    }

    // Build fallback chain
    this.buildFallbackChain(config);

    console.log(`🔗 Fallback chain: ${this.fallbackChain.join(' → ')}`);
  }

  /**
   * Build fallback chain based on configuration and health
   * @param {Object} config - Configuration
   */
  buildFallbackChain(config) {
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

    // Apply custom order if specified
    if (config.fallbackOrder && Array.isArray(config.fallbackOrder)) {
      this.fallbackChain = config.fallbackOrder.filter(name => this.providers.has(name));
    }
  }

  /**
   * Get a provider by name
   * @param {string} name - Provider name
   * @returns {Object|null} Provider instance
   */
  getProvider(name) {
    return this.providers.get(name) || null;
  }

  /**
   * Get the fallback chain
   * @returns {Array<string>} Fallback chain
   */
  getFallbackChain() {
    return [...this.fallbackChain];
  }

  /**
   * Execute with automatic fallback
   * @param {Function} operation - Operation to execute
   * @param {string} preferredProvider - Preferred provider
   * @returns {Promise<Object>} Result
   */
  async executeWithFallback(operation, preferredProvider = null) {
    this.metrics.totalRequests++;

    // Build chain with preferred provider first
    let chain = [...this.fallbackChain];
    if (preferredProvider && this.providers.has(preferredProvider)) {
      chain = [
        preferredProvider,
        ...chain.filter(p => p !== preferredProvider),
      ];
    }

    const errors = [];

    for (const providerName of chain) {
      const provider = this.providers.get(providerName);
      if (!provider) continue;

      try {
        // Check health before using
        const health = await provider.healthCheck();
        if (!health.healthy) {
          console.warn(`⚠️ Provider ${providerName} is unhealthy, skipping`);
          continue;
        }

        // Execute operation
        const result = await operation(provider);

        // Update metrics
        this.updateProviderMetrics(providerName, true);

        return result;
      } catch (error) {
        console.warn(`⚠️ Provider ${providerName} failed:`, error.message);
        errors.push({ provider: providerName, error });
        this.updateProviderMetrics(providerName, false);
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
   * Complete with fallback
   * @param {Object} request - Completion request
   * @param {string} preferredProvider - Preferred provider
   * @returns {Promise<Object>} Completion response
   */
  async complete(request, preferredProvider = null) {
    return this.executeWithFallback(
      async (provider) => provider.complete(request),
      preferredProvider
    );
  }

  /**
   * Complete with streaming and fallback
   * @param {Object} request - Completion request
   * @param {string} preferredProvider - Preferred provider
   * @yields {Object} Stream chunks
   */
  async *completeStream(request, preferredProvider = null) {
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
        for await (const chunk of provider.completeStream(request)) {
          yield chunk;
        }

        this.updateProviderMetrics(providerName, true);
        return;
      } catch (error) {
        console.warn(`⚠️ Streaming failed for ${providerName}:`, error.message);
        this.updateProviderMetrics(providerName, false);
      }
    }

    throw new Error('All providers failed for streaming');
  }

  /**
   * Get best provider for task
   * @param {string} taskType - Task type
   * @param {number} tokens - Estimated tokens
   * @param {Object} constraints - Constraints (cost, latency, etc.)
   * @returns {Object} Best provider and model
   */
  getBestProvider(taskType, tokens = 0, constraints = {}) {
    const candidates = [];

    for (const [name, provider] of this.providers) {
      // Check constraints
      if (constraints.maxCost !== undefined) {
        const estimate = provider.estimateCost({ messages: [], maxTokens: tokens });
        if (estimate.estimatedCost > constraints.maxCost) {
          continue;
        }
      }

      if (constraints.maxLatency !== undefined) {
        const stats = this.metrics.providerStats.get(name);
        if (stats && stats.avgLatency > constraints.maxLatency) {
          continue;
        }
      }

      // Score the provider
      const score = this.scoreProvider(name, provider, taskType, tokens, constraints);
      candidates.push({ name, provider, score });
    }

    // Sort by score (highest first)
    candidates.sort((a, b) => b.score - a.score);

    if (candidates.length === 0) {
      return null;
    }

    return {
      provider: candidates[0].provider,
      providerName: candidates[0].name,
      model: candidates[0].provider.getCurrentModel(),
      score: candidates[0].score,
    };
  }

  /**
   * Score a provider for a task
   * @param {string} name - Provider name
   * @param {Object} provider - Provider instance
   * @param {string} taskType - Task type
   * @param {number} tokens - Estimated tokens
   * @param {Object} constraints - Constraints
   * @returns {number} Score
   */
  scoreProvider(name, provider, taskType, tokens, constraints) {
    let score = 0;

    // Prefer local providers (free)
    if (provider.type === 'local') {
      score += 100;
    }

    // Cost factor
    const cost = provider.estimateCost({ messages: [], maxTokens: tokens });
    score -= cost.estimatedCost * 1000; // Penalize expensive providers

    // Reliability factor
    const stats = this.metrics.providerStats.get(name);
    if (stats && stats.requests > 0) {
      const successRate = stats.successes / stats.requests;
      score += successRate * 50;
    }

    // Task-specific scoring
    if (taskType === 'code' && provider.name === 'openrouter') {
      score += 20; // OpenRouter has good code models
    }

    // Latency factor
    if (stats && stats.avgLatency) {
      score -= stats.avgLatency / 100; // Penalize slow providers
    }

    return score;
  }

  /**
   * Update provider metrics
   * @param {string} name - Provider name
   * @param {boolean} success - Whether request succeeded
   */
  updateProviderMetrics(name, success) {
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
   * @returns {Object} Metrics
   */
  getMetrics() {
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
   * @returns {Promise<Object>} Health status
   */
  async healthCheckAll() {
    const results = {};

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
   * @returns {Promise<Array>} All models
   */
  async listAllModels() {
    const models = [];

    for (const [name, provider] of this.providers) {
      try {
        const providerModels = await provider.listModels();
        models.push(...providerModels.map(m => ({
          ...m,
          provider: name,
          providerType: provider.type,
        })));
      } catch (error) {
        console.warn(`Failed to list models for ${name}:`, error.message);
      }
    }

    return models;
  }

  /**
   * Shutdown all providers
   */
  async shutdown() {
    for (const [name, provider] of this.providers) {
      try {
        if (provider.shutdown) {
          await provider.shutdown();
        }
        console.log(`🔌 Provider ${name} shut down`);
      } catch (error) {
        console.warn(`Failed to shutdown ${name}:`, error.message);
      }
    }

    this.providers.clear();
    this.fallbackChain = [];
  }
}

// Singleton instance
let factoryInstance = null;

/**
 * Get or create the singleton factory instance
 * @param {Object} config - Configuration (only used on first call)
 * @returns {ProviderFactory} Factory instance
 */
export async function getProviderFactory(config = null) {
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
export function resetProviderFactory() {
  if (factoryInstance) {
    factoryInstance.shutdown();
    factoryInstance = null;
  }
}

export default ProviderFactory;
