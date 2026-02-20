/**
 * Providers Module Entry Point
 * Exports all provider-related types, interfaces, and implementations
 */

// Types and interfaces
export type {
  Message,
  CompletionRequest,
  Choice,
  Usage,
  CompletionResponse,
  StreamChunk,
  StreamChoice,
  HealthStatus,
  ModelInfo,
  CostEstimate,
  ProviderType,
  LLMProvider,
  ProviderConfig,
  ProviderFactoryConfig,
  ProviderMetrics,
  FactoryMetrics,
  CircuitBreakerState,
} from './LLMProvider.js';

// Adapters
export { TextGenerationWebUIAdapter } from './adapters/textgeneration-webui-adapter.js';

// Provider implementations
export { BaseProvider } from './base-provider.js';
export { OpenRouterAdapter } from './OpenRouterAdapter.js';
export { OllamaAdapter } from './OllamaAdapter.js';
export { TextGenerationWebUIAdapter as TGWebUIAdapter } from './TextGenerationWebUIAdapter.js';

// Factory
export { ProviderFactory, getProviderFactory, resetProviderFactory } from './ProviderFactory.js';

// Utilities
export { parseSSELines, sseResponseToAsyncIterator } from './utils/sse.js';
