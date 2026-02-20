import { GitAnalyzer, GitChange, DiffStats } from '../utils/git.js';
import { CELService } from './CELService.js';

export interface CommitAnalysis {
  type: 'feat' | 'fix' | 'docs' | 'style' | 'refactor' | 'test' | 'chore' | 'perf' | 'build' | 'ci';
  scope?: string;
  subject: string;
  body?: string;
  breakingChanges?: string[];
  fileList: string[];
  stats: DiffStats;
}

export interface CommitMessageOptions {
  conventional?: boolean;
  maxLength?: number;
  includeStats?: boolean;
  dryRun?: boolean;
}

export class GitCommitService {
  private gitAnalyzer: GitAnalyzer;
  private celService: CELService;

  constructor(gitAnalyzer: GitAnalyzer, celService: CELService) {
    this.gitAnalyzer = gitAnalyzer;
    this.celService = celService;
  }

  /**
   * Analyze staged changes and generate smart commit message
   */
  async generateCommitMessage(options: CommitMessageOptions = {}): Promise<string> {
    const changes = await this.gitAnalyzer.getStagedChanges();
    
    if (changes.length === 0) {
      throw new Error('No staged changes found. Please stage your changes first.');
    }

    const analysis = await this.analyzeChanges(changes);
    return this.formatCommitMessage(analysis, options);
  }

  /**
   * Analyze changes using AI to determine commit type and message
   */
  private async analyzeChanges(changes: GitChange[]): Promise<CommitAnalysis> {
    const prompt = this.createAnalysisPrompt(changes);
    
    try {
      const response = await this.celService.sendMessage({
        message: prompt,
        model: 'openrouter/deepseek/deepseek-chat'
      });

      return this.parseAnalysisResponse(response.content, changes);
    } catch (error) {
      console.warn('AI analysis failed, falling back to rule-based analysis:', error);
      return this.fallbackAnalysis(changes);
    }
  }

  /**
   * Create prompt for AI analysis
   */
  private createAnalysisPrompt(changes: GitChange[]): string {
    const changesSummary = changes.map(change => 
      `${change.status} ${change.file}: ${change.additions} additions, ${change.deletions} deletions`
    ).join('\n');

    return `Analyze these Git changes and provide a commit message analysis in JSON format:

${changesSummary}

Respond with JSON containing:
{
  "type": "feat|fix|docs|style|refactor|test|chore|perf|build|ci",
  "scope": "optional scope",
  "subject": "concise commit subject",
  "body": "detailed explanation if needed",
  "breakingChanges": ["array of breaking changes if any"]
}`;
  }

  /**
   * Parse AI response into structured analysis
   */
  private parseAnalysisResponse(response: string, changes: GitChange[]): CommitAnalysis {
    try {
      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      return {
        type: parsed.type || 'chore',
        scope: parsed.scope,
        subject: parsed.subject || 'Update files',
        body: parsed.body,
        breakingChanges: parsed.breakingChanges || [],
        fileList: changes.map(c => c.file),
        stats: {
          filesChanged: changes.length,
          insertions: changes.reduce((sum, c) => sum + c.additions, 0),
          deletions: changes.reduce((sum, c) => sum + c.deletions, 0)
        }
      };
    } catch (error) {
      console.warn('Failed to parse AI response, using fallback:', error);
      return this.fallbackAnalysis(changes);
    }
  }

  /**
   * Rule-based fallback analysis when AI fails
   */
  private fallbackAnalysis(changes: GitChange[]): CommitAnalysis {
    const stats = {
      filesChanged: changes.length,
      insertions: changes.reduce((sum, c) => sum + c.additions, 0),
      deletions: changes.reduce((sum, c) => sum + c.deletions, 0)
    };

    // Simple heuristic-based classification
    let type: CommitAnalysis['type'] = 'chore';
    let subject = 'Update files';

    const fileTypes = changes.flatMap(c => c.file.split('.').pop() || []);
    const hasTests = fileTypes.some(ext => ['test', 'spec'].some(t => ext.includes(t)));
    const hasDocs = changes.some(c => c.file.includes('README') || c.file.includes('docs'));
    const hasConfig = changes.some(c => c.file.includes('package.json') || c.file.includes('config'));

    if (hasTests) {
      type = 'test';
      subject = 'Add/update tests';
    } else if (hasDocs) {
      type = 'docs';
      subject = 'Update documentation';
    } else if (hasConfig) {
      type = 'chore';
      subject = 'Update configuration';
    } else if (stats.insertions > stats.deletions * 2) {
      type = 'feat';
      subject = 'Add new features';
    } else if (stats.deletions > stats.insertions * 2) {
      type = 'refactor';
      subject = 'Refactor code';
    } else {
      type = 'fix';
      subject = 'Fix issues';
    }

    return {
      type,
      subject,
      fileList: changes.map(c => c.file),
      stats
    };
  }

  /**
   * Format commit message according to options
   */
  private formatCommitMessage(analysis: CommitAnalysis, options: CommitMessageOptions): string {
    const { conventional = true, maxLength = 72, includeStats = false } = options;
    
    let message = '';
    
    if (conventional) {
      // Conventional commit format
      message = analysis.type;
      if (analysis.scope) {
        message += `(${analysis.scope})`;
      }
      message += `: ${analysis.subject}`;
    } else {
      // Simple format
      message = analysis.subject;
    }

    // Truncate if too long
    if (message.length > maxLength) {
      message = message.substring(0, maxLength - 3) + '...';
    }

    // Add body if present and there's space
    if (analysis.body && message.length + analysis.body.length + 2 <= 1000) {
      message += `\n\n${analysis.body}`;
    }

    // Add breaking changes
    if (analysis.breakingChanges && analysis.breakingChanges.length > 0) {
      message += `\n\nBREAKING CHANGE: ${analysis.breakingChanges.join('; ')}`;
    }

    // Add stats footer
    if (includeStats) {
      message += `\n\n${this.formatStatsFooter(analysis.stats)}`;
    }

    return message;
  }

  /**
   * Format statistics footer
   */
  private formatStatsFooter(stats: DiffStats): string {
    return `Files changed: ${stats.filesChanged} | Insertions: ${stats.insertions} | Deletions: ${stats.deletions}`;
  }

  /**
   * Commit staged changes with generated message
   */
  async commitWithGeneratedMessage(options: CommitMessageOptions = {}): Promise<{ success: boolean; message: string; commitHash?: string }> {
    try {
      const commitMessage = await this.generateCommitMessage(options);
      
      if (options.dryRun) {
        return {
          success: true,
          message: `Dry run - would commit with message:\n${commitMessage}`
        };
      }

      const result = await this.gitAnalyzer.commitChanges(commitMessage);
      
      return {
        success: result.success,
        message: result.success ? `Committed successfully: ${result.commitHash}` : result.error || 'Commit failed',
        commitHash: result.commitHash
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to commit: ${(error as Error).message}`
      };
    }
  }

  /**
   * Get commit history analysis
   */
  async getCommitHistory(limit: number = 10): Promise<any[]> {
    return await this.gitAnalyzer.getRecentCommits(limit);
  }
}