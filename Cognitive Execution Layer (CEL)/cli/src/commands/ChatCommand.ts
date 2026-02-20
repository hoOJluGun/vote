import { Command } from 'commander';
import readline from 'readline';
import chalk from 'chalk';
// @ts-ignore
import gradient from 'gradient-string';
import ora from 'ora';
import { CELService } from '../services/CELService';
import { Logger } from '../utils';
import { ChatHistory } from '../types';

export class ChatCommand {
  private celService: CELService;
  private history: ChatHistory[] = [];

  constructor(celService: CELService) {
    this.celService = celService;
  }

  public register(program: Command): void {
    program
      .command('chat')
      .description('Start interactive AI chat session with CEL')
      .option('-c, --context <path>', 'Project context path')
      .option('-s, --system <prompt>', 'Custom system prompt')
      .option('-m, --model <model>', 'Specific AI model to use')
      .action(async (options) => {
        await this.execute(options);
      });
  }

  private async execute(options: any): Promise<void> {
    this.displayWelcome();

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: chalk.blue('🧠 CEL > ')
    });

    rl.prompt();

    rl.on('line', async (input) => {
      const trimmedInput = input.trim();
      
      if (this.handleSpecialCommands(trimmedInput, rl)) {
        return;
      }

      if (trimmedInput === '') {
        rl.prompt();
        return;
      }

      await this.processChatInput(trimmedInput, options, rl);
    });

    rl.on('close', () => {
      Logger.info('Chat session ended. Goodbye!');
      process.exit(0);
    });
  }

  private displayWelcome(): void {
    const asciiArt = `
${chalk.cyan.bold(' ██████╗███████╗██╗      ')}${chalk.blue.bold('██████╗ ')}${chalk.magenta.bold('███████╗')}
${chalk.cyan.bold('██╔════╝██╔════╝██║      ')}${chalk.blue.bold('██╔══██╗')}${chalk.magenta.bold('██╔════╝')}
${chalk.cyan.bold('██║     █████╗  ██║█████╗')}${chalk.blue.bold('██████╔╝')}${chalk.magenta.bold('█████╗  ')}
${chalk.cyan.bold('██║     ██╔══╝  ██║╚════╝')}${chalk.blue.bold('██╔═══╝ ')}${chalk.magenta.bold('██╔══╝  ')}
${chalk.cyan.bold('╚██████╗███████╗██║      ')}${chalk.blue.bold('██║     ')}${chalk.magenta.bold('███████╗')}
${chalk.cyan.bold(' ╚═════╝╚══════╝╚═╝      ')}${chalk.blue.bold('╚═╝     ')}${chalk.magenta.bold('╚══════╝')}
`;

    console.log(gradient.pastel.multiline(asciiArt));
    Logger.success('Welcome to CEL Interactive Chat!');
    console.log(chalk.gray('Type "help" for commands, "exit" to quit\n'));
  }

  private handleSpecialCommands(input: string, rl: readline.Interface): boolean {
    switch (input.toLowerCase()) {
      case 'exit':
      case 'quit':
        rl.close();
        return true;
      
      case 'clear':
        console.clear();
        this.displayWelcome();
        rl.prompt();
        return true;
      
      case 'history':
        this.showHistory();
        rl.prompt();
        return true;
      
      case 'help':
        this.showHelp();
        rl.prompt();
        return true;
      
      default:
        return false;
    }
  }

  private async processChatInput(input: string, options: any, rl: readline.Interface): Promise<void> {
    const spinner = ora({
      text: chalk.gray('Thinking...'),
      spinner: 'clock'
    }).start();

    try {
      const response = await this.celService.chat([
        { role: 'user', content: input }
      ], options.model);

      spinner.succeed(chalk.green('Response ready!'));
      
      console.log(chalk.cyan('\n🤖 AI Response:'));
      console.log(chalk.white(this.formatResponse(response)));
      console.log('');
      
      this.history.push({
        user: input,
        ai: response,
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      spinner.fail(chalk.red('Error processing request'));
      Logger.error(error.message);
    }
    
    rl.prompt();
  }

  private showHistory(): void {
    if (this.history.length === 0) {
      Logger.info('No chat history yet');
      return;
    }

    console.log(chalk.cyan('\n📖 Chat History:'));
    this.history.forEach((entry, index) => {
      console.log(chalk.gray(`${index + 1}.`), chalk.white(entry.user));
      console.log(chalk.gray('   →'), chalk.green(entry.ai.substring(0, 100) + '...'));
    });
  }

  private showHelp(): void {
    console.log(chalk.cyan('\n❓ Available Commands:'));
    console.log(chalk.white('  exit/quit  - End chat session'));
    console.log(chalk.white('  clear      - Clear screen'));
    console.log(chalk.white('  history    - Show chat history'));
    console.log(chalk.white('  help       - Show this help'));
    console.log(chalk.white('\n💬 Just type your message to chat with AI'));
  }

  private formatResponse(response: string): string {
    // Add some basic formatting
    return response
      .replace(/\*\*(.*?)\*\*/g, chalk.bold('$1'))
      .replace(/\*(.*?)\*/g, chalk.italic('$1'))
      .replace(/`(.*?)`/g, chalk.yellow('$1'));
  }
}