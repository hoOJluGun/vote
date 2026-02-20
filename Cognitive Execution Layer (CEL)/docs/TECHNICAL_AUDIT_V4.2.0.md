# CEL v4.2.0 - Глубокий технический аудит

## Экспертное заключение ведущего архитектора ПО и специалиста по безопасности

**Дата:** 2026-02-20  
**Версия:** CEL v4.2.0  
**Аудиторы:** Архитектор ПО, Эксперт по безопасности

---

## Содержание

1. [Executive Summary](#1-executive-summary)
2. [Архитектура и рефакторинг](#2-архитектура-и-рефакторинг)
3. [Стратегия оптимизации затрат](#3-стратегия-оптимизации-затрат)
4. [Безопасность](#4-безопасность)
5. [Интеграция с Xcode](#5-интеграция-с-xcode)
6. [Дорожная карта](#6-дорожная-карта)

---

## 1. Executive Summary

### Общая оценка проекта

| Критерий | Оценка | Комментарий |
|----------|--------|-------------|
| Архитектура | ⚠️ 3/10 | Монолитный сервер 3129 строк, отсутствие модульности |
| Безопасность | ✅ 7/10 | Недавно улучшено: AES-256-GCM, PBKDF2 |
| Оптимизация затрат | ⚠️ 4/10 | Базовый CostOptimizer, нет кэширования |
| Интеграция Xcode | ⚠️ 5/10 | Только HTTP API, нет нативного клиента |
| Тестируемость | ❌ 2/10 | Сломанные тесты, низкое покрытие |
| Документация | ✅ 6/10 | Хорошая структура, но устаревшая |

### Критические проблемы

1. **Монолитная архитектура** - [`src/server/index.js`](src/server/index.js) содержит 3129 строк кода с 50+ эндпоинтами
2. **Отсутствие ProviderAdapter** - жёсткая привязка к OpenRouter, нет поддержки Ollama/local моделей
3. **Нет кэширования** - каждый запрос идёт к LLM, нет semantic caching
4. **Секреты в .env** - API ключи хранятся в файлах, нет интеграции с Keychain/Vault

---

## 2. Архитектура и рефакторинг

### 2.1 Текущие проблемы

#### Проблема: Монолитный сервер

```javascript
// src/server/index.js - 3129 строк!
// Все эндпоинты в одном файле
app.post("/v1/chat/completions", ...);
app.post("/v1/code-assist", ...);
app.get("/v1/models", ...);
// ... ещё 50+ эндпоинтов
```

**Решение:** Модульная архитектура с DI уже создана в `src/server/routes/` и `src/server/container/`.

### 2.2 ProviderAdapter Pattern

#### Интерфейс провайдера

```typescript
// src/providers/types.ts

/**
 * Базовый интерфейс для LLM провайдеров
 */
export interface LLMProvider {
  readonly name: string;
  readonly type: 'cloud' | 'local' | 'hybrid';
  readonly supportsStreaming: boolean;
  readonly maxTokens: number;
  
  /**
   * Выполнить chat completion запрос
   */
  complete(request: CompletionRequest): Promise<CompletionResponse>;
  
  /**
   * Streaming completion
   */
  completeStream?(request: CompletionRequest): AsyncGenerator<StreamChunk>;
  
  /**
   * Проверить доступность провайдера
   */
  healthCheck(): Promise<HealthStatus>;
  
  /**
   * Получить список доступных моделей
   */
  listModels(): Promise<ModelInfo[]>;
  
  /**
   * Оценить стоимость запроса
   */
  estimateCost(request: CompletionRequest): CostEstimate;
}

export interface CompletionRequest {
  messages: Message[];
  model?: string;
  maxTokens?: number;
  temperature?: number;
  stream?: boolean;
  metadata?: Record<string, unknown>;
}

export interface CompletionResponse {
  id: string;
  model: string;
  choices: Choice[];
  usage: Usage;
  latency: number;
  provider: string;
}

export interface CostEstimate {
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number;
  currency: string;
}
```

#### Реализация OpenRouter Adapter

```typescript
// src/providers/openrouter-adapter.ts

import { LLMProvider, CompletionRequest, CompletionResponse } from './types';
import { HttpClient } from '../server/utils/http-client';

export class OpenRouterAdapter implements LLMProvider {
  readonly name = 'openrouter';
  readonly type = 'cloud' as const;
  readonly supportsStreaming = true;
  readonly maxTokens = 128000;

  private client: HttpClient;
  private apiKey: string;
  private baseUrl: string;

  constructor(config: { apiKey: string; baseUrl: string }) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl;
    this.client = new HttpClient({
      maxSockets: 50,
      timeout: 30000,
      maxRetries: 3,
    });
  }

  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    const startTime = Date.now();
    
    const response = await this.client.post(
      `${this.baseUrl}/chat/completions`,
      {
        model: request.model || 'auto',
        messages: request.messages,
        max_tokens: request.maxTokens || 1024,
        temperature: request.temperature ?? 0.7,
        stream: false,
      },
      {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'http://localhost',
          'X-Title': 'CEL-Proxy',
        },
      }
    );

    return {
      id: response.data.id,
      model: response.data.model,
      choices: response.data.choices,
      usage: response.data.usage,
      latency: Date.now() - startTime,
      provider: this.name,
    };
  }

  async *completeStream(request: CompletionRequest): AsyncGenerator<StreamChunk> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...request,
        stream: true,
      }),
    });

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter(line => line.startsWith('data: '));
      
      for (const line of lines) {
        const data = line.slice(6);
        if (data === '[DONE]') return;
        yield JSON.parse(data);
      }
    }
  }

  async healthCheck() {
    try {
      const response = await this.client.get(`${this.baseUrl}/models`, {
        headers: { 'Authorization': `Bearer ${this.apiKey}` },
      });
      return { healthy: true, modelsAvailable: response.data.data?.length || 0 };
    } catch {
      return { healthy: false, modelsAvailable: 0 };
    }
  }

  async listModels() {
    const response = await this.client.get(`${this.baseUrl}/models`, {
      headers: { 'Authorization': `Bearer ${this.apiKey}` },
    });
    return response.data.data.map((m: any) => ({
      id: m.id,
      name: m.id,
      contextLength: m.context_length,
      pricing: m.pricing,
    }));
  }

  estimateCost(request: CompletionRequest): CostEstimate {
    const inputTokens = this.estimateTokens(request.messages);
    const outputTokens = request.maxTokens || 1024;
    
    // OpenRouter pricing varies by model
    const avgCostPer1kTokens = 0.001; // Average for free models
    
    return {
      inputTokens,
      outputTokens,
      estimatedCost: ((inputTokens + outputTokens) / 1000) * avgCostPer1kTokens,
      currency: 'USD',
    };
  }

  private estimateTokens(messages: Message[]): number {
    const text = messages.map(m => m.content).join(' ');
    return Math.ceil(text.length / 4);
  }
}
```

#### Реализация Ollama Adapter (локальные модели)

```typescript
// src/providers/ollama-adapter.ts

import { LLMProvider, CompletionRequest, CompletionResponse } from './types';

export class OllamaAdapter implements LLMProvider {
  readonly name = 'ollama';
  readonly type = 'local' as const;
  readonly supportsStreaming = true;
  readonly maxTokens = 32768;

  private baseUrl: string;
  private defaultModel: string;

  constructor(config: { baseUrl?: string; defaultModel?: string }) {
    this.baseUrl = config.baseUrl || 'http://localhost:11434';
    this.defaultModel = config.defaultModel || 'llama3.2';
  }

  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    const startTime = Date.now();
    
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: request.model || this.defaultModel,
        messages: request.messages,
        stream: false,
        options: {
          num_predict: request.maxTokens || 1024,
          temperature: request.temperature ?? 0.7,
        },
      }),
    });

    const data = await response.json();

    return {
      id: `ollama-${Date.now()}`,
      model: data.model,
      choices: [{
        index: 0,
        message: data.message,
        finish_reason: 'stop',
      }],
      usage: {
        prompt_tokens: data.prompt_eval_count || 0,
        completion_tokens: data.eval_count || 0,
        total_tokens: (data.prompt_eval_count || 0) + (data.eval_count || 0),
      },
      latency: Date.now() - startTime,
      provider: this.name,
    };
  }

  async *completeStream(request: CompletionRequest): AsyncGenerator<StreamChunk> {
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: request.model || this.defaultModel,
        messages: request.messages,
        stream: true,
      }),
    });

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value);
      const data = JSON.parse(chunk);
      
      if (data.message) {
        yield {
          id: `ollama-${Date.now()}`,
          choices: [{
            delta: { content: data.message.content },
            index: 0,
          }],
        };
      }
    }
  }

  async healthCheck() {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      const data = await response.json();
      return { healthy: true, modelsAvailable: data.models?.length || 0 };
    } catch {
      return { healthy: false, modelsAvailable: 0 };
    }
  }

  async listModels() {
    const response = await fetch(`${this.baseUrl}/api/tags`);
    const data = await response.json();
    return data.models.map((m: any) => ({
      id: m.name,
      name: m.name,
      contextLength: m.details?.parameter_size || 4096,
      size: m.size,
    }));
  }

  estimateCost(request: CompletionRequest): CostEstimate {
    // Local models are free!
    return {
      inputTokens: this.estimateTokens(request.messages),
      outputTokens: request.maxTokens || 1024,
      estimatedCost: 0,
      currency: 'USD',
    };
  }

  private estimateTokens(messages: Message[]): number {
    const text = messages.map(m => m.content).join(' ');
    return Math.ceil(text.length / 4);
  }
}
```

#### Provider Factory с Fallback Chain

```typescript
// src/providers/provider-factory.ts

import { LLMProvider } from './types';
import { OpenRouterAdapter } from './openrouter-adapter';
import { OllamaAdapter } from './ollama-adapter';
import { TextGenerationWebUIAdapter } from './tgwebui-adapter';

export interface ProviderConfig {
  openrouter?: { apiKey: string; baseUrl: string };
  ollama?: { baseUrl: string; defaultModel: string };
  tgwebui?: { baseUrl: string };
}

export class ProviderFactory {
  private providers: Map<string, LLMProvider> = new Map();
  private fallbackChain: string[] = [];

  async initialize(config: ProviderConfig): Promise<void> {
    // Initialize providers based on config
    if (config.ollama) {
      const ollama = new OllamaAdapter(config.ollama);
      const health = await ollama.healthCheck();
      if (health.healthy) {
        this.providers.set('ollama', ollama);
        this.fallbackChain.push('ollama'); // Prefer local (free!)
      }
    }

    if (config.openrouter) {
      const openrouter = new OpenRouterAdapter(config.openrouter);
      this.providers.set('openrouter', openrouter);
      this.fallbackChain.push('openrouter');
    }

    if (config.tgwebui) {
      const tgwebui = new TextGenerationWebUIAdapter(config.tgwebui);
      const health = await tgwebui.healthCheck();
      if (health.healthy) {
        this.providers.set('tgwebui', tgwebui);
        this.fallbackChain.push('tgwebui');
      }
    }

    console.log(`🔗 Provider fallback chain: ${this.fallbackChain.join(' → ')}`);
  }

  getProvider(name: string): LLMProvider | undefined {
    return this.providers.get(name);
  }

  getFallbackChain(): string[] {
    return [...this.fallbackChain];
  }

  /**
   * Execute with automatic fallback
   */
  async executeWithFallback<T>(
    operation: (provider: LLMProvider) => Promise<T>,
    preferredProvider?: string
  ): Promise<T> {
    const chain = preferredProvider 
      ? [preferredProvider, ...this.fallbackChain.filter(p => p !== preferredProvider)]
      : this.fallbackChain;

    const errors: Error[] = [];

    for (const providerName of chain) {
      const provider = this.providers.get(providerName);
      if (!provider) continue;

      try {
        const health = await provider.healthCheck();
        if (!health.healthy) {
          console.warn(`⚠️ Provider ${providerName} is unhealthy, skipping`);
          continue;
        }

        return await operation(provider);
      } catch (error) {
        console.warn(`⚠️ Provider ${providerName} failed:`, error);
        errors.push(error as Error);
      }
    }

    throw new AggregateError(errors, 'All providers failed');
  }
}
```

---

## 3. Стратегия оптимизации затрат

### 3.1 Semantic Caching

```typescript
// src/cache/semantic-cache.ts

import { createHash } from 'crypto';
import { Redis } from 'ioredis';

interface CacheEntry {
  query: string;
  response: string;
  embedding: number[];
  timestamp: number;
  hits: number;
  model: string;
  tokensSaved: number;
}

export class SemanticCache {
  private redis: Redis | null;
  private localCache: Map<string, CacheEntry> = new Map();
  private similarityThreshold: number;
  private ttlSeconds: number;

  constructor(config?: { 
    redisUrl?: string; 
    similarityThreshold?: number;
    ttlSeconds?: number;
  }) {
    this.similarityThreshold = config?.similarityThreshold || 0.95;
    this.ttlSeconds = config?.ttlSeconds || 3600; // 1 hour

    if (config?.redisUrl) {
      this.redis = new Redis(config.redisUrl);
    } else {
      this.redis = null;
      console.log('📦 Using in-memory semantic cache');
    }
  }

  /**
   * Find similar cached response
   */
  async findSimilar(query: string, embedding?: number[]): Promise<CacheEntry | null> {
    const queryHash = this.hashQuery(query);
    
    // Exact match first
    const exact = await this.get(queryHash);
    if (exact) {
      return exact;
    }

    // Semantic similarity search
    if (embedding) {
      const entries = await this.getAllEntries();
      for (const entry of entries) {
        if (entry.embedding) {
          const similarity = this.cosineSimilarity(embedding, entry.embedding);
          if (similarity >= this.similarityThreshold) {
            console.log(`🎯 Cache hit (similarity: ${similarity.toFixed(3)})`);
            return entry;
          }
        }
      }
    }

    return null;
  }

  /**
   * Store response in cache
   */
  async set(query: string, response: string, metadata: {
    embedding?: number[];
    model: string;
    tokensSaved: number;
  }): Promise<void> {
    const queryHash = this.hashQuery(query);
    const entry: CacheEntry = {
      query,
      response,
      embedding: metadata.embedding || [],
      timestamp: Date.now(),
      hits: 0,
      model: metadata.model,
      tokensSaved: metadata.tokensSaved,
    };

    if (this.redis) {
      await this.redis.setex(
        `cache:${queryHash}`,
        this.ttlSeconds,
        JSON.stringify(entry)
      );
    } else {
      this.localCache.set(queryHash, entry);
      // Limit local cache size
      if (this.localCache.size > 1000) {
        const oldestKey = [...this.localCache.entries()]
          .sort((a, b) => a[1].timestamp - b[1].timestamp)[0][0];
        this.localCache.delete(oldestKey);
      }
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    totalEntries: number;
    totalHits: number;
    tokensSaved: number;
    estimatedSavings: number;
  }> {
    const entries = await this.getAllEntries();
    const totalHits = entries.reduce((sum, e) => sum + e.hits, 0);
    const tokensSaved = entries.reduce((sum, e) => sum + e.tokensSaved, 0);

    return {
      totalEntries: entries.length,
      totalHits,
      tokensSaved,
      estimatedSavings: tokensSaved * 0.00001, // ~$0.01 per 1M tokens
    };
  }

  private hashQuery(query: string): string {
    return createHash('sha256').update(query.toLowerCase().trim()).digest('hex');
  }

  private async get(key: string): Promise<CacheEntry | null> {
    if (this.redis) {
      const data = await this.redis.get(`cache:${key}`);
      return data ? JSON.parse(data) : null;
    }
    return this.localCache.get(key) || null;
  }

  private async getAllEntries(): Promise<CacheEntry[]> {
    if (this.redis) {
      const keys = await this.redis.keys('cache:*');
      const entries = await Promise.all(
        keys.map(k => this.redis!.get(k))
      );
      return entries.filter(Boolean).map(e => JSON.parse(e!));
    }
    return [...this.localCache.values()];
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}
```

### 3.2 RAG для сокращения токенов

```typescript
// src/rag/context-optimizer.ts

import { ProjectKnowledgeGraph } from '../engines/project-knowledge-graph';

export class ContextOptimizer {
  private knowledgeGraph: ProjectKnowledgeGraph;
  private maxContextTokens: number;

  constructor(knowledgeGraph: ProjectKnowledgeGraph, maxTokens = 4000) {
    this.knowledgeGraph = knowledgeGraph;
    this.maxContextTokens = maxTokens;
  }

  /**
   * Optimize context for LLM request
   * Returns compressed, relevant context only
   */
  async optimizeContext(query: string, filePaths?: string[]): Promise<{
    context: string;
    tokensUsed: number;
    sources: string[];
  }> {
    // 1. Find relevant code snippets
    const relevantCode = await this.findRelevantCode(query, filePaths);
    
    // 2. Build compressed context
    const context = this.buildCompressedContext(relevantCode);
    
    // 3. Estimate tokens
    const tokensUsed = this.estimateTokens(context);

    return {
      context,
      tokensUsed,
      sources: relevantCode.map(c => c.path),
    };
  }

  private async findRelevantCode(query: string, filePaths?: string[]): Promise<CodeSnippet[]> {
    // Use knowledge graph to find relevant code
    const relevantNodes = await this.knowledgeGraph.findRelevantNodes(query);
    
    // Prioritize based on relevance score
    const snippets = relevantNodes
      .filter(node => !filePaths || filePaths.some(p => node.path.includes(p)))
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 10) // Top 10 most relevant
      .map(node => ({
        path: node.path,
        content: this.extractRelevantSection(node.content, query),
        relevanceScore: node.relevanceScore,
      }));

    return snippets;
  }

  private buildCompressedContext(snippets: CodeSnippet[]): string {
    const parts: string[] = ['## Relevant Code Context\n'];
    
    for (const snippet of snippets) {
      parts.push(`### ${snippet.path}`);
      parts.push('```');
      parts.push(snippet.content);
      parts.push('```\n');
    }

    return parts.join('\n');
  }

  private extractRelevantSection(content: string, query: string): string {
    // Extract function/class definitions that match query
    const lines = content.split('\n');
    const relevantLines: string[] = [];
    let inRelevantBlock = false;
    let braceCount = 0;

    const queryTerms = query.toLowerCase().split(/\s+/);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lowerLine = line.toLowerCase();

      // Check if line contains query terms
      if (queryTerms.some(term => lowerLine.includes(term))) {
        // Find start of block
        let startLine = i;
        while (startLine > 0 && !this.isBlockStart(lines[startLine - 1])) {
          startLine--;
        }
        inRelevantBlock = true;
        relevantLines.push(...lines.slice(startLine, i + 1));
      }
    }

    // Limit to reasonable size
    const result = relevantLines.join('\n');
    if (result.length > 2000) {
      return result.substring(0, 2000) + '\n// ... truncated';
    }
    return result || content.substring(0, 1000);
  }

  private isBlockStart(line: string): boolean {
    return /^\s*(function|class|interface|type|const|let|var|export)/.test(line);
  }

  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }
}

interface CodeSnippet {
  path: string;
  content: string;
  relevanceScore: number;
}
```

### 3.3 Enhanced Usage Tracker

```typescript
// src/engines/enhanced-usage-tracker.ts

import fs from 'fs/promises';
import path from 'path';

interface UsageRecord {
  timestamp: number;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  latency: number;
  cached: boolean;
  taskType: string;
}

interface BudgetConfig {
  dailyLimit: number;    // in USD
  monthlyLimit: number;  // in USD
  alertThresholds: number[]; // e.g., [0.5, 0.75, 0.9, 1.0]
}

export class EnhancedUsageTracker {
  private records: UsageRecord[] = [];
  private budgetConfig: BudgetConfig;
  private currentSpend: { daily: number; monthly: number } = { daily: 0, monthly: 0 };
  private logFilePath: string;

  constructor(config: BudgetConfig, logFilePath = './usage-log.json') {
    this.budgetConfig = config;
    this.logFilePath = logFilePath;
    this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      const data = await fs.readFile(this.logFilePath, 'utf-8');
      this.records = JSON.parse(data);
      this.recalculateSpend();
    } catch {
      this.records = [];
    }
  }

  /**
   * Record a usage event
   */
  async recordUsage(record: UsageRecord): Promise<void> {
    this.records.push(record);
    this.currentSpend.daily += record.cost;
    this.currentSpend.monthly += record.cost;

    // Check budget thresholds
    await this.checkBudgetThresholds();

    // Persist
    await this.persist();
  }

  /**
   * Check if request should be allowed
   */
  canMakeRequest(estimatedCost: number): { allowed: boolean; reason?: string } {
    if (this.currentSpend.daily + estimatedCost > this.budgetConfig.dailyLimit) {
      return { allowed: false, reason: 'Daily budget exceeded' };
    }
    if (this.currentSpend.monthly + estimatedCost > this.budgetConfig.monthlyLimit) {
      return { allowed: false, reason: 'Monthly budget exceeded' };
    }
    return { allowed: true };
  }

  /**
   * Get usage statistics
   */
  getStats(): {
    daily: { spend: number; limit: number; remaining: number };
    monthly: { spend: number; limit: number; remaining: number };
    byProvider: Record<string, { requests: number; spend: number }>;
    byModel: Record<string, { requests: number; spend: number; avgLatency: number }>;
    cacheHitRate: number;
  } {
    const now = Date.now();
    const dayAgo = now - 24 * 60 * 60 * 1000;
    const monthAgo = now - 30 * 24 * 60 * 60 * 1000;

    const dailyRecords = this.records.filter(r => r.timestamp > dayAgo);
    const monthlyRecords = this.records.filter(r => r.timestamp > monthAgo);

    const byProvider: Record<string, { requests: number; spend: number }> = {};
    const byModel: Record<string, { requests: number; spend: number; latencies: number[] }> = {};

    for (const record of monthlyRecords) {
      if (!byProvider[record.provider]) {
        byProvider[record.provider] = { requests: 0, spend: 0 };
      }
      byProvider[record.provider].requests++;
      byProvider[record.provider].spend += record.cost;

      if (!byModel[record.model]) {
        byModel[record.model] = { requests: 0, spend: 0, latencies: [] };
      }
      byModel[record.model].requests++;
      byModel[record.model].spend += record.cost;
      byModel[record.model].latencies.push(record.latency);
    }

    const cacheHits = monthlyRecords.filter(r => r.cached).length;
    const cacheHitRate = monthlyRecords.length > 0 ? cacheHits / monthlyRecords.length : 0;

    return {
      daily: {
        spend: this.currentSpend.daily,
        limit: this.budgetConfig.dailyLimit,
        remaining: Math.max(0, this.budgetConfig.dailyLimit - this.currentSpend.daily),
      },
      monthly: {
        spend: this.currentSpend.monthly,
        limit: this.budgetConfig.monthlyLimit,
        remaining: Math.max(0, this.budgetConfig.monthlyLimit - this.currentSpend.monthly),
      },
      byProvider,
      byModel: Object.fromEntries(
        Object.entries(byModel).map(([model, data]) => [
          model,
          {
            requests: data.requests,
            spend: data.spend,
            avgLatency: data.latencies.reduce((a, b) => a + b, 0) / data.latencies.length,
          },
        ])
      ),
      cacheHitRate,
    };
  }

  private async checkBudgetThresholds(): Promise<void> {
    const dailyPercent = this.currentSpend.daily / this.budgetConfig.dailyLimit;
    const monthlyPercent = this.currentSpend.monthly / this.budgetConfig.monthlyLimit;

    for (const threshold of this.budgetConfig.alertThresholds) {
      if (dailyPercent >= threshold && monthlyPercent >= threshold) {
        console.warn(`💰 Budget alert: ${threshold * 100}% of budget used`);
        // In production: send notification
      }
    }
  }

  private recalculateSpend(): void {
    const now = Date.now();
    const dayAgo = now - 24 * 60 * 60 * 1000;
    const monthAgo = now - 30 * 24 * 60 * 60 * 1000;

    this.currentSpend.daily = this.records
      .filter(r => r.timestamp > dayAgo)
      .reduce((sum, r) => sum + r.cost, 0);

    this.currentSpend.monthly = this.records
      .filter(r => r.timestamp > monthAgo)
      .reduce((sum, r) => sum + r.cost, 0);
  }

  private async persist(): Promise<void> {
    await fs.writeFile(this.logFilePath, JSON.stringify(this.records, null, 2));
  }
}
```

---

## 4. Безопасность

### 4.1 Интеграция с macOS Keychain

```typescript
// src/security/keychain-manager.ts

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class KeychainManager {
  private serviceName: string;

  constructor(serviceName = 'com.cel.llm-proxy') {
    this.serviceName = serviceName;
  }

  /**
   * Store API key in macOS Keychain
   */
  async storeApiKey(provider: string, apiKey: string): Promise<void> {
    const account = `api-key-${provider}`;
    
    // First, delete existing entry if any
    try {
      await execAsync(`security delete-generic-password -a "${account}" -s "${this.serviceName}" 2>/dev/null`);
    } catch {
      // Ignore if not found
    }

    // Store new key
    await execAsync(
      `security add-generic-password -a "${account}" -s "${this.serviceName}" -w "${apiKey}"`
    );

    console.log(`🔐 Stored API key for ${provider} in Keychain`);
  }

  /**
   * Retrieve API key from macOS Keychain
   */
  async getApiKey(provider: string): Promise<string | null> {
    const account = `api-key-${provider}`;

    try {
      const { stdout } = await execAsync(
        `security find-generic-password -a "${account}" -s "${this.serviceName}" -w`
      );
      return stdout.trim();
    } catch (error) {
      console.warn(`⚠️ API key for ${provider} not found in Keychain`);
      return null;
    }
  }

  /**
   * Delete API key from Keychain
   */
  async deleteApiKey(provider: string): Promise<void> {
    const account = `api-key-${provider}`;

    try {
      await execAsync(`security delete-generic-password -a "${account}" -s "${this.serviceName}"`);
      console.log(`🗑️ Deleted API key for ${provider} from Keychain`);
    } catch {
      // Ignore if not found
    }
  }

  /**
   * List all stored providers
   */
  async listStoredProviders(): Promise<string[]> {
    try {
      const { stdout } = await execAsync(
        `security find-generic-password -s "${this.serviceName}" 2>&1 | grep "acct"`
      );
      
      const matches = stdout.matchAll(/"acct"<blob>="([^"]+)"/g);
      const providers: string[] = [];
      
      for (const match of matches) {
        const account = match[1];
        if (account.startsWith('api-key-')) {
          providers.push(account.replace('api-key-', ''));
        }
      }
      
      return providers;
    } catch {
      return [];
    }
  }
}
```

### 4.2 Vault Integration (для production)

```typescript
// src/security/vault-manager.ts

import axios from 'axios';

interface VaultConfig {
  address: string;
  token: string;
  secretPath: string;
}

export class VaultManager {
  private config: VaultConfig;
  private cache: Map<string, { value: string; leaseId: string; expiresAt: number }> = new Map();

  constructor(config: VaultConfig) {
    this.config = config;
  }

  /**
   * Get secret from Vault with automatic renewal
   */
  async getSecret(key: string): Promise<string> {
    // Check cache first
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    // Fetch from Vault
    const response = await axios.get(
      `${this.config.address}/v1/${this.config.secretPath}/${key}`,
      {
        headers: { 'X-Vault-Token': this.config.token },
      }
    );

    const { data, lease_duration } = response.data;
    const value = data.value || data[key];

    // Cache with renewal
    this.cache.set(key, {
      value,
      leaseId: response.data.lease_id,
      expiresAt: Date.now() + (lease_duration - 60) * 1000, // Renew 1 min before expiry
    });

    return value;
  }

  /**
   * Store secret in Vault
   */
  async setSecret(key: string, value: string): Promise<void> {
    await axios.post(
      `${this.config.address}/v1/${this.config.secretPath}/${key}`,
      { value },
      {
        headers: { 'X-Vault-Token': this.config.token },
      }
    );
  }

  /**
   * Renew lease for dynamic secrets
   */
  async renewLease(key: string): Promise<void> {
    const cached = this.cache.get(key);
    if (!cached?.leaseId) return;

    await axios.put(
      `${this.config.address}/v1/sys/leases/renew`,
      { lease_id: cached.leaseId, increment: 3600 },
      {
        headers: { 'X-Vault-Token': this.config.token },
      }
    );
  }
}
```

### 4.3 Secrets Manager Factory

```typescript
// src/security/secrets-manager.ts

import { KeychainManager } from './keychain-manager';
import { VaultManager } from './vault-manager';

export type SecretsBackend = 'keychain' | 'vault' | 'env';

export class SecretsManager {
  private backend: KeychainManager | VaultManager | null = null;
  private backendType: SecretsBackend;

  constructor(config: {
    backend: SecretsBackend;
    vaultConfig?: { address: string; token: string; secretPath: string };
  }) {
    this.backendType = config.backend;

    switch (config.backend) {
      case 'keychain':
        this.backend = new KeychainManager();
        break;
      case 'vault':
        if (!config.vaultConfig) {
          throw new Error('Vault config required for vault backend');
        }
        this.backend = new VaultManager(config.vaultConfig);
        break;
      case 'env':
        // No backend needed, use process.env directly
        break;
    }
  }

  async getApiKey(provider: string): Promise<string | null> {
    switch (this.backendType) {
      case 'keychain':
        return (this.backend as KeychainManager).getApiKey(provider);
      case 'vault':
        return (this.backend as VaultManager).getSecret(`api-keys/${provider}`);
      case 'env':
        return process.env[`${provider.toUpperCase()}_API_KEY`] || null;
    }
  }

  async setApiKey(provider: string, key: string): Promise<void> {
    switch (this.backendType) {
      case 'keychain':
        return (this.backend as KeychainManager).storeApiKey(provider, key);
      case 'vault':
        return (this.backend as VaultManager).setSecret(`api-keys/${provider}`, key);
      case 'env':
        throw new Error('Cannot set environment variables at runtime');
    }
  }
}
```

---

## 5. Интеграция с Xcode

### 5.1 Swift Client

```swift
// Sources/CELClient/CELClient.swift

import Foundation
import Combine

/// CEL API Client for Xcode integration
public class CELClient: ObservableObject {
    private let baseURL: URL
    private let session: URLSession
    private let apiKey: String?
    
    @Published public var isConnected: Bool = false
    @Published public var lastError: Error?
    
    public init(baseURL: URL, apiKey: String? = nil) {
        self.baseURL = baseURL
        self.apiKey = apiKey
        
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 60
        config.timeoutIntervalForResource = 300
        self.session = URLSession(configuration: config)
        
        Task {
            await checkConnection()
        }
    }
    
    // MARK: - Connection
    
    public func checkConnection() async {
        do {
            let health = try await healthCheck()
            await MainActor.run {
                self.isConnected = health.status == "ok"
            }
        } catch {
            await MainActor.run {
                self.isConnected = false
                self.lastError = error
            }
        }
    }
    
    // MARK: - Chat Completions
    
    public func complete(
        messages: [Message],
        model: String? = nil,
        temperature: Double = 0.7,
        maxTokens: Int = 1024
    ) async throws -> CompletionResponse {
        var request = URLRequest(url: baseURL.appendingPathComponent("v1/chat/completions"))
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        if let apiKey = apiKey {
            request.setValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")
        }
        
        let body: [String: Any] = [
            "messages": messages.map { ["role": $0.role, "content": $0.content] },
            "model": model ?? "auto",
            "temperature": temperature,
            "max_tokens": maxTokens,
            "stream": false
        ]
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        
        let (data, response) = try await session.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw CELError.invalidResponse
        }
        
        guard httpResponse.statusCode == 200 else {
            let errorData = try? JSONDecoder().decode(ErrorResponse.self, from: data)
            throw CELError.apiError(errorData?.error.message ?? "Unknown error")
        }
        
        return try JSONDecoder().decode(CompletionResponse.self, from: data)
    }
    
    // MARK: - Streaming
    
    public func completeStream(
        messages: [Message],
        model: String? = nil,
        temperature: Double = 0.7,
        maxTokens: Int = 1024
    ) -> AsyncThrowingStream<StreamChunk, Error> {
        AsyncThrowingStream { continuation in
            Task {
                var request = URLRequest(url: baseURL.appendingPathComponent("v1/chat/completions"))
                request.httpMethod = "POST"
                request.setValue("application/json", forHTTPHeaderField: "Content-Type")
                request.setValue("text/event-stream", forHTTPHeaderField: "Accept")
                
                if let apiKey = apiKey {
                    request.setValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")
                }
                
                let body: [String: Any] = [
                    "messages": messages.map { ["role": $0.role, "content": $0.content] },
                    "model": model ?? "auto",
                    "temperature": temperature,
                    "max_tokens": maxTokens,
                    "stream": true
                ]
                request.httpBody = try JSONSerialization.data(withJSONObject: body)
                
                let (bytes, response) = try await session.bytes(for: request)
                
                guard let httpResponse = response as? HTTPURLResponse,
                      httpResponse.statusCode == 200 else {
                    continuation.finish(throwing: CELError.invalidResponse)
                    return
                }
                
                var buffer = ""
                for try await byte in bytes {
                    let char = Character(UnicodeScalar(byte))
                    buffer.append(char)
                    
                    if buffer.hasSuffix("\n\n") {
                        let lines = buffer.split(separator: "\n")
                        for line in lines {
                            if line.hasPrefix("data: ") {
                                let dataStr = String(line.dropFirst(6))
                                if dataStr == "[DONE]" {
                                    continuation.finish()
                                    return
                                }
                                if let data = dataStr.data(using: .utf8),
                                   let chunk = try? JSONDecoder().decode(StreamChunk.self, from: data) {
                                    continuation.yield(chunk)
                                }
                            }
                        }
                        buffer = ""
                    }
                }
                continuation.finish()
            }
        }
    }
    
    // MARK: - Code Assist
    
    public func codeAssist(
        file: String,
        selection: String? = nil,
        messages: [Message]? = nil
    ) async throws -> CompletionResponse {
        var request = URLRequest(url: baseURL.appendingPathComponent("v1/code-assist"))
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        var body: [String: Any] = ["file": file]
        if let selection = selection {
            body["selection"] = selection
        }
        if let messages = messages {
            body["messages"] = messages.map { ["role": $0.role, "content": $0.content] }
        }
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        
        let (data, response) = try await session.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 200 else {
            throw CELError.invalidResponse
        }
        
        return try JSONDecoder().decode(CompletionResponse.self, from: data)
    }
    
    // MARK: - Health Check
    
    public func healthCheck() async throws -> HealthResponse {
        var request = URLRequest(url: baseURL.appendingPathComponent("health"))
        request.httpMethod = "GET"
        
        let (data, _) = try await session.data(for: request)
        return try JSONDecoder().decode(HealthResponse.self, from: data)
    }
    
    // MARK: - Models
    
    public func listModels() async throws -> ModelsResponse {
        var request = URLRequest(url: baseURL.appendingPathComponent("v1/models"))
        request.httpMethod = "GET"
        
        let (data, _) = try await session.data(for: request)
        return try JSONDecoder().decode(ModelsResponse.self, from: data)
    }
}

// MARK: - Models

public struct Message: Codable {
    public let role: String
    public let content: String
    
    public init(role: String, content: String) {
        self.role = role
        self.content = content
    }
}

public struct CompletionResponse: Codable {
    public let id: String
    public let model: String
    public let choices: [Choice]
    public let usage: Usage
    
    public var content: String? {
        choices.first?.message.content
    }
}

public struct Choice: Codable {
    public let index: Int
    public let message: Message
    public let finishReason: String?
    
    enum CodingKeys: String, CodingKey {
        case index, message
        case finishReason = "finish_reason"
    }
}

public struct Usage: Codable {
    public let promptTokens: Int
    public let completionTokens: Int
    public let totalTokens: Int
    
    enum CodingKeys: String, CodingKey {
        case promptTokens = "prompt_tokens"
        case completionTokens = "completion_tokens"
        case totalTokens = "total_tokens"
    }
}

public struct StreamChunk: Codable {
    public let id: String
    public let choices: [StreamChoice]
}

public struct StreamChoice: Codable {
    public let index: Int
    public let delta: Delta
    public let finishReason: String?
    
    enum CodingKeys: String, CodingKey {
        case index, delta
        case finishReason = "finish_reason"
    }
}

public struct Delta: Codable {
    public let role: String?
    public let content: String?
}

public struct HealthResponse: Codable {
    public let status: String
    public let usage: UsageStats?
}

public struct UsageStats: Codable {
    public let totalRequests: Int
    public let totalTokensUsed: Int
}

public struct ModelsResponse: Codable {
    public let data: [ModelInfo]
}

public struct ModelInfo: Codable {
    public let id: String
    public let ownedBy: String
    
    enum CodingKeys: String, CodingKey {
        case id
        case ownedBy = "owned_by"
    }
}

public struct ErrorResponse: Codable {
    public let error: ErrorDetail
    
    public struct ErrorDetail: Codable {
        public let message: String
        public let type: String
    }
}

public enum CELError: Error, LocalizedError {
    case invalidResponse
    case apiError(String)
    case networkError(Error)
    
    public var errorDescription: String? {
        switch self {
        case .invalidResponse:
            return "Invalid response from server"
        case .apiError(let message):
            return message
        case .networkError(let error):
            return "Network error: \(error.localizedDescription)"
        }
    }
}
```

### 5.2 Xcode Extension Integration

```swift
// Sources/CELXcodeExtension/SourceEditorExtension.swift

import XcodeKit
import CELClient

class SourceEditorExtension: XCSourceEditorExtension {
    var commandDefinitions: [[XCSourceEditorCommandDefinitionKey: Any]] {
        return [
            [
                .identifierKey: "com.cel.explain",
                .classNameKey: ExplainCommand.self,
                .nameKey: "Explain Code"
            ],
            [
                .identifierKey: "com.cel.refactor",
                .classNameKey: RefactorCommand.self,
                .nameKey: "Refactor Code"
            ],
            [
                .identifierKey: "com.cel.document",
                .classNameKey: DocumentCommand.self,
                .nameKey: "Add Documentation"
            ]
        ]
    }
}

// MARK: - Base Command

class BaseCommand: NSObject, XCSourceEditorCommand {
    let client: CELClient
    
    override init() {
        self.client = CELClient(baseURL: URL(string: "http://127.0.0.1:3000")!)
        super.init()
    }
    
    func perform(with invocation: XCSourceEditorCommandInvocation, 
                 completionHandler: @escaping (Error?) -> Void) {
        // Override in subclasses
        completionHandler(nil)
    }
    
    func getSelectedText(_ invocation: XCSourceEditorCommandInvocation) -> String? {
        guard let selection = invocation.buffer.selections.firstObject as? XCSourceTextRange else {
            return nil
        }
        
        let startLine = selection.start.line
        let endLine = selection.end.line
        
        var selectedText = ""
        for line in startLine...endLine {
            if let lineContent = invocation.buffer.lines[line] as? String {
                selectedText += lineContent
            }
        }
        
        return selectedText.isEmpty ? nil : selectedText
    }
    
    func getFilePath(_ invocation: XCSourceEditorCommandInvocation) -> String {
        return invocation.buffer.contentIdentifier ?? "unknown.swift"
    }
}

// MARK: - Explain Command

class ExplainCommand: BaseCommand {
    override func perform(with invocation: XCSourceEditorCommandInvocation,
                         completionHandler: @escaping (Error?) -> Void) {
        guard let selectedText = getSelectedText(invocation) else {
            completionHandler(NSError(domain: "CEL", code: 1, userInfo: [NSLocalizedDescriptionKey: "No text selected"]))
            return
        }
        
        let filePath = getFilePath(invocation)
        
        Task {
            do {
                let response = try await client.codeAssist(
                    file: filePath,
                    selection: selectedText,
                    messages: [Message(role: "user", content: "Explain this code:")]
                )
                
                // Show explanation in a new window or as a comment
                if let explanation = response.content {
                    await MainActor.run {
                        // Insert as comment above selection
                        let commentLines = explanation.split(separator: "\n").map { "// \($0)" }
                        let comment = commentLines.joined(separator: "\n")
                        
                        if let selection = invocation.buffer.selections.firstObject as? XCSourceTextRange {
                            invocation.buffer.lines.insert(comment, at: selection.start.line)
                        }
                    }
                }
                completionHandler(nil)
            } catch {
                completionHandler(error)
            }
        }
    }
}

// MARK: - Refactor Command

class RefactorCommand: BaseCommand {
    override func perform(with invocation: XCSourceEditorCommandInvocation,
                         completionHandler: @escaping (Error?) -> Void) {
        guard let selectedText = getSelectedText(invocation) else {
            completionHandler(NSError(domain: "CEL", code: 1, userInfo: [NSLocalizedDescriptionKey: "No text selected"]))
            return
        }
        
        let filePath = getFilePath(invocation)
        
        Task {
            do {
                let response = try await client.codeAssist(
                    file: filePath,
                    selection: selectedText,
                    messages: [Message(role: "user", content: "Refactor this code for better readability and performance:")]
                )
                
                if let refactored = response.content {
                    await MainActor.run {
                        // Replace selection with refactored code
                        if let selection = invocation.buffer.selections.firstObject as? XCSourceTextRange {
                            // Remove existing lines
                            for _ in selection.start.line...selection.end.line {
                                invocation.buffer.lines.removeObject(at: selection.start.line)
                            }
                            // Insert new lines
                            let newLines = refactored.split(separator: "\n")
                            for (index, line) in newLines.enumerated() {
                                invocation.buffer.lines.insert(String(line), at: selection.start.line + index)
                            }
                        }
                    }
                }
                completionHandler(nil)
            } catch {
                completionHandler(error)
            }
        }
    }
}
```

---

## 6. Дорожная карта

### Phase 1: Stabilization (2-3 недели)

| Задача | Приоритет | Оценка | Риски |
|--------|-----------|--------|-------|
| Исправить тесты | 🔴 Critical | 3 дня | Зависимости между тестами |
| Модульная архитектура | 🔴 Critical | 1 неделя | Регрессия API |
| ProviderAdapter pattern | 🟡 High | 3 дня | Совместимость с OpenRouter |
| CI/CD pipeline | 🟡 High | 2 дня | Настройка окружения |

### Phase 2: Security (1-2 недели)

| Задача | Приоритет | Оценка | Риски |
|--------|-----------|--------|-------|
| Keychain integration | 🔴 Critical | 2 дня | macOS-specific |
| Vault support | 🟡 High | 3 дня | Infrastructure |
| Input validation | 🟡 High | 2 дня | Performance |
| Security audit | 🟡 High | 2 дня | External dependency |

### Phase 3: Scaling (2-3 недели)

| Задача | Приоритет | Оценка | Риски |
|--------|-----------|--------|-------|
| Semantic caching | 🟡 High | 1 неделя | Redis dependency |
| RAG implementation | 🟡 High | 1 неделя | Embedding quality |
| Swift client | 🟡 High | 1 неделя | Xcode compatibility |
| Xcode extension | 🟢 Medium | 1 неделя | App Store review |

### Риски и митигация

| Риск | Вероятность | Влияние | Митигация |
|------|-------------|---------|-----------|
| OpenRouter API changes | Medium | High | ProviderAdapter abstraction |
| Free model availability | High | Medium | Fallback chain, local models |
| Security vulnerabilities | Low | Critical | Regular audits, penetration testing |
| Performance degradation | Medium | Medium | Caching, connection pooling |

---

## Заключение

Проект CEL v4.2.0 имеет хороший потенциал, но требует значительных улучшений в архитектуре и безопасности. Ключевые рекомендации:

1. **Немедленно:** Исправить тесты, внедрить ProviderAdapter pattern
2. **Краткосрочно:** Интеграция с Keychain, semantic caching
3. **Среднесрочно:** Swift клиент для Xcode, RAG для оптимизации токенов

При следовании дорожной карте проект может стать production-ready за 6-8 недель.

---

*Аудит подготовлен: 2026-02-20*
