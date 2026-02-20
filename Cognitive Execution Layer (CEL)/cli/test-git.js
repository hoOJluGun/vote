import { GitAnalyzer } from './dist/utils/git.js';

async function testGitFunctionality() {
  try {
    console.log('Testing Git Analyzer...');
    
    const gitAnalyzer = new GitAnalyzer();
    
    // Test if it's a git repository
    const isRepo = await gitAnalyzer.isGitRepository();
    console.log('Is Git repository:', isRepo);
    
    if (isRepo) {
      // Test getting staged changes
      const changes = await gitAnalyzer.getStagedChanges();
      console.log('Staged changes:', changes);
      
      // Test getting diff stats
      const stats = await gitAnalyzer.getDiffStats();
      console.log('Diff stats:', stats);
      
      // Test getting recent commits
      const commits = await gitAnalyzer.getRecentCommits(5);
      console.log('Recent commits:', commits);
    } else {
      console.log('Not in a Git repository, skipping Git tests');
    }
    
    console.log('Git functionality test completed successfully!');
  } catch (error) {
    console.error('Git test failed:', error);
  }
}

testGitFunctionality();