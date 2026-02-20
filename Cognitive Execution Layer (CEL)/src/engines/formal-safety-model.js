/**
 * Formal Safety Model
 * 
 * Формальная модель безопасности
 */

export class FormalSafetyModel {
  constructor(options = {}) {
    this.forbiddenPaths = options.forbiddenPaths || [
      '/etc/',
      '/root/',
      '/sys/',
      '/proc/',
      '../',
      '../../',
      '../../../',
      '../../../../',
      '../../../../../'
    ];
    
    this.forbiddenCommands = options.forbiddenCommands || [
      'rm -rf',
      'format',
      'del /S /Q',
      'cat /etc/shadow',
      'echo > /dev/kmem',
      ':(){ :|:& };:'
    ];
    
    this.maxFileMutationScope = options.maxFileMutationScope || 10000; // 10KB
    this.requireSimulationFor = options.requireSimulationFor || [
      'file_write',
      'execute_command',
      'modify_system_settings'
    ];
    
    this.violationLog = [];
    this.maxViolationLogSize = 100;
  }

  /**
   * Проверяет операцию на безопасность
   */
  validateOperation(operation) {
    const { type, payload } = operation;
    const violations = [];
    const warnings = [];

    switch (type) {
      case 'file_write':
        const { path, content } = payload;
        
        // Проверяем запрещенные пути
        for (const forbiddenPath of this.forbiddenPaths) {
          if (path.includes(forbiddenPath)) {
            violations.push(`Path ${path} contains forbidden path segment: ${forbiddenPath}`);
          }
        }
        
        // Проверяем размер файла
        if (content && typeof content === 'string' && content.length > this.maxFileMutationScope) {
          violations.push(`File content exceeds max mutation scope: ${content.length} > ${this.maxFileMutationScope}`);
        }
        
        // Проверяем подозрительный контент
        if (content && this._containsSuspiciousContent(content)) {
          violations.push('File content contains suspicious patterns');
        }
        
        break;

      case 'execute_command':
        const { command } = payload;
        
        // Проверяем запрещенные команды
        for (const forbiddenCmd of this.forbiddenCommands) {
          if (command.includes(forbiddenCmd)) {
            violations.push(`Command contains forbidden pattern: ${forbiddenCmd}`);
          }
        }
        
        break;

      case 'llm_request':
        // Проверяем, не пытается ли LLM получить доступ к системным данным
        if (payload.messages) {
          for (const message of payload.messages) {
            if (message.content && this._containsSystemAccessRequest(message.content)) {
              warnings.push('LLM request may attempt system access');
            }
          }
        }
        
        break;

      case 'run_tests':
      case 'run_linter':
      case 'code_assist':
      case 'code_quality_report':
      case 'apply_fixes':
      case 'sandbox_test':
      case 'orchestrate_goal':
        // Эти операции обычно безопасны, но требуют проверки аргументов
        if (payload.filePath && typeof payload.filePath === 'string') {
          for (const forbiddenPath of this.forbiddenPaths) {
            if (payload.filePath.includes(forbiddenPath)) {
              violations.push(`File path contains forbidden path segment: ${forbiddenPath}`);
            }
          }
        }
        break;

      default:
        warnings.push(`Unknown operation type: ${type}`);
    }

    // Проверяем, требуется ли симуляция для этой операции
    const requiresSimulation = this.requireSimulationFor.includes(type);
    
    const result = {
      safe: violations.length === 0,
      violations,
      warnings,
      requiresSimulation
    };

    // Логируем нарушения
    if (!result.safe) {
      this._logViolation(operation, result);
    }

    return result;
  }

  /**
   * Проверяет, содержит ли контент подозрительные паттерны
   */
  _containsSuspiciousContent(content) {
    const suspiciousPatterns = [
      /require\(['"].*\/etc\/.*['"]\)/,
      /fs\.writeFileSync\(['"].*\.\.\/.*['"],/,
      /exec\(['"]rm -rf/,
      /child_process\.execSync\(['"].*>/,
      /eval\(/,
      /new Function\(/,
      /import\(/,
      /require\(/,
      /process\.env/
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(content)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Проверяет, пытается ли запрос получить доступ к системным данным
   */
  _containsSystemAccessRequest(content) {
    const systemAccessPatterns = [
      /read.*file.*\/etc/,
      /access.*system.*config/,
      /get.*environment.*variables/,
      /process\.env/,
      /os\.platform\(\)/,
      /exec.*command/,
      /spawn.*process/
    ];

    const lowerContent = content.toLowerCase();
    
    for (const pattern of systemAccessPatterns) {
      if (pattern.test(lowerContent)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Логирует нарушение
   */
  _logViolation(operation, validationResult) {
    const logEntry = {
      timestamp: Date.now(),
      operation: { ...operation },
      result: validationResult,
      severity: validationResult.violations.length > 0 ? 'HIGH' : 'MEDIUM'
    };

    this.violationLog.push(logEntry);

    // Ограничиваем размер лога
    if (this.violationLog.length > this.maxViolationLogSize) {
      this.violationLog.shift();
    }
  }

  /**
   * Получает статус безопасности
   */
  getSafetyStatus() {
    return {
      forbiddenPaths: this.forbiddenPaths,
      forbiddenCommands: this.forbiddenCommands,
      maxFileMutationScope: this.maxFileMutationScope,
      requireSimulationFor: this.requireSimulationFor,
      violationCount: this.violationLog.length,
      recentViolations: this.violationLog.slice(-10) // последние 10 нарушений
    };
  }

  /**
   * Добавляет запрещенный путь
   */
  addForbiddenPath(path) {
    if (!this.forbiddenPaths.includes(path)) {
      this.forbiddenPaths.push(path);
    }
  }

  /**
   * Удаляет запрещенный путь
   */
  removeForbiddenPath(path) {
    this.forbiddenPaths = this.forbiddenPaths.filter(p => p !== path);
  }
}