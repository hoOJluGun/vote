// lib/safety-validator.js
// Компонент для валидации безопасности операций в CEL

class SafetyValidator {
  constructor() {
    this.validationRules = new Map();
    this.contextValidators = new Map();
    this.securityPolicies = [];
  }

  /**
   * Регистрация правила валидации
   * @param {string} ruleName - название правила
   * @param {Function} validator - функция валидации
   */
  registerRule(ruleName, validator) {
    this.validationRules.set(ruleName, validator);
  }

  /**
   * Регистрация валидатора контекста
   * @param {string} contextType - тип контекста
   * @param {Function} validator - функция валидации
   */
  registerContextValidator(contextType, validator) {
    this.contextValidators.set(contextType, validator);
  }

  /**
   * Добавление политики безопасности
   * @param {Object} policy - политика безопасности
   */
  addSecurityPolicy(policy) {
    this.securityPolicies.push(policy);
  }

  /**
   * Валидация операции на безопасность
   * @param {string} operation - тип операции
   * @param {Object} context - контекст операции
   * @returns {Object} - результат валидации
   */
  validateOperation(operation, context = {}) {
    const results = {
      operation,
      isValid: true,
      violations: [],
      warnings: [],
      validatedAt: new Date()
    };

    // Проверка по зарегистрированным правилам
    for (const [ruleName, validator] of this.validationRules.entries()) {
      try {
        const ruleResult = validator(operation, context);
        
        if (!ruleResult.valid) {
          results.isValid = false;
          results.violations.push({
            rule: ruleName,
            message: ruleResult.message || 'Validation failed',
            severity: ruleResult.severity || 'high'
          });
        } else if (ruleResult.warning) {
          results.warnings.push({
            rule: ruleName,
            message: ruleResult.warning,
            severity: 'medium'
          });
        }
      } catch (error) {
        results.isValid = false;
        results.violations.push({
          rule: ruleName,
          message: `Validation error: ${error.message}`,
          severity: 'critical'
        });
      }
    }

    // Проверка политик безопасности
    for (const policy of this.securityPolicies) {
      if (policy.appliesTo?.includes(operation)) {
        const policyResult = this.evaluatePolicy(policy, context);
        
        if (!policyResult.compliant) {
          results.isValid = false;
          results.violations.push({
            policy: policy.name,
            message: policyResult.reason || 'Policy violation',
            severity: policy.severity || 'high'
          });
        }
      }
    }

    return results;
  }

  /**
   * Оценка соответствия политике
   * @param {Object} policy - политика
   * @param {Object} context - контекст
   * @returns {Object} - результат оценки
   */
  evaluatePolicy(policy, context) {
    try {
      if (typeof policy.condition === 'function') {
        return {
          compliant: policy.condition(context),
          reason: policy.violationMessage
        };
      } else if (typeof policy.condition === 'string') {
        // В реальном приложении здесь будет более сложная логика для
        // интерпретации строковых условий
        return {
          compliant: true, // Заглушка
          reason: null
        };
      }
      
      return {
        compliant: false,
        reason: 'Invalid policy condition'
      };
    } catch (error) {
      return {
        compliant: false,
        reason: `Policy evaluation error: ${error.message}`
      };
    }
  }

  /**
   * Валидация контекста
   * @param {string} contextType - тип контекста
   * @param {Object} context - контекст для валидации
   * @returns {Object} - результат валидации
   */
  validateContext(contextType, context) {
    const validator = this.contextValidators.get(contextType);
    
    if (!validator) {
      return {
        isValid: false,
        errors: [`No validator registered for context type: ${contextType}`]
      };
    }

    try {
      return validator(context);
    } catch (error) {
      return {
        isValid: false,
        errors: [`Validation error: ${error.message}`]
      };
    }
  }

  /**
   * Валидация параметров запроса
   * @param {Object} params - параметры запроса
   * @returns {Object} - результат валидации
   */
  validateRequestParams(params) {
    const results = {
      isValid: true,
      errors: []
    };

    // Проверка на потенциальные атаки внедрения
    for (const [key, value] of Object.entries(params)) {
      if (typeof value === 'string') {
        // Проверка на потенциальные команды/скрипты
        if (this.containsPotentialInjection(value)) {
          results.isValid = false;
          results.errors.push({
            field: key,
            message: 'Potential injection detected',
            severity: 'critical'
          });
        }
        
        // Проверка длины параметров
        if (value.length > 10000) { // Произвольный лимит
          results.errors.push({
            field: key,
            message: 'Parameter too long',
            severity: 'high'
          });
        }
      }
    }

    return results;
  }

  /**
   * Проверка строки на потенциальное внедрение
   * @param {string} input - входная строка
   * @returns {boolean} - содержит ли потенциальное внедрение
   */
  containsPotentialInjection(input) {
    const dangerousPatterns = [
      /\b(union|select|insert|update|delete|drop|create|alter|exec|execute|sp_|xp_|0x)\b/i,
      /('|--|\/\*|\*\/|;)/g,
      /(<script|javascript:|vbscript:|onload|onerror)/i,
      /(cmd\.exe|sh\b|bash\b|powershell)/i
    ];

    return dangerousPatterns.some(pattern => pattern.test(input));
  }

  /**
   * Валидация источника запроса
   * @param {string} source - источник запроса
   * @returns {boolean} - является ли доверенным
   */
  validateSource(source) {
    // Разрешенные источники
    const trustedSources = [
      'xcode-integration',
      'internal-service',
      'cel-agent',
      'authenticated-user'
    ];

    return trustedSources.includes(source);
  }

  /**
   * Валидация модели ИИ
   * @param {string} model - название модели
   * @returns {boolean} - разрешена ли модель
   */
  validateModel(model) {
    // Белый список разрешенных моделей (как в спецификации проекта)
    const allowedModels = [
      'openai/gpt-4o:free',
      'anthropic/claude-3-haiku:free',
      'google/gemini-pro:free',
      'mistralai/mistral-7b-instruct:free',
      'nousresearch/nous-capybara-7b:free',
      'openchat/openchat-7b:free',
      'huggingfaceh4/zephyr-7b-beta:free',
      'meta-llama/llama-2-7b-chat:free',
      'codellama/codellama-7b-instruct:free',
      'perplexity/pplx-7b-chat:free',
      'cohere/command-r:free'
    ];

    return allowedModels.includes(model);
  }

  /**
   * Валидация путей файловой системы
   * @param {string} filePath - путь к файлу
   * @returns {boolean} - безопасен ли путь
   */
  validateFilePath(filePath) {
    if (!filePath) return false;

    // Преобразование к абсолютному пути для анализа
    const normalizedPath = path.resolve(filePath);
    
    // Запрещаем перемещение выше корневой директории проекта
    const projectRoot = path.resolve('./');
    if (!normalizedPath.startsWith(projectRoot)) {
      return false;
    }

    // Проверка на последовательности '../' которые могут обойти ограничения
    if (filePath.includes('../') || filePath.includes('..\\')) {
      return false;
    }

    // Разрешенные директории для операций
    const allowedDirectories = [
      path.resolve('./workspace'),
      path.resolve('./output'),
      path.resolve('./temp'),
      path.resolve('./public')
    ];

    return allowedDirectories.some(dir => normalizedPath.startsWith(dir));
  }

  /**
   * Проверка лимитов ресурсов для операции
   * @param {Object} context - контекст операции
   * @returns {Object} - результат проверки лимитов
   */
  validateResourceLimits(context) {
    const results = {
      isValid: true,
      violations: []
    };

    // Проверка размера запроса
    if (context.requestSize && context.requestSize > 50 * 1024 * 1024) { // 50MB
      results.isValid = false;
      results.violations.push({
        type: 'REQUEST_SIZE_LIMIT',
        message: 'Request size exceeds maximum allowed (50MB)',
        severity: 'high'
      });
    }

    // Проверка частоты запросов (заглушка)
    // В реальном приложении здесь будет проверка по ID пользователя/IP
    if (context.requestFrequency && context.requestFrequency > 100) { // 100 запросов в минуту
      results.isValid = false;
      results.violations.push({
        type: 'RATE_LIMIT',
        message: 'Request rate exceeds allowed limit',
        severity: 'medium'
      });
    }

    // Проверка глубины рекурсии/вложенности (для генерации кода и т.д.)
    if (context.recursionDepth && context.recursionDepth > 10) {
      results.isValid = false;
      results.violations.push({
        type: 'RECURSION_DEPTH_LIMIT',
        message: 'Recursion depth exceeds allowed limit',
        severity: 'high'
      });
    }

    return results;
  }
}

// Экспорт экземпляра валидатора по умолчанию
const safetyValidator = new SafetyValidator();

// Регистрация стандартных правил валидации
safetyValidator.registerRule('request-source', (operation, context) => {
  const isValidSource = safetyValidator.validateSource(context.source || context.userAgent);
  return {
    valid: isValidSource,
    message: isValidSource ? '' : 'Request from untrusted source'
  };
});

safetyValidator.registerRule('model-whitelist', (operation, context) => {
  if (!context.model) return { valid: true };
  
  const isValidModel = safetyValidator.validateModel(context.model);
  return {
    valid: isValidModel,
    message: isValidModel ? '' : `Model ${context.model} not in whitelist`
  };
});

safetyValidator.registerRule('file-path-security', (operation, context) => {
  if (!context.filePath || !['file_read', 'file_write', 'file_delete'].includes(operation)) {
    return { valid: true };
  }
  
  const isValidPath = safetyValidator.validateFilePath(context.filePath);
  return {
    valid: isValidPath,
    message: isValidPath ? '' : `Unsafe file path: ${context.filePath}`
  };
});

export default safetyValidator;