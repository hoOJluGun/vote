export interface CLIOptions {
  verbose?: boolean;
  apiKey?: string;
  model?: string;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatHistory {
  user: string;
  ai: string;
  timestamp: string;
}

export interface CodeGenerationOptions {
  type?: string;
  language?: string;
  output?: string;
}

export interface RefactorOptions {
  target?: string;
  backup?: boolean;
}

export interface TestGenerationResult {
  success: boolean;
  tests: string;
  count: number;
  error?: string;
}

export interface GitChanges {
  modified: string[];
  added: string[];
  deleted: string[];
}

export interface CommitMessage {
  type: string;
  scope?: string;
  subject: string;
  body?: string;
  footer?: string;
}

export interface SystemStatus {
  version: string;
  uptime: string;
  connected: boolean;
  performance: string;
  models: string[];
}