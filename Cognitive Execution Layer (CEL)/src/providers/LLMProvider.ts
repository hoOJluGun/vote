/**
 * LLM Provider Interface
 * Defines the contract for all LLM provider implementations
 */

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
  name?: string;
}

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

export interface Choice {
  index: number;
  message: Message;
  finish_reason: string | null;
}

export interface Usage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

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

export interface StreamChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: StreamChoice[];
}

export interface StreamChoice {
  index: number;
  delta: {
    role?: string;
    content?: string;
  };
  finish_reason: string | null;
}

export interface HealthStatus {
  healthy: boolean;
  latency?: number;
  modelsAvailable?: number;
  error?: string;
  lastChecked: number;
}

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

export type ProviderType = 'cloud' | 'local' | 'hybrid';

/**
 * Base LLM Provider interface
 * All provider implementations must implement this interface
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
