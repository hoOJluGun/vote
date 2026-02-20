#!/usr/bin/env node

import { Command } from 'commander';
import { CELService } from './services/CELService';
import { ChatCommand } from './commands/ChatCommand';
import { Logger } from './utils';

async function main(): Promise<void> {
  const program = new Command();
  
  program
    .name('cel')
    .description('Cognitive Execution Layer - Advanced AI Development Assistant')
    .version('2.0.0')
    .option('-v, --verbose', 'Enable verbose logging')
    .option('--api-key <key>', 'OpenRouter API key')
    .option('--model <model>', 'AI model to use')
    .option('--server <url>', 'CEL server URL', 'http://localhost:3000');

  // Initialize services
  const options = program.opts();
  const celService = new CELService(options.server, options.model);

  // Register commands
  new ChatCommand(celService).register(program);

  // Add other commands
  program
    .command('status')
    .description('Show CEL system status')
    .action(async () => {
      try {
        const status = await celService.getStatus();
        Logger.success('System Status:');
        console.log(JSON.stringify(status, null, 2));
      } catch (error: any) {
        Logger.error(error.message);
      }
    });

  program
    .command('commit')
    .description('Smart Git commit with AI-generated messages')
    .option('-m, --message <message>', 'Custom commit message')
    .option('--dry-run', 'Show what would be committed without actually committing')
    .option('--no-conventional', 'Disable conventional commit format')
    .option('--include-stats', 'Include change statistics in commit message')
    .option('--max-length <length>', 'Maximum commit message length', '72')
    .action(async (options) => {
      try {
        const { GitAnalyzer } = await import('./utils/git.js');
        const { GitCommitService } = await import('./services/GitCommitService.js');
        
        if (options.message) {
          // Use custom message
          const gitAnalyzer = new GitAnalyzer();
          const result = await gitAnalyzer.commitChanges(options.message, options.dryRun);
          
          if (result.success) {
            Logger.success(`Committed successfully: ${result.commitHash}`);
          } else {
            Logger.error(`Commit failed: ${result.error}`);
            process.exit(1);
          }
        } else {
          // Generate smart commit message
          const gitAnalyzer = new GitAnalyzer();
          const commitService = new GitCommitService(gitAnalyzer, celService);
          
          const result = await commitService.commitWithGeneratedMessage({
            conventional: options.conventional,
            maxLength: parseInt(options.maxLength),
            includeStats: options.includeStats,
            dryRun: options.dryRun
          });
          
          if (result.success) {
            Logger.success(result.message);
          } else {
            Logger.error(result.message);
            process.exit(1);
          }
        }
      } catch (error: any) {
        Logger.error(`Error: ${error.message}`);
        process.exit(1);
      }
    });

  program
    .command('commit:analyze')
    .description('Analyze staged changes without committing')
    .option('--detailed', 'Show detailed analysis')
    .action(async (options) => {
      try {
        const { GitAnalyzer } = await import('./utils/git.js');
        const gitAnalyzer = new GitAnalyzer();
        const changes = await gitAnalyzer.getStagedChanges();
        
        if (changes.length === 0) {
          Logger.info('No staged changes found.');
          return;
        }

        Logger.success(`Found ${changes.length} staged changes:`);
        changes.forEach(change => {
          console.log(`  ${change.status} ${change.file} (+${change.additions}, -${change.deletions})`);
        });

        if (options.detailed) {
          const stats = await gitAnalyzer.getDiffStats();
          console.log(`\n📈 Statistics:`);
          console.log(`  Files changed: ${stats.filesChanged}`);
          console.log(`  Insertions: ${stats.insertions}`);
          console.log(`  Deletions: ${stats.deletions}`);
        }
      } catch (error: any) {
        Logger.error(`Error analyzing changes: ${error.message}`);
        process.exit(1);
      }
    });

  program
    .command('commit:history')
    .description('Show recent commit history')
    .option('-n, --limit <number>', 'Number of commits to show', '10')
    .action(async (options) => {
      try {
        const { GitAnalyzer } = await import('./utils/git.js');
        const gitAnalyzer = new GitAnalyzer();
        const commits = await gitAnalyzer.getRecentCommits(parseInt(options.limit));
        
        Logger.success(`Recent commits (last ${options.limit}):`);
        commits.forEach((commit: any, index: number) => {
          console.log(`${index + 1}. ${commit.hash.substring(0, 8)} - ${commit.message} (${commit.author})`);
        });
      } catch (error: any) {
        Logger.error(`Error fetching commit history: ${error.message}`);
        process.exit(1);
      }
    });

  program
    .command('generate')
    .description('Generate code based on description')
    .argument('<description>', 'Description of what to generate')
    .option('-o, --output <file>', 'Output file path')
    .option('-l, --language <lang>', 'Programming language')
    .action(async (description, options) => {
      try {
        Logger.info(`Generating code: ${description}`);
        const code = await celService.generateCode(description);
        
        if (options.output) {
          const { FileUtils } = await import('./utils');
          await FileUtils.writeFile(options.output, code);
          Logger.success(`Code saved to ${options.output}`);
        } else {
          console.log(code);
        }
      } catch (error: any) {
        Logger.error(error.message);
      }
    });

  // Handle unknown commands
  program.on('command:*', () => {
    Logger.error(`Invalid command: ${program.args.join(' ')}`);
    Logger.info('See --help for available commands');
    process.exit(1);
  });

  // Parse arguments
  program.parse();
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  Logger.error(`Uncaught exception: ${error.message}`);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  Logger.error(`Unhandled rejection: ${reason}`);
  process.exit(1);
});

// Run the CLI
main().catch((error) => {
  Logger.error(`Fatal error: ${error.message}`);
  process.exit(1);
});