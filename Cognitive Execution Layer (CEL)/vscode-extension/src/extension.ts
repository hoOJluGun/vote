import * as vscode from 'vscode';
import axios from 'axios';
import { CELChatViewProvider } from './chatViewProvider';
import { CELProjectDataProvider } from './projectDataProvider';
import { CELPerformanceProvider } from './performanceProvider';

export function activate(context: vscode.ExtensionContext) {
	console.log('Cognitive Execution Layer extension is now active!');

	// Initialize CEL service
	const celService = new CELService();

	// Register chat view provider
	const chatViewProvider = new CELChatViewProvider(context.extensionUri, celService);
	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(
			'cel-chat-view',
			chatViewProvider
		)
	);

	// Register project data provider
	const projectDataProvider = new CELProjectDataProvider(celService);
	context.subscriptions.push(
		vscode.window.registerTreeDataProvider(
			'cel-project-view',
			projectDataProvider
		)
	);

	// Register performance provider
	const performanceProvider = new CELPerformanceProvider(context.extensionUri, celService);
	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(
			'cel-performance-view',
			performanceProvider
		)
	);

	// Register commands
	const commands = [
		vscode.commands.registerCommand('cel.chat', () => {
			vscode.commands.executeCommand('workbench.view.extension.cel-sidebar');
			// Focus on chat view
			setTimeout(() => {
				vscode.commands.executeCommand('cel-chat-view.focus');
			}, 100);
		}),

		vscode.commands.registerCommand('cel.refactor', async () => {
			const editor = vscode.window.activeTextEditor;
			if (!editor) {
				vscode.window.showErrorMessage('No active editor found');
				return;
			}

			const selection = editor.selection;
			const selectedText = editor.document.getText(selection);
			
			if (!selectedText.trim()) {
				vscode.window.showErrorMessage('No text selected for refactoring');
				return;
			}

			const progress = await vscode.window.withProgress(
				{
					location: vscode.ProgressLocation.Notification,
					title: 'Refactoring code...',
					cancellable: true
				},
				async (progress, token) => {
					token.onCancellationRequested(() => {
						console.log('User canceled the refactoring');
					});

					try {
						const result = await celService.refactorCode(
							selectedText,
							editor.document.fileName,
							progress
						);
						
						if (result.success) {
							const edit = new vscode.WorkspaceEdit();
							edit.replace(
								editor.document.uri,
								selection,
								result.code
							);
							
							await vscode.workspace.applyEdit(edit);
							vscode.window.showInformationMessage('Code refactored successfully!');
						} else {
							vscode.window.showErrorMessage(`Refactoring failed: ${result.error}`);
						}
					} catch (error) {
						vscode.window.showErrorMessage(`Refactoring error: ${error}`);
					}
				}
			);
		}),

		vscode.commands.registerCommand('cel.explain', async () => {
			const editor = vscode.window.activeTextEditor;
			if (!editor) {
				vscode.window.showErrorMessage('No active editor found');
				return;
			}

			const selection = editor.selection;
			const selectedText = editor.document.getText(selection);
			const fileName = editor.document.fileName;

			const progress = await vscode.window.withProgress(
				{
					location: vscode.ProgressLocation.Notification,
					title: 'Analyzing code...',
					cancellable: false
				},
				async () => {
					try {
						const explanation = await celService.explainCode(selectedText, fileName);
						
						// Create output panel
						const panel = vscode.window.createWebviewPanel(
							'celExplanation',
							'Code Explanation',
							vscode.ViewColumn.Beside,
							{
								enableScripts: true,
								retainContextWhenHidden: true
							}
						);

						panel.webview.html = getExplanationHtml(explanation, selectedText);
						
					} catch (error) {
						vscode.window.showErrorMessage(`Analysis failed: ${error}`);
					}
				}
			);
		}),

		vscode.commands.registerCommand('cel.generateTests', async () => {
			const editor = vscode.window.activeTextEditor;
			if (!editor) {
				vscode.window.showErrorMessage('No active editor found');
				return;
			}

			const document = editor.document;
			const fileName = document.fileName;
			const fileContent = document.getText();

			const progress = await vscode.window.withProgress(
				{
					location: vscode.ProgressLocation.Notification,
					title: 'Generating tests...',
					cancellable: true
				},
				async (progress, token) => {
					token.onCancellationRequested(() => {
						console.log('User canceled test generation');
					});

					try {
						const testResult = await celService.generateTests(fileName, fileContent);
						
						if (testResult.success) {
							// Create new test file
							const testFileName = fileName.replace(/\.[^/.]+$/, '.test.js');
							const testUri = vscode.Uri.file(testFileName);
							
							await vscode.workspace.fs.writeFile(
								testUri,
								new TextEncoder().encode(testResult.tests)
							);
							
							vscode.window.showInformationMessage(`Tests generated: ${testFileName}`);
							
							// Open the test file
							const document = await vscode.workspace.openTextDocument(testUri);
							await vscode.window.showTextDocument(document);
						} else {
							vscode.window.showErrorMessage(`Test generation failed: ${testResult.error}`);
						}
					} catch (error) {
						vscode.window.showErrorMessage(`Test generation error: ${error}`);
					}
				}
			);
		}),

		vscode.commands.registerCommand('cel.optimize', async () => {
			const editor = vscode.window.activeTextEditor;
			if (!editor) {
				vscode.window.showErrorMessage('No active editor found');
				return;
			}

			const document = editor.document;
			const fileName = document.fileName;
			const fileContent = document.getText();

			const progress = await vscode.window.withProgress(
				{
					location: vscode.ProgressLocation.Notification,
					title: 'Optimizing code...',
					cancellable: true
				},
				async (progress, token) => {
					token.onCancellationRequested(() => {
						console.log('User canceled optimization');
					});

					try {
						const optimization = await celService.optimizeCode(fileName, fileContent);
						
						if (optimization.success) {
							const panel = vscode.window.createWebviewPanel(
								'celOptimization',
								'Code Optimization Suggestions',
								vscode.ViewColumn.Beside,
								{
									enableScripts: true,
									retainContextWhenHidden: true
								}
							);

							panel.webview.html = getOptimizationHtml(optimization.suggestions, fileContent);
						} else {
							vscode.window.showErrorMessage(`Optimization failed: ${optimization.error}`);
						}
					} catch (error) {
						vscode.window.showErrorMessage(`Optimization error: ${error}`);
					}
				}
			);
		}),

		vscode.commands.registerCommand('cel.review', async (uri: vscode.Uri) => {
			const fileName = uri.fsPath;
			
			const progress = await vscode.window.withProgress(
				{
					location: vscode.ProgressLocation.Notification,
					title: 'Reviewing code...',
					cancellable: false
				},
				async () => {
					try {
						const review = await celService.reviewCode(fileName);
						
						if (review.success) {
							const panel = vscode.window.createWebviewPanel(
								'celReview',
								'Code Review',
								vscode.ViewColumn.Beside,
								{
									enableScripts: true,
									retainContextWhenHidden: true
								}
							);

							panel.webview.html = getReviewHtml(review.findings, fileName);
						} else {
							vscode.window.showErrorMessage(`Code review failed: ${review.error}`);
						}
					} catch (error) {
						vscode.window.showErrorMessage(`Code review error: ${error}`);
					}
				}
			);
		})
	];

	context.subscriptions.push(...commands);

	// Set up auto-completion if enabled
	const config = vscode.workspace.getConfiguration('cel');
	if (config.get('enableAutoCompletion')) {
		setupAutoCompletion(context, celService);
	}

	// Set up performance metrics if enabled
	if (config.get('showPerformanceMetrics')) {
		setupPerformanceMetrics(context, celService);
	}

	console.log('CEL extension activated successfully!');
}

export function deactivate() {
	console.log('Cognitive Execution Layer extension is now deactivated');
}

// CEL Service Class
class CELService {
	private apiUrl: string;
	private apiKey: string;
	private defaultModel: string;

	constructor() {
		const config = vscode.workspace.getConfiguration('cel');
		this.apiUrl = 'http://localhost:3000'; // Default CEL server
		this.apiKey = config.get('apiKey') || '';
		this.defaultModel = config.get('defaultModel') || 'upstage/solar-pro-3:free';
	}

	async refactorCode(code: string, fileName: string, progress?: any): Promise<any> {
		try {
			const response = await axios.post(`${this.apiUrl}/v1/code-assist`, {
				messages: [
					{
						role: "user",
						content: `Refactor this code to improve readability, performance, and maintainability:\n\n${code}`
					}
				],
				file: fileName,
				max_tokens: 2048
			});

			return {
				success: true,
				code: response.data.choices[0].message.content
			};
		} catch (error) {
			return {
				success: false,
				error: error.message
			};
		}
	}

	async explainCode(code: string, fileName: string): Promise<string> {
		try {
			const response = await axios.post(`${this.apiUrl}/v1/code-assist`, {
				messages: [
					{
						role: "user",
						content: `Explain this code in detail, including its purpose, functionality, and key components:\n\n${code}`
					}
				],
				file: fileName,
				max_tokens: 1024
			});

			return response.data.choices[0].message.content;
		} catch (error) {
			throw new Error(`Failed to explain code: ${error.message}`);
		}
	}

	async generateTests(fileName: string, fileContent: string): Promise<any> {
		try {
			const response = await axios.post(`${this.apiUrl}/v1/code-assist`, {
				messages: [
					{
						role: "user",
						content: `Generate comprehensive unit tests for this code:\n\n${fileContent}`
					}
				],
				file: fileName,
				max_tokens: 2048
			});

			return {
				success: true,
				tests: response.data.choices[0].message.content
			};
		} catch (error) {
			return {
				success: false,
				error: error.message
			};
		}
	}

	async optimizeCode(fileName: string, fileContent: string): Promise<any> {
		try {
			const response = await axios.post(`${this.apiUrl}/v1/code-assist`, {
				messages: [
					{
						role: "user",
						content: `Analyze this code and provide optimization suggestions for performance, memory usage, and best practices:\n\n${fileContent}`
					}
				],
				file: fileName,
				max_tokens: 1536
			});

			return {
				success: true,
				suggestions: response.data.choices[0].message.content
			};
		} catch (error) {
			return {
				success: false,
				error: error.message
			};
		}
	}

	async reviewCode(fileName: string): Promise<any> {
		try {
			const fileContent = await vscode.workspace.fs.readFile(vscode.Uri.file(fileName));
			const content = new TextDecoder().decode(fileContent);

			const response = await axios.post(`${this.apiUrl}/v1/code-assist`, {
				messages: [
					{
						role: "user",
						content: `Perform a comprehensive code review of this file. Identify potential bugs, security issues, code smells, and improvement opportunities:\n\n${content}`
					}
				],
				file: fileName,
				max_tokens: 2048
			});

			return {
				success: true,
				findings: response.data.choices[0].message.content
			};
		} catch (error) {
			return {
				success: false,
				error: error.message
			};
		}
	}

	async getProjectContext(): Promise<any> {
		try {
			const response = await axios.get(`${this.apiUrl}/v1/project-context/${vscode.workspace.rootPath}`);
			return response.data;
		} catch (error) {
			throw new Error(`Failed to get project context: ${error.message}`);
		}
	}

	async getPerformanceMetrics(): Promise<any> {
		try {
			const response = await axios.get(`${this.apiUrl}/health`);
			return response.data;
		} catch (error) {
			throw new Error(`Failed to get performance metrics: ${error.message}`);
		}
	}
}

// Auto-completion setup
function setupAutoCompletion(context: vscode.ExtensionContext, celService: CELService) {
	const provider = vscode.languages.registerCompletionItemProvider(
		'*',
		{
			async provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {
				const textBeforeCursor = document.getText(
					new vscode.Range(position.with(undefined, 0), position)
				);

				// Simple trigger - you might want more sophisticated triggering logic
				if (textBeforeCursor.endsWith('// cel:') || textBeforeCursor.endsWith('# cel:')) {
					try {
						const response = await celService.refactorCode(
							textBeforeCursor,
							document.fileName
						);

						if (response.success) {
							const completionItem = new vscode.CompletionItem(
								'AI-generated completion',
								vscode.CompletionItemKind.Snippet
							);
							completionItem.insertText = response.code;
							completionItem.detail = 'Generated by CEL AI';
							completionItem.documentation = new vscode.MarkdownString(
								'Intelligent code completion powered by Cognitive Execution Layer'
							);
							
							return [completionItem];
						}
					} catch (error) {
						console.error('Auto-completion error:', error);
					}
				}

				return undefined;
			}
		},
		':', ' ', '\n' // Trigger characters
	);

	context.subscriptions.push(provider);
}

// Performance metrics setup
function setupPerformanceMetrics(context: vscode.ExtensionContext, celService: CELService) {
	const statusBarItem = vscode.window.createStatusBarItem(
		vscode.StatusBarAlignment.Right,
		100
	);
	statusBarItem.text = '$(hubot) CEL';
	statusBarItem.tooltip = 'Cognitive Execution Layer Status';
	statusBarItem.command = 'cel.status';
	context.subscriptions.push(statusBarItem);
	statusBarItem.show();

	// Update status periodically
	setInterval(async () => {
		try {
			const metrics = await celService.getPerformanceMetrics();
			const model = vscode.workspace.getConfiguration('cel').get('defaultModel');
			
			statusBarItem.text = `$(hubot) CEL: ${metrics.status === 'ok' ? '✓' : '✗'} | ${model.split('/')[1].split(':')[0]}`;
			statusBarItem.backgroundColor = metrics.status === 'ok' 
				? undefined 
				: new vscode.ThemeColor('statusBarItem.errorBackground');
		} catch (error) {
			statusBarItem.text = '$(hubot) CEL: ⚠';
			statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
		}
	}, 30000); // Update every 30 seconds
}

// HTML templates
function getExplanationHtml(explanation: string, code: string): string {
	return `
		<!DOCTYPE html>
		<html>
		<head>
			<meta charset="UTF-8">
			<meta name="viewport" content="width=device-width, initial-scale=1.0">
			<style>
				body {
					font-family: var(--vscode-font-family);
					background-color: var(--vscode-editor-background);
					color: var(--vscode-editor-foreground);
					padding: 20px;
					line-height: 1.6;
				}
				.container {
					max-width: 800px;
					margin: 0 auto;
				}
				.code-block {
					background-color: var(--vscode-textBlockQuote-background);
					border-left: 3px solid var(--vscode-textBlockQuote-border);
					padding: 15px;
					margin: 20px 0;
					overflow-x: auto;
				}
				.explanation {
					margin-top: 20px;
				}
				h1, h2, h3 {
					color: var(--vscode-editor-foreground);
				}
				code {
					background-color: var(--vscode-textCodeBlock-background);
					padding: 2px 4px;
					border-radius: 3px;
				}
				pre {
					background-color: var(--vscode-textCodeBlock-background);
					padding: 15px;
					border-radius: 5px;
					overflow-x: auto;
				}
			</style>
		</head>
		<body>
			<div class="container">
				<h1>Code Explanation</h1>
				
				<h2>Analyzed Code:</h2>
				<div class="code-block">
					<pre><code>${escapeHtml(code)}</code></pre>
				</div>
				
				<div class="explanation">
					<h2>Explanation:</h2>
					${formatMarkdown(explanation)}
				</div>
			</div>
		</body>
		</html>
	`;
}

function getOptimizationHtml(suggestions: string, code: string): string {
	return `
		<!DOCTYPE html>
		<html>
		<head>
			<meta charset="UTF-8">
			<meta name="viewport" content="width=device-width, initial-scale=1.0">
			<style>
				body {
					font-family: var(--vscode-font-family);
					background-color: var(--vscode-editor-background);
					color: var(--vscode-editor-foreground);
					padding: 20px;
					line-height: 1.6;
				}
				.container {
					max-width: 900px;
					margin: 0 auto;
				}
				.suggestion {
					background-color: var(--vscode-list-hoverBackground);
					border-left: 4px solid var(--vscode-list-highlightForeground);
					padding: 15px;
					margin: 15px 0;
					border-radius: 4px;
				}
				.code-original, .code-improved {
					background-color: var(--vscode-textCodeBlock-background);
					padding: 15px;
					margin: 10px 0;
					border-radius: 5px;
					overflow-x: auto;
				}
				.diff-added {
					background-color: rgba(40, 167, 69, 0.2);
				}
				.diff-removed {
					background-color: rgba(220, 53, 69, 0.2);
				}
				h1, h2, h3 {
					color: var(--vscode-editor-foreground);
				}
				.tag {
					display: inline-block;
					background-color: var(--vscode-badge-background);
					color: var(--vscode-badge-foreground);
					padding: 2px 8px;
					border-radius: 12px;
					font-size: 0.8em;
					margin-right: 8px;
				}
			</style>
		</head>
		<body>
			<div class="container">
				<h1>Code Optimization Suggestions</h1>
				${formatOptimizationSuggestions(suggestions)}
			</div>
		</body>
		</html>
	`;
}

function getReviewHtml(findings: string, fileName: string): string {
	return `
		<!DOCTYPE html>
		<html>
		<head>
			<meta charset="UTF-8">
			<meta name="viewport" content="width=device-width, initial-scale=1.0">
			<style>
				body {
					font-family: var(--vscode-font-family);
					background-color: var(--vscode-editor-background);
					color: var(--vscode-editor-foreground);
					padding: 20px;
					line-height: 1.6;
				}
				.container {
					max-width: 900px;
					margin: 0 auto;
				}
				.finding {
					background-color: var(--vscode-list-hoverBackground);
					border-left: 4px solid var(--vscode-list-highlightForeground);
					padding: 15px;
					margin: 15px 0;
					border-radius: 4px;
				}
				.severity-high { border-left-color: #dc3545; }
				.severity-medium { border-left-color: #ffc107; }
				.severity-low { border-left-color: #28a745; }
				.code-snippet {
					background-color: var(--vscode-textCodeBlock-background);
					padding: 10px;
					margin: 10px 0;
					border-radius: 3px;
					font-family: var(--vscode-editor-font-family);
					font-size: var(--vscode-editor-font-size);
				}
				h1, h2, h3 {
					color: var(--vscode-editor-foreground);
				}
				.badge {
					display: inline-block;
					padding: 2px 8px;
					border-radius: 12px;
					font-size: 0.8em;
					font-weight: bold;
				}
				.badge-high { background-color: rgba(220, 53, 69, 0.2); color: #dc3545; }
				.badge-medium { background-color: rgba(255, 193, 7, 0.2); color: #ffc107; }
				.badge-low { background-color: rgba(40, 167, 69, 0.2); color: #28a745; }
			</style>
		</head>
		<body>
			<div class="container">
				<h1>Code Review: ${fileName.split('/').pop()}</h1>
				${formatReviewFindings(findings)}
			</div>
		</body>
		</html>
	`;
}

// Utility functions
function escapeHtml(unsafe: string): string {
	return unsafe
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");
}

function formatMarkdown(text: string): string {
	// Simple markdown formatting
	return text
		.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
		.replace(/\*(.*?)\*/g, '<em>$1</em>')
		.replace(/`(.*?)`/g, '<code>$1</code>')
		.replace(/\n/g, '<br>');
}

function formatOptimizationSuggestions(suggestions: string): string {
	// Parse and format optimization suggestions
	const sections = suggestions.split('\n\n');
	let html = '';

	sections.forEach(section => {
		if (section.trim()) {
			html += `<div class="suggestion">${formatMarkdown(section)}</div>`;
		}
	});

	return html;
}

function formatReviewFindings(findings: string): string {
	// Parse and format code review findings
	const lines = findings.split('\n');
	let html = '';
	let currentFinding = '';

	lines.forEach(line => {
		if (line.startsWith('- ') || line.startsWith('* ')) {
			if (currentFinding) {
				html += `<div class="finding">${formatMarkdown(currentFinding)}</div>`;
			}
			currentFinding = line.substring(2);
		} else if (line.trim()) {
			currentFinding += '\n' + line;
		}
	});

	if (currentFinding) {
		html += `<div class="finding">${formatMarkdown(currentFinding)}</div>`;
	}

	return html;
}