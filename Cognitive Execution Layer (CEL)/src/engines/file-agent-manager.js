import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import util from 'util';
import { ProjectContextAnalyzer } from './project-context-analyzer.js';
import { CodeTesterLinter } from './code-tester-linter.js';
import { CodeAnalysis } from './code-analysis.js';
import { AgentProtocol } from './agent-protocol.js';

const execAsync = util.promisify(exec);

/**
 * Агент для отдельного файла
 */
export class FileAgent {
  constructor(filePath, projectRoot) {
    this.filePath = filePath;
    this.projectRoot = projectRoot;
    this.lastModified = null;
    this.changeHistory = [];
    this.impactCache = {};
    this.agentId = `file-agent-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    this.protocol = new AgentProtocol();
    this.protocol.registerAgent(this.agentId, {
      type: 'file_agent',
      filePath: this.filePath,
      capabilities: ['file_analysis', 'change_detection', 'impact_analysis']
    });
  }

  /**
   * Мониторит изменения в файле
   */
  async monitorChanges() {
    try {
      const stats = await fs.stat(this.filePath);
      const currentModified = stats.mtimeMs;

      if (this.lastModified && this.lastModified !== currentModified) {
        // Файл изменился
        const changes = await this.analyzeChanges();
        this.changeHistory.push(changes);
        
        // Отправляем уведомление через протокол агентов
        await this.protocol.sendMessage(
          this.agentId,
          'file-change-notifier',
          {
            type: 'file_changed',
            filePath: this.filePath,
            changes,
            timestamp: Date.now()
          }
        );
        
        return changes;
      }

      this.lastModified = currentModified;
      return null;
    } catch (error) {
      console.error(`Error monitoring changes for ${this.filePath}:`, error.message);
      return null;
    }
  }

  /**
   * Анализирует изменения в файле
   */
  async analyzeChanges() {
    try {
      const content = await fs.readFile(this.filePath, 'utf8');
      const extension = path.extname(this.filePath).substring(1);

      // Определяем тип контента и потенциальное воздействие
      const analysis = {
        filePath: this.filePath,
        extension,
        size: content.length,
        lineCount: content.split('\n').length,
        complexity: this.estimateComplexity(content),
        potentialIssues: this.findPotentialIssues(content),
        dependencies: await this.findDependencies(content)
      };

      return analysis;
    } catch (error) {
      console.error(`Error analyzing changes for ${this.filePath}:`, error.message);
      return null;
    }
  }

  /**
   * Оценивает сложность кода
   */
  estimateComplexity(content) {
    // Простая эвристика для оценки сложности
    const lines = content.split('\n');
    let complexity = 0;

    for (const line of lines) {
      if (line.includes('if') || line.includes('for') || line.includes('while') || line.includes('switch')) {
        complexity += 1;
      }
      if (line.includes('function') || line.includes('class') || line.includes('def')) {
        complexity += 2;
      }
      if (line.includes('{') && line.includes('}')) {
        complexity += 0.5;
      }
    }

    return complexity;
  }

  /**
   * Находит потенциальные проблемы в коде
   */
  findPotentialIssues(content) {
    const issues = [];
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Проверяем на потенциальные проблемы
      if (line.includes('TODO') || line.includes('FIXME') || line.includes('HACK')) {
        issues.push({
          type: 'todo_marker',
          line: i + 1,
          description: 'Found TODO/FIXME/HACK marker',
          code: line.trim()
        });
      }
      
      if (line.toLowerCase().includes('console.log') || line.toLowerCase().includes('print(')) {
        issues.push({
          type: 'debug_statement',
          line: i + 1,
          description: 'Debug statement found',
          code: line.trim()
        });
      }
      
      if (line.length > 120) {
        issues.push({
          type: 'long_line',
          line: i + 1,
          description: 'Line too long (>120 chars)',
          code: line.trim()
        });
      }
    }

    return issues;
  }

  /**
   * Находит зависимости в файле
   */
  async findDependencies(content) {
    const deps = [];
    const extension = path.extname(this.filePath).substring(1);
    
    if (extension === 'js' || extension === 'ts') {
      // Поиск импортов в JS/TS
      const importRegex = /(import\s+|from\s+|require\(\s*)["'](.*?\.(js|ts))?["']/g;
      let match;
      while ((match = importRegex.exec(content)) !== null) {
        deps.push(match[2]);
      }
    } else if (extension === 'swift') {
      // Поиск импортов в Swift
      const importRegex = /^import\s+(\w+)/gm;
      let match;
      while ((match = importRegex.exec(content)) !== null) {
        deps.push(match[1]);
      }
    } else if (extension === 'py') {
      // Поиск импортов в Python
      const importRegex = /^(import\s+|from\s+)([\w\d_.]+)/gm;
      let match;
      while ((match = importRegex.exec(content)) !== null) {
        deps.push(match[2]);
      }
    }

    return deps;
  }

  /**
   * Анализирует влияние изменений на другие файлы
   */
  async analyzeImpact() {
    try {
      // Получаем зависимости проекта
      const projectStructure = await ProjectContextAnalyzer.getProjectStructure(this.projectRoot);
      
      // Находим файлы, которые могут быть затронуты изменениями
      const impactedFiles = [];
      
      // Простая эвристика: находим файлы с похожими именами или в той же директории
      const currentDir = path.dirname(this.filePath);
      const fileName = path.basename(this.filePath, path.extname(this.filePath));
      
      for (const [ext, files] of Object.entries(projectStructure.fileGroups)) {
        for (const file of files) {
          const fullPath = path.join(this.projectRoot, file);
          const fileDir = path.dirname(fullPath);
          const baseName = path.basename(fullPath, path.extname(fullPath));
          
          // Проверяем, если файл в той же директории или имеет схожее имя
          if (fileDir === currentDir || baseName.includes(fileName) || fileName.includes(baseName)) {
            if (fullPath !== this.filePath) {
              impactedFiles.push(fullPath);
            }
          }
        }
      }
      
      // Кэшируем результат
      this.impactCache = {
        timestamp: Date.now(),
        impactedFiles
      };
      
      return impactedFiles;
    } catch (error) {
      console.error(`Error analyzing impact for ${this.filePath}:`, error.message);
      return [];
    }
  }

  /**
   * Генерирует предложения по рефакторингу
   */
  async generateRefactoringSuggestions() {
    try {
      const content = await fs.readFile(this.filePath, 'utf8');
      const suggestions = [];
      
      // Пример простой логики для генерации предложений
      if (this.estimateComplexity(content) > 20) {
        suggestions.push({
          type: 'complexity',
          priority: 'high',
          description: 'File has high complexity, consider refactoring into smaller functions',
          location: 'entire_file'
        });
      }
      
      const issues = this.findPotentialIssues(content);
      for (const issue of issues) {
        suggestions.push({
          type: 'issue_fix',
          priority: 'medium',
          description: issue.description,
          location: `line_${issue.line}`,
          code: issue.code
        });
      }
      
      return suggestions;
    } catch (error) {
      console.error(`Error generating refactoring suggestions for ${this.filePath}:`, error.message);
      return [];
    }
  }
}

/**
 * Менеджер агентов для файлов проекта
 */
export class FileAgentManager {
  constructor(projectRoot) {
    this.projectRoot = projectRoot;
    this.agents = new Map(); // карта: filePath -> FileAgent
    this.activeMonitoring = new Set(); // активные файлы для мониторинга
    this.monitoringInterval = null;
    this.monitoringFrequency = 5000; // 5 секунд
    this.protocol = new AgentProtocol();
    this.protocol.registerAgent('file-manager', {
      type: 'file_manager',
      projectRoot: this.projectRoot,
      capabilities: ['file_management', 'project_analysis', 'agent_coordination']
    });
  }

  /**
   * Создает агента для файла
   */
  createAgent(filePath) {
    if (!this.agents.has(filePath)) {
      const agent = new FileAgent(filePath, this.projectRoot);
      this.agents.set(filePath, agent);
    }
    
    return this.agents.get(filePath);
  }

  /**
   * Добавляет файл в мониторинг
   */
  async addFileToMonitoring(filePath) {
    const agent = this.createAgent(filePath);
    this.activeMonitoring.add(filePath);
    
    // Запускаем анализ при добавлении
    const changes = await agent.monitorChanges();
    if (changes) {
      return changes;
    }
    
    return null;
  }

  /**
   * Запускает периодический мониторинг
   */
  startMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    
    this.monitoringInterval = setInterval(async () => {
      try {
        const changes = await this.monitorAllActiveFiles();
        if (changes.length > 0) {
          // Отправляем уведомление о изменениях
          await this.protocol.broadcastMessage(
            'file-manager',
            {
              type: 'project_changes_detected',
              changes,
              timestamp: Date.now()
            },
            ['orchestrator', 'code-analyzer', 'change-detector']
          );
        }
      } catch (error) {
        console.error('[FileAgentManager] Monitoring error:', error.message);
      }
    }, this.monitoringFrequency);
  }

  /**
   * Останавливает мониторинг
   */
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  /**
   * Удаляет файл из мониторинга
   */
  removeFileFromMonitoring(filePath) {
    this.activeMonitoring.delete(filePath);
    this.agents.delete(filePath);
  }

  /**
   * Мониторит изменения во всех активных файлах
   */
  async monitorAllActiveFiles() {
    const allChanges = [];
    
    for (const filePath of this.activeMonitoring) {
      try {
        const agent = this.agents.get(filePath);
        const changes = await agent.monitorChanges();
        
        if (changes) {
          // Добавляем информацию о влиянии на другие файлы
          changes.impact = await agent.analyzeImpact();
          allChanges.push(changes);
        }
      } catch (error) {
        console.error(`Error monitoring ${filePath}:`, error.message);
      }
    }
    
    return allChanges;
  }

  /**
   * Генерирует предложения для всех агентов
   */
  async generateAllSuggestions() {
    const allSuggestions = [];
    
    for (const [filePath, agent] of this.agents.entries()) {
      const suggestions = await agent.generateRefactoringSuggestions();
      
      if (suggestions.length > 0) {
        allSuggestions.push({
          filePath,
          suggestions
        });
      }
    }
    
    return allSuggestions;
  }

  /**
   * Завершает работу менеджера
   */
  async shutdown() {
    this.stopMonitoring();
    
    // Завершаем работу всех агентов
    for (const [filePath, agent] of this.agents.entries()) {
      await agent.protocol.shutdown();
    }
    
    await this.protocol.shutdown();
    console.log('[FileAgentManager] Shutdown complete');
  }

  /**
   * Запускает полный анализ проекта
   */
  async fullProjectAnalysis() {
    try {
      // Получаем структуру проекта
      const structure = await ProjectContextAnalyzer.getProjectStructure(this.projectRoot);
      
      // Создаем агентов для всех файлов
      for (const [ext, files] of Object.entries(structure.fileGroups)) {
        // Ограничиваем анализ только критичными типами файлов
        if (['js', 'ts', 'swift', 'py', 'java', 'cpp', 'c', 'h', 'hpp', 'cs', 'go', 'rb', 'php', 'rs', 'kt', 'dart'].includes(ext)) {
          for (const relativePath of files) {
            const fullPath = path.join(this.projectRoot, relativePath);
            this.createAgent(fullPath);
          }
        }
      }
      
      // Запускаем анализ для всех файлов
      const results = [];
      
      for (const [filePath, agent] of this.agents.entries()) {
        const analysis = await agent.analyzeChanges();
        if (analysis) {
          analysis.impact = await agent.analyzeImpact();
          analysis.suggestions = await agent.generateRefactoringSuggestions();
          results.push(analysis);
        }
      }
      
      return results;
    } catch (error) {
      console.error('Error during full project analysis:', error.message);
      return [];
    }
  }
}