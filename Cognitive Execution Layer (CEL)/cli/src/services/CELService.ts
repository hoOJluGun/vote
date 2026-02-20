import fetch from 'node-fetch';
import { ChatMessage, TestGenerationResult, GitChanges, CommitMessage } from '../types';

export class CELService {
  private readonly baseUrl: string;
  private readonly defaultModel: string;

  constructor(baseUrl: string = 'http://localhost:3000', defaultModel: string = 'upstage/solar-pro-3:free') {
    this.baseUrl = baseUrl;
    this.defaultModel = defaultModel;
  }

  async chat(messages: ChatMessage[], model?: string): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages,
          model: model || this.defaultModel,
          max_tokens: 2048,
          temperature: 0.7
        })
      });

      if (!response.ok) {
        throw new Error(`CEL API error: ${response.status} ${response.statusText}`);
      }

      const data: any = await response.json();
      return data.choices[0].message.content;
    } catch (error: any) {
      throw new Error(`Failed to communicate with CEL: ${error.message}`);
    }
  }

  async generateCode(description: string, context?: string): Promise<string> {
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: 'You are a code generation expert. Generate clean, well-documented code based on the description.'
      },
      {
        role: 'user',
        content: `Generate code for: ${description}${context ? `\n\nContext: ${context}` : ''}`
      }
    ];

    return await this.chat(messages);
  }

  async refactorCode(code: string, targetImprovements?: string): Promise<string> {
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: 'You are a code refactoring expert. Improve the code for readability, performance, and maintainability.'
      },
      {
        role: 'user',
        content: `Refactor this code:${targetImprovements ? `\nTarget improvements: ${targetImprovements}` : ''}\n\n${code}`
      }
    ];

    return await this.chat(messages);
  }

  async explainCode(code: string, filePath?: string): Promise<string> {
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: 'You are a code explanation expert. Provide detailed, clear explanations of code functionality.'
      },
      {
        role: 'user',
        content: `Explain this code${filePath ? ` from ${filePath}` : ''}:\n\n${code}`
      }
    ];

    return await this.chat(messages);
  }

  async generateTests(fileContent: string, fileName: string): Promise<TestGenerationResult> {
    try {
      const messages: ChatMessage[] = [
        {
          role: 'system',
          content: 'You are a test generation expert. Create comprehensive unit tests with high coverage.'
        },
        {
          role: 'user',
          content: `Generate comprehensive tests for this code in ${fileName}:\n\n${fileContent}`
        }
      ];

      const tests = await this.chat(messages);
      
      return {
        success: true,
        tests,
        count: tests.match(/test\(|it\(|describe\(/g)?.length || 0
      };
    } catch (error: any) {
      return {
        success: false,
        tests: '',
        count: 0,
        error: error.message
      };
    }
  }

  async analyzeGitChanges(changes: GitChanges): Promise<CommitMessage> {
    const changesSummary = [
      `Modified: ${changes.modified.join(', ') || 'none'}`,
      `Added: ${changes.added.join(', ') || 'none'}`,
      `Deleted: ${changes.deleted.join(', ') || 'none'}`
    ].join('\n');

    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: 'You are a commit message expert following conventional commits format. Generate concise, informative commit messages.'
      },
      {
        role: 'user',
        content: `Generate a conventional commit message for these changes:\n\n${changesSummary}`
      }
    ];

    const response = await this.chat(messages);
    
    // Parse conventional commit format
    const match = response.match(/^(\w+)(?:\(([^)]+)\))?:\s*(.+)$/);
    if (match) {
      return {
        type: match[1],
        scope: match[2] || undefined,
        subject: match[3]
      };
    }

    return {
      type: 'chore',
      subject: response.trim()
    };
  }

  async getStatus(): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      if (!response.ok) {
        throw new Error('Unable to fetch status');
      }
      return await response.json();
    } catch (error: any) {
      throw new Error(`Failed to get status: ${error.message}`);
    }
  }

  async sendMessage(options: { message: string; model?: string }): Promise<{ content: string }> {
    const messages: ChatMessage[] = [
      {
        role: 'user',
        content: options.message
      }
    ];

    const content = await this.chat(messages, options.model);
    return { content };
  }
}