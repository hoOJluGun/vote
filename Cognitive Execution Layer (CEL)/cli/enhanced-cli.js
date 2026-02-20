/**
 * Enhanced CLI with Advanced Features
 * Provides comprehensive command-line interface with AI-powered capabilities
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
import inquirer from 'inquirer';
import table from 'cli-table3';
import { EnhancedConfigManager } from '../lib/enhanced-config-manager.js';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Enhanced ASCII Art
const asciiArt = `
${chalk.cyan.bold(' ██████╗███████╗██╗      ')}${chalk.blue.bold('██████╗ ')}${chalk.magenta.bold('███████╗')}
${chalk.cyan.bold('██╔════╝██╔════╝██║      ')}${chalk.blue.bold('██╔══██╗')}${chalk.magenta.bold('██╔════╝')}
${chalk.cyan.bold('██║     █████╗  ██║█████╗')}${chalk.blue.bold('██████╔╝')}${chalk.magenta.bold('█████╗  ')}
${chalk.cyan.bold('██║     ██╔══╝  ██║╚════╝')}${chalk.blue.bold('██╔═══╝ ')}${chalk.magenta.bold('██╔══╝  ')}
${chalk.cyan.bold('╚██████╗███████╗██║      ')}${chalk.blue.bold('██║     ')}${chalk.magenta.bold('███████╗')}
${chalk.cyan.bold(' ╚═════╝╚══════╝╚═╝      ')}${chalk.blue.bold('╚═╝     ')}${chalk.magenta.bold('╚══════╝')}
${chalk.gray.bold('      v4.2.1 - Enhanced Edition')}
`;

class EnhancedCLI {
  constructor() {
    this.configManager = new EnhancedConfigManager();
    this.sessionId = Date.now().toString();
    this.history = [];
    this.maxHistorySize = 1000;
    this.plugins = new Map();
    this.shortcuts = new Map();
    
    this.initializePlugins();
    this.initializeShortcuts();
  }

  /**
   * Initialize CLI plugins
   */
  initializePlugins() {
    // Load built-in plugins
    this.plugins.set('git', new GitPlugin());
    this.plugins.set('docker', new DockerPlugin());
    this.plugins.set('deploy', new DeployPlugin());
    this.plugins.set('monitor', new MonitorPlugin());
  }

  /**
   * Initialize keyboard shortcuts
   */
  initializeShortcuts() {
    this.shortcuts.set('ctrl+c', 'interrupt');
    this.shortcuts.set('ctrl+d', 'exit');
    this.shortcuts.set('ctrl+r', 'reset');
    this.shortcuts.set('ctrl+h', 'help');
    this.shortcuts.set('tab', 'autocomplete');
  }

  /**
   * Create and configure CLI program
   */
  createProgram() {
    const program = new Command();
    
    program
      .name('cel')
      .description('Cognitive Execution Layer - Enhanced AI Development Assistant')
      .version('4.2.1')
      .option('-v, --verbose', 'Enable verbose logging')
      .option('--config <path>', 'Custom configuration file path')
      .option('--profile <name>', 'Use specific configuration profile')
      .option('--no-color', 'Disable colored output');

    // Interactive mode
    program
      .command('interactive')
      .alias('i')
      .description('Start interactive AI assistant mode')
      .option('-m, --model <model>', 'AI model to use')
      .option('-c, --context <path>', 'Project context path')
      .option('-s, --system <prompt>', 'System prompt override')
      .option('--server-url <url>', 'CEL server URL', 'http://localhost:3000')
      .action(async (options) => {
        await this.startInteractiveMode(options);
      });

    // Enhanced chat command
    program
      .command('chat')
      .alias('c')
      .description('Start AI chat session with advanced features')
      .option('-c, --context <path>', 'Project context path')
      .option('-s, --system <prompt>', 'System prompt override')
      .option('-m, --model <model>', 'AI model to use')
      .option('-t, --temperature <temp>', 'Response temperature (0.0-2.0)')
      .option('--save', 'Save conversation to file')
      .option('--load <file>', 'Load conversation from file')
      .action(async (options) => {
        await this.startEnhancedChat(options);
      });

    // Code generation with templates
    program
      .command('generate')
      .alias('g')
      .description('Generate code with templates and AI assistance')
      .argument('<type>', 'Type of code to generate (component, service, model, etc.)')
      .argument('[name]', 'Name for the generated code')
      .option('-l, --language <lang>', 'Programming language')
      .option('-t, --template <template>', 'Use specific template')
      .option('-o, --output <path>', 'Output file path')
      .option('--interactive', 'Interactive mode with prompts')
      .option('--test', 'Generate tests alongside code')
      .action(async (type, name, options) => {
        await this.generateCodeWithTemplate(type, name, options);
      });

    // Advanced refactoring
    program
      .command('refactor')
      .alias('r')
      .description('Advanced code refactoring with AI analysis')
      .argument('<path>', 'File or directory to refactor')
      .option('-t, --target <targets>', 'Target improvements (performance, security, readability)')
      .option('--dry-run', 'Show changes without applying')
      .option('--backup', 'Create backup before refactoring')
      .option('--interactive', 'Interactive refactoring mode')
      .action(async (path, options) => {
        await this.advancedRefactor(path, options);
      });

    // Smart testing
    program
      .command('test')
      .alias('t')
      .description('Intelligent test generation and execution')
      .argument('[paths...]', 'Files or directories to test')
      .option('-g, --generate', 'Generate missing tests')
      .option('-r, --run', 'Run existing tests')
      .option('-c, --coverage', 'Generate coverage report')
      .option('--ai-enhanced', 'Use AI for test generation')
      .option('--parallel', 'Run tests in parallel')
      .action(async (paths, options) => {
        await this.smartTesting(paths, options);
      });

    // Performance analysis
    program
      .command('analyze')
      .alias('a')
      .description('Analyze code performance and suggest optimizations')
      .argument('<path>', 'File or directory to analyze')
      .option('--profile', 'Generate performance profile')
      .option('--benchmark', 'Run benchmarks')
      .option('--compare <baseline>', 'Compare against baseline')
      .action(async (path, options) => {
        await this.performanceAnalysis(path, options);
      });

    // Security audit
    program
      .command('audit')
      .description('Security vulnerability assessment')
      .argument('<path>', 'Path to audit')
      .option('--deep', 'Deep security analysis')
      .option('--report <format>', 'Report format (json, html, pdf)')
      .option('--fix', 'Attempt to fix found issues')
      .action(async (path, options) => {
        await this.securityAudit(path, options);
      });

    // Project management
    program
      .command('project')
      .alias('p')
      .description('Project management commands')
      .argument('<action>', 'Action (init, status, info, clean)')
      .option('-t, --type <type>', 'Project type')
      .action(async (action, options) => {
        await this.projectManagement(action, options);
      });

    // Configuration management
    program
      .command('config')
      .description('Manage configuration')
      .argument('[key]', 'Configuration key')
      .argument('[value]', 'Configuration value')
      .option('--list', 'List all configuration')
      .option('--reset', 'Reset to defaults')
      .option('--export <path>', 'Export configuration')
      .option('--import <path>', 'Import configuration')
      .action(async (key, value, options) => {
        await this.manageConfiguration(key, value, options);
      });

    // Plugin management
    program
      .command('plugin')
      .description('Manage CLI plugins')
      .argument('<action>', 'Action (list, install, remove, info)')
      .argument('[name]', 'Plugin name')
      .action(async (action, name) => {
        await this.managePlugins(action, name);
      });

    // Monitoring dashboard
    program
      .command('monitor')
      .description('Open monitoring dashboard')
      .option('--port <port>', 'Dashboard port', '3001')
      .option('--remote', 'Enable remote access')
      .option('--server-url <url>', 'CEL server URL', 'http://localhost:3000')
      .action(async (options) => {
        await this.openMonitoringDashboard(options);
      });
    
    // Self-healing command
    program
      .command('heal')
      .description('Run self-healing process on problematic files')
      .argument('[files...]', 'Files to heal (defaults to all)')
      .option('-t, --test', 'Run tests to identify issues')
      .option('--server-url <url>', 'CEL server URL', 'http://localhost:3000')
      .action(async (files, options) => {
        await this.runHealing(files, options);
      });
    
    // Run goal command
    program
      .command('run-goal')
      .description('Execute a specific goal using orchestration engine')
      .argument('<goal>', 'Goal to execute')
      .option('-c, --context <path>', 'Project context path')
      .option('--server-url <url>', 'CEL server URL', 'http://localhost:3000')
      .action(async (goal, options) => {
        await this.executeGoal(goal, options);
      });
    
    // Git integration commands
    program
      .command('commit')
      .description('Generate smart commit messages')
      .option('-a, --amend', 'Amend last commit')
      .option('-s, --scope <scope>', 'Commit scope')
      .option('-t, --type <type>', 'Commit type (feat, fix, chore, etc.)')
      .option('--server-url <url>', 'CEL server URL', 'http://localhost:3000')
      .action(async (options) => {
        await this.generateSmartCommit(options);
      });

    return program;
  }

  /**
   * Start interactive mode with enhanced features
   */
  async startInteractiveMode(options) {
    console.log(gradient.pastel.multiline(asciiArt));
    console.log(chalk.green.bold('\n🚀 Welcome to CEL Enhanced Interactive Mode!\n'));
    
    // Use server URL from options if provided
    const serverUrl = options.serverUrl || 'http://localhost:3000';
    
    // Check server connection
    const serverStatus = await this.checkServerStatus(serverUrl);
    if (!serverStatus.connected) {
      console.log(chalk.yellow(`⚠️  CEL server is not running at ${serverUrl}. Start it with: npm start`));
      return;
    }

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: chalk.blue('🧠 CEL Enhanced > ')
    });

    // Setup history and completion
    this.setupReadlineEnhancements(rl);

    // Display available commands
    this.displayInteractiveHelp();

    rl.prompt();

    rl.on('line', async (input) => {
      await this.handleInteractiveInput(input, rl, options);
    });

    rl.on('close', () => {
      console.log(chalk.yellow('\n👋 Session ended. Goodbye!'));
      process.exit(0);
    });
  }

  /**
   * Handle interactive input with command parsing
   */
  async handleInteractiveInput(input, rl, options) {
    const trimmedInput = input.trim();
    
    if (trimmedInput === '') {
      rl.prompt();
      return;
    }

    // Add to history
    this.addToHistory(trimmedInput);

    // Parse command
    const [command, ...args] = trimmedInput.split(' ');

    try {
      switch (command.toLowerCase()) {
        case 'help':
        case 'h':
          this.displayInteractiveHelp();
          break;
          
        case 'clear':
        case 'cls':
          console.clear();
          console.log(gradient.pastel.multiline(asciiArt));
          break;
          
        case 'exit':
        case 'quit':
        case 'q':
          rl.close();
          return;
          
        case 'status':
          await this.displayStatus();
          break;
          
        case 'models':
          await this.displayAvailableModels();
          break;
          
        case 'config':
          await this.interactiveConfig(args);
          break;
          
        case 'history':
          this.displayHistory(args[0]);
          break;
          
        default:
          // Treat as AI chat message
          await this.processChatMessage(trimmedInput, options);
      }
    } catch (error) {
      console.error(chalk.red(`❌ Error: ${error.message}`));
    }
    
    rl.prompt();
  }

  /**
   * Start enhanced chat with AI
   */
  async startEnhancedChat(options) {
    console.log(gradient.pastel.multiline(asciiArt));
    console.log(chalk.green.bold('\n🤖 Enhanced AI Chat Session\n'));
    
    // Load conversation if requested
    if (options.load) {
      await this.loadConversation(options.load);
    }

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: chalk.cyan('💬 Chat > ')
    });

    let conversation = [];
    
    rl.prompt();

    rl.on('line', async (input) => {
      const trimmedInput = input.trim();
      
      if (trimmedInput.toLowerCase() === 'exit') {
        if (options.save) {
          await this.saveConversation(conversation, 'conversation.json');
        }
        rl.close();
        return;
      }

      if (trimmedInput === '') {
        rl.prompt();
        return;
      }

      const spinner = ora({
        text: chalk.gray('AI is thinking...'),
        spinner: 'dots12'
      }).start();

      try {
        const response = await this.sendEnhancedChatMessage(trimmedInput, conversation, options);
        spinner.succeed(chalk.green('Response received'));
        
        console.log(chalk.cyan('\n🤖 AI:'));
        console.log(chalk.white(response.content));
        
        if (response.metadata) {
          console.log(chalk.gray(`\n📊 Tokens: ${response.metadata.tokens || 'N/A'} | Model: ${response.metadata.model || 'N/A'} | Time: ${response.metadata.time || 'N/A'}ms`));
        }
        
        conversation.push({
          user: trimmedInput,
          ai: response.content,
          metadata: response.metadata,
          timestamp: new Date().toISOString()
        });
        
      } catch (error) {
        spinner.fail(chalk.red('Error'));
        console.error(chalk.red(`❌ ${error.message}`));
      }
      
      console.log('');
      rl.prompt();
    });
  }

  /**
   * Generate code with templates and AI assistance
   */
  async generateCodeWithTemplate(type, name, options) {
    const spinner = ora('Generating code...').start();
    
    try {
      // Check if template exists
      const template = await this.getTemplate(type, options.template);
      
      if (!template) {
        spinner.fail('Template not found');
        console.log(chalk.red(`❌ Template '${type}' not found`));
        return;
      }

      let generatedCode;
      
      if (options.interactive) {
        // Interactive mode with prompts
        const answers = await inquirer.prompt(template.prompts || []);
        generatedCode = await this.generateCodeWithAI(type, name, answers, options);
      } else {
        // Direct generation
        generatedCode = await this.generateCodeWithAI(type, name, {}, options);
      }

      spinner.succeed('Code generated successfully!');
      
      // Apply template
      const finalCode = this.applyTemplate(generatedCode, template, { name, ...options });
      
      if (options.output) {
        await fs.writeFile(options.output, finalCode);
        console.log(chalk.green(`✅ Code saved to ${options.output}`));
      } else {
        console.log(chalk.cyan('\n📝 Generated Code:'));
        console.log(chalk.white(finalCode));
      }

      // Generate tests if requested
      if (options.test) {
        await this.generateTestsForCode(finalCode, type, name);
      }

    } catch (error) {
      spinner.fail('Failed to generate code');
      console.error(chalk.red(`❌ ${error.message}`));
    }
  }

  /**
   * Advanced refactoring with AI analysis
   */
  async advancedRefactor(path, options) {
    const spinner = ora('Analyzing code for refactoring...').start();
    
    try {
      // Analyze code structure
      const analysis = await this.analyzeCodeStructure(path);
      
      spinner.succeed('Analysis complete');
      
      if (options.interactive) {
        // Interactive refactoring
        const refactoringOptions = await this.getRefactoringOptions(analysis);
        await this.performInteractiveRefactoring(path, refactoringOptions, options);
      } else {
        // Automatic refactoring
        const refactoringPlan = await this.createRefactoringPlan(analysis, options.target);
        await this.executeRefactoringPlan(path, refactoringPlan, options);
      }

    } catch (error) {
      spinner.fail('Refactoring failed');
      console.error(chalk.red(`❌ ${error.message}`));
    }
  }

  /**
   * Smart testing with AI-generated tests
   */
  async smartTesting(paths, options) {
    const spinner = ora('Processing smart testing...').start();
    
    try {
      if (options.generate) {
        spinner.text = 'Generating AI-enhanced tests...';
        await this.generateSmartTests(paths, options);
        spinner.succeed('Tests generated');
      }

      if (options.run) {
        spinner.text = 'Running tests...';
        const results = await this.runTests(paths, options);
        spinner.succeed('Tests completed');
        this.displayTestResults(results);
      }

      if (options.coverage) {
        spinner.text = 'Generating coverage report...';
        const coverage = await this.generateCoverageReport(paths);
        spinner.succeed('Coverage report generated');
        this.displayCoverageReport(coverage);
      }

    } catch (error) {
      spinner.fail('Testing failed');
      console.error(chalk.red(`❌ ${error.message}`));
    }
  }

  /**
   * Performance analysis with profiling
   */
  async performanceAnalysis(path, options) {
    const spinner = ora('Analyzing performance...').start();
    
    try {
      const analysis = await this.analyzePerformance(path, options);
      
      spinner.succeed('Performance analysis complete');
      
      // Display results
      this.displayPerformanceAnalysis(analysis);
      
      // Generate recommendations
      if (analysis.recommendations.length > 0) {
        console.log(chalk.yellow('\n💡 Recommendations:'));
        analysis.recommendations.forEach((rec, index) => {
          console.log(`${chalk.cyan(`${index + 1}.`)} ${rec.description} (${chalk.gray(rec.impact)})`);
        });
      }

    } catch (error) {
      spinner.fail('Performance analysis failed');
      console.error(chalk.red(`❌ ${error.message}`));
    }
  }

  /**
   * Security audit with vulnerability scanning
   */
  async securityAudit(path, options) {
    const spinner = ora('Performing security audit...').start();
    
    try {
      const audit = await this.performSecurityAudit(path, options);
      
      spinner.succeed('Security audit complete');
      
      // Display results
      this.displaySecurityAudit(audit);
      
      // Generate report
      if (options.report) {
        await this.generateSecurityReport(audit, options.report);
      }

    } catch (error) {
      spinner.fail('Security audit failed');
      console.error(chalk.red(`❌ ${error.message}`));
    }
  }

  /**
   * Project management commands
   */
  async projectManagement(action, options) {
    switch (action.toLowerCase()) {
      case 'init':
        await this.initializeProject(options);
        break;
      case 'status':
        await this.showProjectStatus();
        break;
      case 'info':
        await this.showProjectInfo();
        break;
      case 'clean':
        await this.cleanProject();
        break;
      default:
        console.log(chalk.red(`❌ Unknown project action: ${action}`));
    }
  }

  /**
   * Configuration management
   */
  async manageConfiguration(key, value, options) {
    try {
      if (options.list) {
        const config = this.configManager.getAllConfiguration();
        this.displayConfiguration(config);
        return;
      }

      if (options.reset) {
        await this.configManager.resetToDefaults();
        console.log(chalk.green('✅ Configuration reset to defaults'));
        return;
      }

      if (options.export) {
        await this.configManager.exportConfiguration(options.export);
        console.log(chalk.green(`✅ Configuration exported to ${options.export}`));
        return;
      }

      if (options.import) {
        await this.configManager.importConfiguration(options.import);
        console.log(chalk.green(`✅ Configuration imported from ${options.import}`));
        return;
      }

      if (key && value) {
        await this.configManager.set(key, value);
        console.log(chalk.green(`✅ Set ${key} = ${value}`));
        return;
      }

      if (key) {
        const currentValue = this.configManager.get(key);
        console.log(chalk.cyan(`${key} = ${currentValue}`));
        return;
      }

      console.log(chalk.yellow('Usage: cel config <key> <value> or --list/--reset/--export/--import'));
      
    } catch (error) {
      console.error(chalk.red(`❌ Configuration error: ${error.message}`));
    }
  }

  /**
   * Plugin management
   */
  async managePlugins(action, name) {
    switch (action.toLowerCase()) {
      case 'list':
        this.displayPlugins();
        break;
      case 'info':
        this.displayPluginInfo(name);
        break;
      case 'install':
        await this.installPlugin(name);
        break;
      case 'remove':
        await this.removePlugin(name);
        break;
      default:
        console.log(chalk.red(`❌ Unknown plugin action: ${action}`));
    }
  }

  /**
   * Open monitoring dashboard
   */
  async openMonitoringDashboard(options) {
    const spinner = ora('Starting monitoring dashboard...').start();
    
    try {
      // Start dashboard server
      const dashboard = await this.startDashboard(options.port, options.remote);
      
      spinner.succeed('Dashboard started');
      console.log(chalk.green(`📊 Monitoring dashboard: http://localhost:${options.port}`));
      
      if (options.remote) {
        console.log(chalk.yellow('⚠️  Remote access enabled - ensure firewall rules'));
      }

    } catch (error) {
      spinner.fail('Failed to start dashboard');
      console.error(chalk.red(`❌ ${error.message}`));
    }
  }

  /**
   * Run self-healing process
   */
  async runHealing(paths, options) {
    const spinner = ora('Starting healing process...').start();
    
    try {
      const result = await this.healFiles(paths, options);
      spinner.succeed('Healing completed!');
      
      console.log(chalk.cyan('\n🛠️  Healing Report:'));
      console.log(chalk.white(result.summary));
      
      if (result.fixedIssues > 0) {
        console.log(chalk.green(`✅ Fixed ${result.fixedIssues} issues`));
      }
      
      if (result.suggestions > 0) {
        console.log(chalk.blue(`💡 ${result.suggestions} improvement suggestions`));
      }
      
    } catch (error) {
      spinner.fail('Failed to heal files');
      console.error(chalk.red(`❌ ${error.message}`));
    }
  }

  /**
   * Execute orchestration goal
   */
  async executeGoal(goal, options) {
    const spinner = ora('Executing goal...').start();
    
    try {
      const result = await this.runOrchestrationGoal(goal, options);
      spinner.succeed('Goal completed!');
      
      console.log(chalk.cyan('\n🎯 Goal Result:'));
      console.log(chalk.white(result.summary));
      
      if (result.artifacts && result.artifacts.length > 0) {
        console.log(chalk.green('\n📎 Artifacts created:'));
        result.artifacts.forEach(artifact => {
          console.log(chalk.white(`- ${artifact}`));
        });
      }
      
    } catch (error) {
      spinner.fail('Failed to execute goal');
      console.error(chalk.red(`❌ ${error.message}`));
    }
  }

  /**
   * Helper methods
   */
  async checkServerStatus(serverUrl = 'http://localhost:3000') {
    try {
      const response = await fetch(`${serverUrl}/health`, { timeout: 5000 });
      return { 
        connected: response.ok, 
        status: response.status,
        url: serverUrl,
        data: await response.json()
      };
    } catch (error) {
      return { 
        connected: false, 
        status: 0,
        url: serverUrl,
        error: error.message
      };
    }
  }

  async sendEnhancedChatMessage(message, conversation, options) {
    const response = await fetch('http://localhost:3000/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: 'You are an enhanced AI assistant for the Cognitive Execution Layer.' },
          ...conversation.flatMap(entry => [
            { role: 'user', content: entry.user },
            { role: 'assistant', content: entry.ai }
          ]),
          { role: 'user', content: message }
        ],
        model: options.model || 'auto',
        temperature: parseFloat(options.temperature) || 0.7,
        max_tokens: 2048,
        stream: false
      })
    });

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

    const data = await response.json();
    return {
      content: data.choices[0].message.content,
      metadata: {
        model: data.model,
        tokens: data.usage?.total_tokens,
        time: data.response_time
      }
    };
  }

  setupReadlineEnhancements(rl) {
    // Enable history navigation
    rl.on('SIGINT', () => {
      rl.clearLine();
      rl.prompt();
    });
  }

  addToHistory(command) {
    this.history.push(command);
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
    }
  }

  displayInteractiveHelp() {
    console.log(chalk.cyan('\n📚 Available Commands:'));
    console.log(chalk.white('  help, h          - Show this help'));
    console.log(chalk.white('  clear, cls       - Clear screen'));
    console.log(chalk.white('  exit, quit, q    - Exit interactive mode'));
    console.log(chalk.white('  status           - Show CEL status'));
    console.log(chalk.white('  models           - List available AI models'));
    console.log(chalk.white('  config           - Manage configuration'));
    console.log(chalk.white('  history [n]      - Show command history'));
    console.log(chalk.white('  heal             - Run self-healing process'));
    console.log(chalk.white('  run-goal <goal>  - Execute orchestration goal'));
    console.log(chalk.gray('\n💬 Any other input will be sent to the AI assistant\n'));
  }

  async displayStatus() {
    const spinner = ora('Loading status...').start();
    
    try {
      const status = await this.checkServerStatus();
      const config = this.configManager.getAllConfiguration();
      
      spinner.succeed('Status loaded');
      
      console.log(chalk.cyan('\n📊 CEL Status:'));
      console.log(chalk.white(`  Server: ${status.connected ? chalk.green('Connected') : chalk.red('Disconnected')}`));
      console.log(chalk.white(`  Version: ${config.version || '4.2.1'}`));
      console.log(chalk.white(`  AI Provider: ${config.ai?.defaultProvider || 'openrouter'}`));
      console.log(chalk.white(`  Models: ${config.ai?.availableModels?.length || 'N/A'} available`));
      
    } catch (error) {
      spinner.fail('Failed to load status');
      console.error(chalk.red(`❌ ${error.message}`));
    }
  }

  displayHistory(count = 10) {
    const recent = this.history.slice(-count);
    console.log(chalk.cyan(`\n📜 Recent Commands (${recent.length}):`));
    
    recent.forEach((cmd, index) => {
      console.log(chalk.white(`  ${index + 1}. ${cmd}`));
    });
  }

  // Additional helper methods would be implemented here...
  async getTemplate(type, templateName) {
    // Template loading implementation
    return { prompts: [] };
  }

  async generateCodeWithAI(type, name, context, options) {
    // AI code generation implementation
    return `// Generated ${type} for ${name}`;
  }

  applyTemplate(code, template, variables) {
    // Template application implementation
    return code;
  }

  // Additional methods for testing, analysis, etc. would be implemented...
}

// Plugin base class
class Plugin {
  constructor(name, version) {
    this.name = name;
    this.version = version;
  }

  async execute(...args) {
    throw new Error('Plugin execute method not implemented');
  }
}

// Built-in plugins
class GitPlugin extends Plugin {
  constructor() {
    super('git', '1.0.0');
  }

  async execute(action, ...args) {
    // Git operations implementation
    console.log(`Git plugin executing: ${action}`);
  }
}

class DockerPlugin extends Plugin {
  constructor() {
    super('docker', '1.0.0');
  }

  async execute(action, ...args) {
    // Docker operations implementation
    console.log(`Docker plugin executing: ${action}`);
  }
}

class DeployPlugin extends Plugin {
  constructor() {
    super('deploy', '1.0.0');
  }

  async execute(target, options) {
    // Deployment operations implementation
    console.log(`Deploy plugin executing: ${target}`);
  }
}

class MonitorPlugin extends Plugin {
  constructor() {
    super('monitor', '1.0.0');
  }

  async execute(action, options) {
    // Monitoring operations implementation
    console.log(`Monitor plugin executing: ${action}`);
  }
}

// Export and main execution
export default EnhancedCLI;

// Auto-run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const cli = new EnhancedCLI();
  const program = cli.createProgram();
  
  if (process.argv.length === 2) {
    program.help();
  } else {
    program.parse();
  }
}
