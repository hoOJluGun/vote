/**
 * LLM Provider Types - Interfaces and base types for provider abstraction
 * @module src/providers/types
 */

/**
 * Message in a conversation
 */
export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
  name?: string;
}

/**
 * Request for completion
 */
export interface CompletionRequest {
  messages: Message[];
  model?: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  stream?: boolean;
  stop?: string[];
  metadata?: Record<string, unknown>;
}

/**
 * Choice in a completion response
 */
export interface Choice {
  index: number;
  message: Message;
  finish_reason: string | null;
}

/**
 * Token usage information
 */
export interface Usage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

/**
 * Completion response
 */
export interface CompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Choice[];
  usage: Usage;
  latency: number;
  provider: string;
}

/**
 * Stream chunk for streaming responses
 */
export interface StreamChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: StreamChoice[];
}

/**
 * Choice in a stream chunk
 */
export interface StreamChoice {
  index: number;
  delta: {
    role?: string;
    content?: string;
  };
  finish_reason: string | null;
}

/**
 * Health status of a provider
 */
export interface HealthStatus {
  healthy: boolean;
  latency?: number;
  modelsAvailable?: number;
  error?: string;
  lastChecked: number;
}

/**
 * Model information
 */
export interface ModelInfo {
  id: string;
  name: string;
  contextLength?: number;
  pricing?: {
    input: number;
    output: number;
  };
  capabilities?: string[];
}

/**
 * Cost estimation
 */
export interface CostEstimate {
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number;
  currency: string;
  breakdown?: {
    input: number;
    output: number;
  };
}

/**
 * Provider type
 */
export type ProviderType = 'cloud' | 'local' | 'hybrid';

/**
 * Base LLM Provider interface
 */
export interface LLMProvider {
  /** Provider name */
  readonly name: string;

  /** Provider type */
  readonly type: ProviderType;

  /** Whether streaming is supported */
  readonly supportsStreaming: boolean;

  /** Maximum tokens supported */
  readonly maxTokens: number;

  /** Default model */
  readonly defaultModel: string;

  /**
   * Execute a completion request
   */
  complete(request: CompletionRequest): Promise<CompletionResponse>;

  /**
   * Execute a streaming completion request
   */
  completeStream?(request: CompletionRequest): AsyncGenerator<StreamChunk>;

  /**
   * Check provider health
   */
  healthCheck(): Promise<HealthStatus>;

  /**
   * List available models
   */
  listModels(): Promise<ModelInfo[]>;

  /**
   * Estimate cost for a request
   */
  estimateCost(request: CompletionRequest): CostEstimate;

  /**
   * Get current model
   */
  getCurrentModel(): string;

  /**
   * Set model
   */
  setModel(model: string): void;
}

/**
 * Provider configuration
 */
export interface ProviderConfig {
  /** API key (if required) */
  apiKey?: string;

  /** Base URL for API */
  baseUrl?: string;

  /** Default model to use */
  defaultModel?: string;

  /** Request timeout in ms */
  timeout?: number;

  /** Maximum retries */
  maxRetries?: number;

  /** Additional headers */
  headers?: Record<string, string>;
}

/**
 * Provider factory configuration
 */
export interface ProviderFactoryConfig {
  openrouter?: ProviderConfig & { apiKey: string; baseUrl: string };
  ollama?: ProviderConfig & { baseUrl: string };
  tgwebui?: ProviderConfig & { baseUrl: string };
  lmstudio?: ProviderConfig & { baseUrl: string };

  /** Fallback order (provider names) */
  fallbackOrder?: string[];

  /** Prefer local providers */
  preferLocal?: boolean;

  /** Maximum cost per request (USD) */
  maxCostPerRequest?: number;
}

/**
 * Provider metrics
 */
export interface ProviderMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  totalTokens: number;
  totalCost: number;
  avgLatency: number;
  lastError?: string;
  lastSuccess?: number;
}

export default {
  Message: null,
  CompletionRequest: null,
  CompletionResponse: null,
  LLMProvider: null,
};
