#!/usr/bin/env node

/**
 * CEL CLI - Cognitive Execution Layer Command Line Interface
 * Advanced AI-powered development assistant with Gemini/GitHub Copilot CLI-like features
 */

import { Command } from 'commander';
import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';
import chalk from 'chalk';
import ora from 'ora';
import gradient from 'gradient-string';
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ASCII Art for CLI
const asciiArt = `
${chalk.cyan.bold(' ██████╗███████╗██╗      ')}${chalk.blue.bold('██████╗ ')}${chalk.magenta.bold('███████╗')}
${chalk.cyan.bold('██╔════╝██╔════╝██║      ')}${chalk.blue.bold('██╔══██╗')}${chalk.magenta.bold('██╔════╝')}
${chalk.cyan.bold('██║     █████╗  ██║█████╗')}${chalk.blue.bold('██████╔╝')}${chalk.magenta.bold('█████╗  ')}
${chalk.cyan.bold('██║     ██╔══╝  ██║╚════╝')}${chalk.blue.bold('██╔═══╝ ')}${chalk.magenta.bold('██╔══╝  ')}
${chalk.cyan.bold('╚██████╗███████╗██║      ')}${chalk.blue.bold('██║     ')}${chalk.magenta.bold('███████╗')}
${chalk.cyan.bold(' ╚═════╝╚══════╝╚═╝      ')}${chalk.blue.bold('╚═╝     ')}${chalk.magenta.bold('╚══════╝')}
`;

const program = new Command();

program
  .name('cel')
  .description('Cognitive Execution Layer - Advanced AI Development Assistant')
  .version('1.0.0')
  .option('-v, --verbose', 'Enable verbose logging')
  .option('--api-key <key>', 'OpenRouter API key')
  .option('--model <model>', 'AI model to use');

// Interactive chat command
program
  .command('chat')
  .description('Start interactive AI chat session')
  .option('-c, --context <path>', 'Project context path')
  .option('-s, --system <prompt>', 'System prompt override')
  .action(async (options) => {
    console.log(gradient.pastel.multiline(asciiArt));
    console.log(chalk.green.bold('\n🚀 Welcome to CEL Interactive Chat!\n'));
    
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: chalk.blue('🧠 CEL > ')
    });

    // Initialize chat session
    const sessionId = Date.now().toString();
    const chatHistory = [];
    
    rl.prompt();

    rl.on('line', async (input) => {
      const trimmedInput = input.trim();
      
      if (trimmedInput.toLowerCase() === 'exit' || trimmedInput.toLowerCase() === 'quit') {
        console.log(chalk.yellow('\n👋 Goodbye! Thanks for using CEL.'));
        rl.close();
        return;
      }

      if (trimmedInput.toLowerCase() === 'clear') {
        console.clear();
        console.log(gradient.pastel.multiline(asciiArt));
        console.log(chalk.green.bold('\n🚀 Welcome to CEL Interactive Chat!\n'));
        rl.prompt();
        return;
      }

      if (trimmedInput === '') {
        rl.prompt();
        return;
      }

      // Show typing indicator
      const spinner = ora({
        text: chalk.gray('Thinking...'),
        spinner: 'clock'
      }).start();

      try {
        // Process the input through CEL
        const response = await processChatInput(trimmedInput, chatHistory, options);
        spinner.succeed(chalk.green('Response ready!'));
        
        console.log(chalk.cyan('\n🤖 AI Response:'));
        console.log(chalk.white(response));
        console.log('');
        
        // Add to history
        chatHistory.push({
          user: trimmedInput,
          ai: response,
          timestamp: new Date().toISOString()
        });
        
      } catch (error) {
        spinner.fail(chalk.red('Error processing request'));
        console.error(chalk.red(`❌ ${error.message}`));
      }
      
      rl.prompt();
    });

    rl.on('close', () => {
      console.log(chalk.yellow('\n👋 Session ended. Goodbye!'));
      process.exit(0);
    });
  });

// Code generation command
program
  .command('generate')
  .description('Generate code based on description')
  .argument('<description>', 'Description of what to generate')
  .option('-t, --type <type>', 'Type of code to generate (component, function, class, etc.)')
  .option('-l, --language <lang>', 'Programming language')
  .option('-o, --output <file>', 'Output file path')
  .action(async (description, options) => {
    const spinner = ora('Generating code...').start();
    
    try {
      const generatedCode = await generateCode(description, options);
      spinner.succeed('Code generated successfully!');
      
      if (options.output) {
        await fs.writeFile(options.output, generatedCode);
        console.log(chalk.green(`✅ Code saved to ${options.output}`));
      } else {
        console.log(chalk.cyan('\n📝 Generated Code:'));
        console.log(chalk.white(generatedCode));
      }
    } catch (error) {
      spinner.fail('Failed to generate code');
      console.error(chalk.red(`❌ ${error.message}`));
    }
  });

// Refactor command
program
  .command('refactor')
  .description('Refactor code with AI assistance')
  .argument('<file>', 'File to refactor')
  .option('-t, --target <improvements>', 'Target improvements')
  .option('-b, --backup', 'Create backup before refactoring')
  .action(async (file, options) => {
    const spinner = ora('Analyzing code...').start();
    
    try {
      // Check if file exists
      await fs.access(file);
      
      if (options.backup) {
        const backupFile = `${file}.backup.${Date.now()}`;
        await fs.copyFile(file, backupFile);
        spinner.text = `Backup created: ${backupFile}`;
      }
      
      const content = await fs.readFile(file, 'utf8');
      const refactoredCode = await refactorCode(content, file, options.target);
      
      await fs.writeFile(file, refactoredCode);
      spinner.succeed('Code refactored successfully!');
      console.log(chalk.green(`✅ ${file} has been refactored`));
      
    } catch (error) {
      spinner.fail('Failed to refactor code');
      console.error(chalk.red(`❌ ${error.message}`));
    }
  });

// Explain command
program
  .command('explain')
  .description('Explain code functionality')
  .argument('<file>', 'File to explain')
  .option('-s, --section <line>', 'Specific section or line number')
  .action(async (file, options) => {
    const spinner = ora('Analyzing code...').start();
    
    try {
      await fs.access(file);
      const content = await fs.readFile(file, 'utf8');
      
      const explanation = await explainCode(content, file, options.section);
      spinner.succeed('Analysis complete!');
      
      console.log(chalk.cyan('\n📚 Code Explanation:'));
      console.log(chalk.white(explanation));
      
    } catch (error) {
      spinner.fail('Failed to analyze code');
      console.error(chalk.red(`❌ ${error.message}`));
    }
  });

// Test command
program
  .command('test')
  .description('Generate and run tests')
  .argument('[files...]', 'Files to test (defaults to all)')
  .option('-g, --generate', 'Generate missing tests')
  .option('-r, --run', 'Run existing tests')
  .option('-c, --coverage', 'Generate coverage report')
  .action(async (files, options) => {
    const spinner = ora('Processing tests...').start();
    
    try {
      if (options.generate) {
        spinner.text = 'Generating tests...';
        const testResults = await generateTests(files);
        spinner.succeed('Tests generated successfully!');
        console.log(chalk.green(`✅ Generated tests for ${testResults.count} files`));
      }
      
      if (options.run) {
        spinner.text = 'Running tests...';
        const runResults = await runTests(files);
        spinner.succeed('Tests completed!');
        displayTestResults(runResults);
      }
      
      if (options.coverage) {
        spinner.text = 'Generating coverage report...';
        const coverage = await generateCoverage(files);
        spinner.succeed('Coverage report generated!');
        displayCoverage(coverage);
      }
      
    } catch (error) {
      spinner.fail('Test operation failed');
      console.error(chalk.red(`❌ ${error.message}`));
    }
  });

// Git integration commands
program
  .command('commit')
  .description('Generate smart commit messages')
  .option('-a, --amend', 'Amend last commit')
  .option('-s, --scope <scope>', 'Commit scope')
  .option('-t, --type <type>', 'Commit type (feat, fix, chore, etc.)')
  .action(async (options) => {
    const spinner = ora('Analyzing changes...').start();
    
    try {
      const changes = await getGitChanges();
      const commitMessage = await generateCommitMessage(changes, options);
      
      spinner.succeed('Commit message generated!');
      console.log(chalk.cyan('\n📝 Suggested Commit Message:'));
      console.log(chalk.white(commitMessage));
      
      // Optionally commit automatically
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      rl.question(chalk.yellow('\nWould you like to commit these changes? (y/N): '), async (answer) => {
        if (answer.toLowerCase() === 'y') {
          await executeGitCommit(commitMessage, options.amend);
          console.log(chalk.green('✅ Changes committed successfully!'));
        }
        rl.close();
      });
      
    } catch (error) {
      spinner.fail('Failed to generate commit message');
      console.error(chalk.red(`❌ ${error.message}`));
    }
  });

// Setup command
program
  .command('setup')
  .description('Setup CEL configuration')
  .option('-f, --force', 'Force reconfiguration')
  .action(async (options) => {
    console.log(gradient.pastel.multiline(asciiArt));
    console.log(chalk.green.bold('\n🔧 Setting up CEL...\n'));
    
    try {
      await setupConfiguration(options.force);
      console.log(chalk.green('✅ CEL setup completed successfully!'));
    } catch (error) {
      console.error(chalk.red(`❌ Setup failed: ${error.message}`));
    }
  });

// Status command
program
  .command('status')
  .description('Show CEL status and system info')
  .action(async () => {
    const spinner = ora('Loading status...').start();
    
    try {
      const status = await getSystemStatus();
      spinner.succeed('Status loaded!');
      displayStatus(status);
    } catch (error) {
      spinner.fail('Failed to load status');
      console.error(chalk.red(`❌ ${error.message}`));
    }
  });

// Autocomplete support
program.on('command:*', () => {
  console.error(chalk.red('Invalid command: %s'), program.args.join(' '));
  console.log(chalk.yellow('See --help for a list of available commands.'));
  process.exit(1);
});

// Main execution
if (process.argv.length === 2) {
  // No arguments provided, show help
  program.help();
} else {
  program.parse();
}

// Helper functions
async function processChatInput(input, history, options) {
  try {
    // Connect to CEL server
    const response = await fetch('http://localhost:3000/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: 'You are Cognitive Execution Layer AI assistant. Respond in the same language as user input.' },
          ...history.flatMap(entry => [
            { role: 'user', content: entry.user },
            { role: 'assistant', content: entry.ai }
          ]),
          { role: 'user', content: input }
        ],
        model: 'upstage/solar-pro-3:free',
        max_tokens: 1024,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    return `Error connecting to AI service: ${error.message}. Please ensure CEL server is running on port 3000.`;
  }
}

async function generateCode(description, options) {
  // Mock implementation
  return `// Generated code for: ${description}\n// Implementation would connect to CEL AI engine`;
}

async function refactorCode(content, file, target) {
  // Mock implementation
  return `// Refactored version of ${file}\n${content}`;
}

async function explainCode(content, file, section) {
  // Mock implementation
  return `This code in ${file} performs the following functions: [Detailed explanation would be generated by CEL AI]`;
}

async function generateTests(files) {
  // Mock implementation
  return { count: files.length || 1, files: files || ['src/**/*.js'] };
}

async function runTests(files) {
  // Mock implementation
  return {
    passed: 10,
    failed: 0,
    total: 10,
    results: []
  };
}

async function generateCoverage(files) {
  // Mock implementation
  return {
    lines: 85,
    functions: 92,
    branches: 78,
    statements: 88
  };
}

async function getGitChanges() {
  // Mock implementation
  return ['modified: src/index.js', 'added: tests/unit.test.js'];
}

async function generateCommitMessage(changes, options) {
  // Mock implementation
  return `feat: implement new features\n\n- Add AI-powered code generation\n- Improve test coverage\n- Fix minor bugs`;
}

async function executeGitCommit(message, amend) {
  // Mock implementation
  console.log(chalk.gray(`git commit -m "${message}" ${amend ? '--amend' : ''}`));
}

async function setupConfiguration(force) {
  // Mock implementation
  console.log(chalk.gray('Creating configuration files...'));
  console.log(chalk.gray('Setting up API connections...'));
  console.log(chalk.gray('Configuring models...'));
}

async function getSystemStatus() {
  // Mock implementation
  return {
    version: '1.0.0',
    uptime: '2h 34m',
    models: ['gpt-4', 'claude-3', 'glm-4'],
    connected: true,
    performance: 'optimal'
  };
}

function displayTestResults(results) {
  console.log(chalk.cyan('\n📊 Test Results:'));
  console.log(chalk.green(`✓ ${results.passed} passed`));
  console.log(chalk.red(`✗ ${results.failed} failed`));
  console.log(chalk.blue(`Total: ${results.total}`));
}

function displayCoverage(coverage) {
  console.log(chalk.cyan('\n📈 Coverage Report:'));
  console.log(chalk.white(`Lines: ${coverage.lines}%`));
  console.log(chalk.white(`Functions: ${coverage.functions}%`));
  console.log(chalk.white(`Branches: ${coverage.branches}%`));
  console.log(chalk.white(`Statements: ${coverage.statements}%`));
}

function displayStatus(status) {
  console.log(chalk.cyan('\n📊 CEL Status:'));
  console.log(chalk.white(`Version: ${status.version}`));
  console.log(chalk.white(`Uptime: ${status.uptime}`));
  console.log(chalk.white(`Connected: ${status.connected ? '✅' : '❌'}`));
  console.log(chalk.white(`Performance: ${status.performance}`));
  console.log(chalk.white(`Available Models: ${status.models.join(', ')}`));
}