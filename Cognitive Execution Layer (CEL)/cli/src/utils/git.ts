import { exec } from 'child_process';

export interface GitChange {
  file: string;
  status: 'A' | 'M' | 'D' | 'R'; // Added, Modified, Deleted, Renamed
  additions: number;
  deletions: number;
}

export interface DiffStats {
  filesChanged: number;
  insertions: number;
  deletions: number;
}

export interface CommitResult {
  success: boolean;
  commitHash?: string;
  error?: string;
}

export class GitAnalyzer {
  private execPromise(command: string): Promise<string> {
    return new Promise((resolve, reject) => {
      exec(command, { cwd: process.cwd() }, (error, stdout, stderr) => {
        if (error) {
          reject(new Error(stderr || error.message));
        } else {
          resolve(stdout.trim());
        }
      });
    });
  }

  /**
   * Check if current directory is a Git repository
   */
  async isGitRepository(): Promise<boolean> {
    try {
      await this.execPromise('git rev-parse --git-dir');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get staged changes
   */
  async getStagedChanges(): Promise<GitChange[]> {
    if (!(await this.isGitRepository())) {
      throw new Error('Not a Git repository');
    }

    try {
      const output = await this.execPromise('git diff --cached --numstat');
      return this.parseDiffOutput(output);
    } catch (error) {
      throw new Error(`Failed to get staged changes: ${(error as Error).message}`);
    }
  }

  /**
   * Get diff statistics
   */
  async getDiffStats(): Promise<DiffStats> {
    const changes = await this.getStagedChanges();
    
    return {
      filesChanged: changes.length,
      insertions: changes.reduce((sum, change) => sum + change.additions, 0),
      deletions: changes.reduce((sum, change) => sum + change.deletions, 0)
    };
  }

  /**
   * Commit staged changes
   */
  async commitChanges(message: string, dryRun: boolean = false): Promise<CommitResult> {
    if (!(await this.isGitRepository())) {
      return { success: false, error: 'Not a Git repository' };
    }

    try {
      if (dryRun) {
        // Show what would be committed
        const changes = await this.getStagedChanges();
        return { 
          success: true, 
          commitHash: 'dry-run-hash',
          error: `Would commit ${changes.length} files with message: "${message}"`
        };
      }

      // Actually commit
      await this.execPromise(`git commit -m "${message.replace(/"/g, '\\"')}"`);
      
      // Get the commit hash
      const hash = await this.execPromise('git rev-parse HEAD');
      
      return { success: true, commitHash: hash };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Get recent commits
   */
  async getRecentCommits(limit: number = 10): Promise<Array<{hash: string, message: string, author: string, date: string}>> {
    if (!(await this.isGitRepository())) {
      throw new Error('Not a Git repository');
    }

    try {
      const output = await this.execPromise(`git log --oneline --pretty=format:"%H|%s|%an|%ad" --date=short -n ${limit}`);
      return output.split('\n').filter(line => line.trim()).map(line => {
        const [hash, message, author, date] = line.split('|');
        return { hash, message, author, date };
      });
    } catch (error) {
      throw new Error(`Failed to get commit history: ${(error as Error).message}`);
    }
  }

  /**
   * Parse git diff --numstat output
   */
  private parseDiffOutput(output: string): GitChange[] {
    if (!output.trim()) return [];

    return output.split('\n').map(line => {
      const [additions, deletions, file] = line.split('\t');
      const status = this.getFileStatus(file);
      
      return {
        file,
        status,
        additions: parseInt(additions) || 0,
        deletions: parseInt(deletions) || 0
      };
    }).filter(change => change.file); // Filter out empty lines
  }

  /**
   * Determine file status from filename
   */
  private getFileStatus(filename: string): GitChange['status'] {
    if (filename.startsWith('deleted:')) return 'D';
    if (filename.startsWith('renamed:')) return 'R';
    if (filename.startsWith('new file:')) return 'A';
    return 'M'; // Modified by default
  }
}