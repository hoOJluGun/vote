/**
 * Safe Patch Generator
 * 
 * Генерирует безопасные патчи в песочнице
 */

import { VirtualSandbox } from './virtual-sandbox.js';
import { ProjectKnowledgeGraph } from './project-knowledge-graph.js';

export class SafePatchGenerator {
  constructor(options = {}) {
    this.sandbox = new VirtualSandbox();
    this.projectGraph = new ProjectKnowledgeGraph();
    this.maxEntropyDelta = options.maxEntropyDelta || 0.1; // 10% максимум
    this.maxAffectedFiles = options.maxAffectedFiles || 5;
    this.maxLinesChanged = options.maxLinesChanged || 50;
    this.coreModules = options.coreModules || [
      'self-healing-layer.js',
      'resource-governor.js',
      'formal-safety-model.js',
      'deterministic-execution-layer.js',
      'agent-protocol.js',
      'project-knowledge-graph.js',
      'safe-patch-generator.js',
      'failure-classifier.js'
    ];
    
    // Правила безопасного изменения кода
    this.safeChangeRules = [
      {
        name: 'add_null_check',
        pattern: /^if\s+\(\s*(\w+)\s*\)\s*\{/,
        allowed: true,
        description: 'Adding null checks is safe'
      },
      {
        name: 'rename_variable',
        pattern: /const\s+(\w+)\s*=/,
        allowed: true,
        description: 'Renaming variables is safe if properly handled'
      },
      {
        name: 'add_comment',
        pattern: /\/\//,
        allowed: true,
        description: 'Adding comments is always safe'
      },
      {
        name: 'remove_dead_code',
        pattern: /(\/\/\s*TODO:\s*remove|unreachable code)/i,
        allowed: true,
        description: 'Removing dead code is safe'
      }
    ];
    
    // Правила, которые запрещены
    this.prohibitedChangeRules = [
      {
        name: 'modify_core_logic',
        pattern: /(if\s+.*\s+&&\s+.*\s+\|\||while\s+\(true\)|eval\s*\(|new\s+Function\s*\()/,
        allowed: false,
        description: 'Modifying core logic is prohibited'
      },
      {
        name: 'external_calls',
        pattern: /(require\(|import\s+|fetch\(|axios\.get)/,
        allowed: false,
        description: 'Adding external dependencies is prohibited'
      },
      {
        name: 'system_operations',
        pattern: /(fs\.\w+|exec\(|spawn\(|child_process)/,
        allowed: false,
        description: 'Adding system operations is prohibited'
      }
    ];
  }

  /**
   * Генерация патча
   */
  async generatePatch(failureArtifact, repairStrategy) {
    const affectedFiles = failureArtifact.affected_modules || [];
    
    // Проверяем, что не пытаемся изменить критические модули
    const coreModuleAffected = affectedFiles.some(file =>
      this.coreModules.some(coreFile => file.includes(coreFile))
    );
    
    if (coreModuleAffected) {
      throw new Error('Cannot generate patch for core modules');
    }

    // В зависимости от стратегии ремонта генерируем соответствующие изменения
    let patchOperations = [];
    
    switch (repairStrategy) {
      case 'add_null_checks':
        patchOperations = await this._generateNullCheckPatches(failureArtifact);
        break;
        
      case 'add_synchronization':
        patchOperations = await this._generateSynchronizationPatches(failureArtifact);
        break;
        
      case 'refactor_to_arch_pattern':
        patchOperations = await this._generateRefactoringPatches(failureArtifact);
        break;
        
      case 'fix_random_seeds_or_state':
        patchOperations = await this._generateStateFixPatches(failureArtifact);
        break;
        
      case 'add_cleanup_routines':
        patchOperations = await this._generateCleanupPatches(failureArtifact);
        break;
        
      case 'refactor_dependencies':
        patchOperations = await this._generateDependencyRefactorPatches(failureArtifact);
        break;
        
      default:
        throw new Error(`Unknown repair strategy: ${repairStrategy}`);
    }
    
    // Создаем предложение патча
    const patchProposal = {
      id: this._generateId(),
      failureArtifact,
      repairStrategy,
      operations: patchOperations,
      affectedFiles: affectedFiles,
      timestamp: Date.now(),
      metadata: {
        entropyEstimate: this._estimateEntropyImpact(patchOperations),
        safetyScore: this._calculateSafetyScore(patchOperations),
        complexity: this._calculateComplexity(patchOperations)
      }
    };
    
    return patchProposal;
  }

  /**
   * Генерация патчей для добавления проверок на null
   */
  async _generateNullCheckPatches(failureArtifact) {
    const operations = [];
    
    // Находим файлы, в которых произошли ошибки, связанные с null
    for (const file of failureArtifact.affected_modules || []) {
      // Читаем содержимое файла (в реальной системе через безопасный способ)
      // Для примера создаем операцию добавления проверки
      operations.push({
        type: 'insert',
        file,
        position: failureArtifact.position || 0,
        code: 'if (obj && obj.property) { /* safe access */ }',
        description: 'Added null check to prevent undefined access',
        safetyLevel: 'high'
      });
    }
    
    return operations;
  }

  /**
   * Генерация патчей для добавления синхронизации
   */
  async _generateSynchronizationPatches(failureArtifact) {
    const operations = [];
    
    for (const file of failureArtifact.affected_modules || []) {
      operations.push({
        type: 'insert',
        file,
        position: failureArtifact.position || 0,
        code: `
// Added synchronization primitive to prevent race condition
const mutex = new Mutex();
await mutex.lock();
try {
  // original code here
} finally {
  mutex.release();
}`,
        description: 'Added mutex to prevent race condition',
        safetyLevel: 'medium'
      });
    }
    
    return operations;
  }

  /**
   * Генерация патчей для рефакторинга в архитектурный паттерн
   */
  async _generateRefactoringPatches(failureArtifact) {
    const operations = [];
    
    for (const file of failureArtifact.affected_modules || []) {
      operations.push({
        type: 'refactor',
        file,
        refactoringType: 'extract_component',
        targetPattern: failureArtifact.expected_architecture || 'MVC',
        description: 'Refactored to conform to architectural pattern',
        safetyLevel: 'medium'
      });
    }
    
    return operations;
  }

  /**
   * Генерация патчей для фикса состояния/детерминизма
   */
  async _generateStateFixPatches(failureArtifact) {
    const operations = [];
    
    for (const file of failureArtifact.affected_modules || []) {
      operations.push({
        type: 'modify',
        file,
        modifications: [
          {
            find: /Math\.random\(\)/g,
            replace: 'this._getDeterministicRandom()',
            description: 'Replaced non-deterministic random with seeded random'
          }
        ],
        description: 'Fixed non-deterministic state handling',
        safetyLevel: 'high'
      });
    }
    
    return operations;
  }

  /**
   * Генерация патчей для добавления очистки ресурсов
   */
  async _generateCleanupPatches(failureArtifact) {
    const operations = [];
    
    for (const file of failureArtifact.affected_modules || []) {
      operations.push({
        type: 'append',
        file,
        code: `
// Added cleanup routine
process.on('exit', cleanupResources);
process.on('SIGINT', () => {
  cleanupResources();
  process.exit(2);
});`,
        description: 'Added resource cleanup routines',
        safetyLevel: 'high'
      });
    }
    
    return operations;
  }

  /**
   * Генерация патчей для рефакторинга зависимостей
   */
  async _generateDependencyRefactorPatches(failureArtifact) {
    const operations = [];
    
    for (const file of failureArtifact.affected_modules || []) {
      operations.push({
        type: 'refactor_dependency',
        file,
        changes: {
          remove: failureArtifact.cycle_participants || [],
          restructure: true
        },
        description: 'Refactored dependency cycle',
        safetyLevel: 'medium'
      });
    }
    
    return operations;
  }

  /**
   * Проверка безопасности патча
   */
  validatePatch(patchProposal) {
    const violations = [];
    const warnings = [];
    
    // Проверяем количество затронутых файлов
    if (patchProposal.affectedFiles.length > this.maxAffectedFiles) {
      violations.push(`Too many files affected: ${patchProposal.affectedFiles.length}, max allowed: ${this.maxAffectedFiles}`);
    }
    
    // Проверяем объем изменений
    const totalLinesChanged = this._countTotalLinesChanged(patchProposal.operations);
    if (totalLinesChanged > this.maxLinesChanged) {
      violations.push(`Too many lines changed: ${totalLinesChanged}, max allowed: ${this.maxLinesChanged}`);
    }
    
    // Проверяем энтропию
    if (patchProposal.metadata.entropyEstimate > this.maxEntropyDelta) {
      violations.push(`Entropy delta too high: ${patchProposal.metadata.entropyEstimate}, max allowed: ${this.maxEntropyDelta}`);
    }
    
    // Проверяем безопасность каждой операции
    for (let i = 0; i < patchProposal.operations.length; i++) {
      const operation = patchProposal.operations[i];
      const operationValidation = this._validateOperation(operation);
      
      if (!operationValidation.safe) {
        violations.push(`Operation ${i} in patch ${patchProposal.id} is unsafe: ${operationValidation.reason}`);
      }
      
      warnings.push(...operationValidation.warnings);
    }
    
    // Проверяем, не затрагивает ли патч критические модули
    for (const file of patchProposal.affectedFiles) {
      if (this.coreModules.some(coreFile => file.includes(coreFile))) {
        violations.push(`Patch affects core module: ${file}`);
      }
    }
    
    return {
      safe: violations.length === 0,
      violations,
      warnings,
      entropyCheck: {
        estimate: patchProposal.metadata.entropyEstimate,
        threshold: this.maxEntropyDelta
      }
    };
  }

  /**
   * Проверка безопасности операции
   */
  _validateOperation(operation) {
    const warnings = [];
    
    // Проверяем по правилам безопасных изменений
    for (const rule of this.safeChangeRules) {
      if (rule.pattern.test(operation.code || operation.description || '')) {
        return { safe: true, warnings, reason: `Matches safe rule: ${rule.name}` };
      }
    }
    
    // Проверяем по правилам запрещенных изменений
    for (const rule of this.prohibitedChangeRules) {
      if (rule.pattern.test(operation.code || operation.description || '')) {
        return { safe: false, warnings, reason: `Violates prohibited rule: ${rule.name}` };
      }
    }
    
    // Если нет явного правила, применяем эвристики
    if (operation.type === 'modify' && operation.modifications) {
      for (const mod of operation.modifications) {
        if (mod.find && mod.find.toString().includes('eval')) {
          return { safe: false, warnings, reason: 'Contains eval() modification' };
        }
      }
    }
    
    // Для рефакторинга зависимостей - особая проверка
    if (operation.type === 'refactor_dependency' && operation.changes) {
      // Проверяем, не удаляем ли важные зависимости
      if (operation.changes.remove && operation.changes.remove.length > 5) {
        warnings.push('Refactoring removes many dependencies, review needed');
      }
    }
    
    // По умолчанию считаем операцию безопасной с предупреждением
    warnings.push(`Operation ${operation.type} in ${operation.file} has no explicit safety rule, treating as potentially safe`);
    
    return { safe: true, warnings, reason: 'No explicit safety violation detected' };
  }

  /**
   * Проверка влияния на энтропию
   */
  checkEntropyImpact(patchProposal) {
    const entropyEstimate = patchProposal.metadata.entropyEstimate;
    const affectedFilesCount = patchProposal.affectedFiles.length;
    const operationsCount = patchProposal.operations.length;
    
    return {
      delta: entropyEstimate,
      affectedFilesCount,
      operationsCount,
      threshold: this.maxEntropyDelta,
      acceptable: entropyEstimate <= this.maxEntropyDelta,
      estimateMethod: 'based_on_change_volume_and_complexity'
    };
  }

  /**
   * Проверка сохранения инвариантов
   */
  checkInvariantPreservation(patchProposal) {
    const broken = [];
    
    // Проверяем, не изменяет ли патч критические модули
    for (const file of patchProposal.affectedFiles) {
      if (this.coreModules.some(coreFile => file.includes(coreFile))) {
        broken.push(`Attempt to modify core module: ${file}`);
      }
    }
    
    // Проверяем, не нарушает ли патч зависимости
    for (const operation of patchProposal.operations) {
      if (operation.type === 'refactor_dependency' && operation.changes) {
        // В реальной системе здесь была бы проверка сохранения архитектурных инвариантов
      }
    }
    
    return {
      preserved: broken.length === 0,
      broken
    };
  }

  /**
   * Оценка влияния на энтропию
   */
  _estimateEntropyImpact(operations) {
    // Простая эвристика для оценки влияния на архитектурную энтропию
    let entropy = 0;
    
    for (const operation of operations) {
      switch (operation.type) {
        case 'insert':
        case 'append':
          entropy += 0.01;
          break;
        case 'modify':
          entropy += 0.02;
          break;
        case 'refactor':
          entropy += 0.05;
          break;
        case 'refactor_dependency':
          entropy += 0.08; // Рефакторинг зависимостей может значительно изменить архитектуру
          break;
        default:
          entropy += 0.03;
      }
    }
    
    return Math.min(entropy, 1.0); // Не больше 1.0
  }

  /**
   * Расчет безопасности
   */
  _calculateSafetyScore(operations) {
    let safetyScore = 1.0;
    
    for (const operation of operations) {
      if (operation.safetyLevel === 'high') {
        safetyScore *= 0.95;
      } else if (operation.safetyLevel === 'medium') {
        safetyScore *= 0.85;
      } else {
        safetyScore *= 0.7; // low safety
      }
    }
    
    return safetyScore;
  }

  /**
   * Расчет сложности
   */
  _calculateComplexity(operations) {
    let complexity = 0;
    
    for (const operation of operations) {
      switch (operation.type) {
        case 'insert':
        case 'append':
          complexity += 1;
          break;
        case 'modify':
          complexity += 2;
          break;
        case 'refactor':
          complexity += 5;
          break;
        case 'refactor_dependency':
          complexity += 8; // Зависимости - наиболее сложная операция
          break;
        default:
          complexity += 3;
      }
    }
    
    return complexity;
  }

  /**
   * Подсчет общего количества измененных строк
   */
  _countTotalLinesChanged(operations) {
    let totalLines = 0;
    
    for (const operation of operations) {
      if (operation.code) {
        totalLines += operation.code.split('\n').length;
      }
      
      if (operation.modifications) {
        for (const mod of operation.modifications) {
          if (mod.replace) {
            totalLines += mod.replace.split('\n').length;
          }
        }
      }
    }
    
    return totalLines;
  }

  /**
   * Генерация ID
   */
  _generateId() {
    return `patch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}