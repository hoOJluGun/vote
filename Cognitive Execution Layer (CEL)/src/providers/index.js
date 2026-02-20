/**
 * Providers Module - LLM Provider Abstraction Layer
 * @module src/providers
 */

// Types
export * from './types.js';

// Base
export { BaseProvider } from './base-provider.js';

// Providers
export { OpenRouterProvider } from './openrouter-provider.js';
export { OllamaProvider } from './ollama-provider.js';

// Factory
export {
  ProviderFactory,
  getProviderFactory,
  resetProviderFactory,
} from './provider-factory.js';

/**
 * Create a provider factory with default configuration
 * @param {Object} config - Configuration
 * @returns {Promise<ProviderFactory>} Configured factory
 */
export async function createProviders(config) {
  const { ProviderFactory } = await import('./provider-factory.js');
  const factory = new ProviderFactory();
  await factory.initialize(config);
  return factory;
}

export default {
  BaseProvider: null,
  OpenRouterProvider: null,
  OllamaProvider: null,
  ProviderFactory: null,
};
