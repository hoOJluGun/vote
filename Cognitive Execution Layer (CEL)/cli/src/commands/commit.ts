import { Command } from 'commander';
import { GitAnalyzer } from '../utils/git.js';
import { CELService } from '../services/CELService.js';
import { GitCommitService } from '../services/GitCommitService.js';

export const createCommitCommand = (): Command => {
  const program = new Command('commit');
  
  program
    .description('Smart Git commit with AI-generated messages')
    .option('-m, --message <message>', 'Custom commit message')
    .option('--dry-run', 'Show what would be committed without actually committing')
    .option('--no-conventional', 'Disable conventional commit format')
    .option('--include-stats', 'Include change statistics in commit message')
    .option('--max-length <length>', 'Maximum commit message length', '72')
    .action(async (options) => {
      try {
        if (options.message) {
          // Use custom message
          const gitAnalyzer = new GitAnalyzer();
          const result = await gitAnalyzer.commitChanges(options.message, options.dryRun);
          
          if (result.success) {
            console.log(`✅ Committed successfully: ${result.commitHash}`);
          } else {
            console.error(`❌ Commit failed: ${result.error}`);
            process.exit(1);
          }
        } else {
          // Generate smart commit message
          const gitAnalyzer = new GitAnalyzer();
          const celService = new CELService();
          const commitService = new GitCommitService(gitAnalyzer, celService);
          
          const result = await commitService.commitWithGeneratedMessage({
            conventional: options.conventional,
            maxLength: parseInt(options.maxLength),
            includeStats: options.includeStats,
            dryRun: options.dryRun
          });
          
          if (result.success) {
            console.log(`✅ ${result.message}`);
          } else {
            console.error(`❌ ${result.message}`);
            process.exit(1);
          }
        }
      } catch (error) {
        console.error('❌ Error:', (error as Error).message);
        process.exit(1);
      }
    });

  // Add subcommands
  program
    .command('analyze')
    .description('Analyze staged changes without committing')
    .option('--detailed', 'Show detailed analysis')
    .action(async (options) => {
      try {
        const gitAnalyzer = new GitAnalyzer();
        const changes = await gitAnalyzer.getStagedChanges();
        
        if (changes.length === 0) {
          console.log('No staged changes found.');
          return;
        }

        console.log(`📊 Found ${changes.length} staged changes:`);
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
      } catch (error) {
        console.error('❌ Error analyzing changes:', (error as Error).message);
        process.exit(1);
      }
    });

  program
    .command('history')
    .description('Show recent commit history')
    .option('-n, --limit <number>', 'Number of commits to show', '10')
    .action(async (options) => {
      try {
        const gitAnalyzer = new GitAnalyzer();
        const commits = await gitAnalyzer.getRecentCommits(parseInt(options.limit));
        
        console.log(`🕒 Recent commits (last ${options.limit}):`);
        commits.forEach((commit: any, index: number) => {
          console.log(`${index + 1}. ${commit.hash.substring(0, 8)} - ${commit.message} (${commit.author})`);
        });
      } catch (error) {
        console.error('❌ Error fetching commit history:', (error as Error).message);
        process.exit(1);
      }
    });

  return program;
};