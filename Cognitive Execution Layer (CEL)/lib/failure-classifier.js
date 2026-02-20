/**
 * Failure Classifier Engine
 * 
 * Классифицирует типы сбоев и определяет, можно ли их безопасно исправить
 */

export class FailureClassifier {
  constructor(options = {}) {
    this.knownPatterns = options.knownPatterns || new Map();
    this.securityThreshold = options.securityThreshold || 0.9;
    this.performanceThreshold = options.performanceThreshold || 0.8;
    this.architectureThreshold = options.architectureThreshold || 0.85;
    
    // Инициализация известных паттернов сбоев
    this._initializeKnownPatterns();
  }

  /**
   * Инициализация известных паттернов сбоев
   */
  _initializeKnownPatterns() {
    // Паттерны для часто встречающихся сбоев
    this.knownPatterns.set('null_pointer_exception', {
      type: 'missing_null_guard',
      severity: 'high',
      autoFixable: true,
      strategy: 'add_null_checks',
      confidence: 0.95
    });

    this.knownPatterns.set('race_condition_detected', {
      type: 'race_condition',
      severity: 'critical',
      autoFixable: 'conditional', // Зависит от контекста
      strategy: 'add_synchronization',
      confidence: 0.85
    });

    this.knownPatterns.set('security_violation', {
      type: 'security_violation',
      severity: 'critical',
      autoFixable: false,
      strategy: 'rollback_only',
      confidence: 0.99
    });

    this.knownPatterns.set('architectural_drift', {
      type: 'architectural_drift',
      severity: 'medium',
      autoFixable: true,
      strategy: 'refactor_to_arch_pattern',
      confidence: 0.75
    });

    this.knownPatterns.set('determinism_break', {
      type: 'determinism_break',
      severity: 'high',
      autoFixable: true,
      strategy: 'fix_random_seeds_or_state',
      confidence: 0.9
    });

    this.knownPatterns.set('resource_leak', {
      type: 'resource_leak',
      severity: 'high',
      autoFixable: true,
      strategy: 'add_cleanup_routines',
      confidence: 0.88
    });

    this.knownPatterns.set('dependency_cycle', {
      type: 'dependency_cycle',
      severity: 'medium',
      autoFixable: true,
      strategy: 'refactor_dependencies',
      confidence: 0.8
    });
  }

  /**
   * Классификация артефакта сбоя
   */
  async classify(failureArtifact) {
    // Определяем тип сбоя на основе описания
    const failureType = this._identifyFailureType(failureArtifact);
    
    // Находим соответствующий паттерн
    const pattern = this.knownPatterns.get(failureType) || this._inferPatternFromDescription(failureArtifact);
    
    // Определяем, можно ли безопасно исправить
    const isAutoFixable = this._assessAutoFixability(failureArtifact, pattern);
    
    // Определяем стратегию ремонта
    const repairStrategy = this._determineRepairStrategy(pattern, failureArtifact);
    
    // Оцениваем уверенность в классификации
    const confidence = this._calculateConfidence(pattern, failureArtifact);
    
    // Проверяем, является ли сбой критическим
    const isCritical = this._isCriticalFailure(failureArtifact, pattern);
    
    return {
      type: failureType,
      pattern,
      isAutoFixable,
      repairStrategy,
      confidence,
      isCritical,
      severity: pattern.severity,
      autoFixable: pattern.autoFixable,
      strategy: pattern.strategy,
      timestamp: Date.now()
    };
  }

  /**
   * Определение типа сбоя на основе артефакта
   */
  _identifyFailureType(failureArtifact) {
    const { failure_type, error_message, stack_trace, invariant_broken } = failureArtifact;
    
    // Если тип уже указан, возвращаем его
    if (failure_type) {
      return failure_type;
    }
    
    // Пытаемся идентифицировать по сообщению об ошибке
    if (error_message) {
      if (error_message.includes('null') || error_message.includes('undefined')) {
        return 'null_pointer_exception';
      }
      
      if (error_message.includes('race') || error_message.toLowerCase().includes('concurrent')) {
        return 'race_condition_detected';
      }
      
      if (error_message.toLowerCase().includes('security') || error_message.toLowerCase().includes('access denied')) {
        return 'security_violation';
      }
      
      if (error_message.toLowerCase().includes('leak') || error_message.toLowerCase().includes('memory')) {
        return 'resource_leak';
      }
    }
    
    // Пытаемся идентифицировать по стек трейсу
    if (stack_trace) {
      if (stack_trace.includes('async') && stack_trace.includes('callback')) {
        return 'race_condition_detected';
      }
    }
    
    // Пытаемся идентифицировать по нарушенным инвариантам
    if (invariant_broken) {
      if (invariant_broken.includes('determinism')) {
        return 'determinism_break';
      }
      
      if (invariant_broken.includes('architecture') || invariant_broken.includes('pattern')) {
        return 'architectural_drift';
      }
      
      if (invariant_broken.includes('dependency')) {
        return 'dependency_cycle';
      }
    }
    
    // Если не удалось идентифицировать, возвращаем общий тип
    return 'unknown_failure';
  }

  /**
   * Определение паттерна на основе описания (для неизвестных сбоев)
   */
  _inferPatternFromDescription(failureArtifact) {
    // В реальной системе это будет более сложной логикой ML/NLP
    // для понимания природы сбоя
    
    const description = `${failureArtifact.error_message || ''} ${failureArtifact.stack_trace || ''} ${failureArtifact.invariant_broken || ''}`;
    
    // Простая эвристика для определения типа
    if (description.toLowerCase().includes('cycle') || description.toLowerCase().includes('circular')) {
      return {
        type: 'dependency_cycle',
        severity: 'medium',
        autoFixable: true,
        strategy: 'refactor_dependencies',
        confidence: 0.7
      };
    }
    
    // По умолчанию возвращаем неизвестный паттерн
    return {
      type: 'unknown',
      severity: 'unknown',
      autoFixable: false,
      strategy: 'manual_intervention_required',
      confidence: 0.3
    };
  }

  /**
   * Оценка возможности автофикса
   */
  _assessAutoFixability(failureArtifact, pattern) {
    // Если паттерн говорит, что нельзя автофиксить
    if (pattern.autoFixable === false) {
      return false;
    }
    
    // Если паттерн говорит, что можно
    if (pattern.autoFixable === true) {
      return true;
    }
    
    // Если условно можно - оцениваем контекст
    if (pattern.autoFixable === 'conditional') {
      // Проверяем, находится ли сбой в критических модулях
      const affectsCriticalModules = failureArtifact.affected_modules?.some(module =>
        module.includes('core') || module.includes('security') || module.includes('governance')
      ) || false;
      
      // Если затрагивает критические модули - не фиксим автоматически
      if (affectsCriticalModules) {
        return false;
      }
      
      // Проверяем уровень доверия к артефакту
      const artifactConfidence = failureArtifact.confidence || 0;
      
      // Если доверие достаточно высокое - можно фиксить
      return artifactConfidence > 0.8;
    }
    
    return false;
  }

  /**
   * Определение стратегии ремонта
   */
  _determineRepairStrategy(pattern, failureArtifact) {
    // Если у паттерна есть стратегия - используем её
    if (pattern.strategy) {
      return pattern.strategy;
    }
    
    // Иначе определяем на основе типа сбоя
    switch (pattern.type) {
      case 'null_pointer_exception':
        return 'add_null_checks';
      case 'race_condition_detected':
        return 'add_synchronization';
      case 'security_violation':
        return 'rollback_and_review';
      case 'architectural_drift':
        return 'refactor_to_arch_pattern';
      case 'determinism_break':
        return 'fix_random_seeds_or_state';
      case 'resource_leak':
        return 'add_cleanup_routines';
      case 'dependency_cycle':
        return 'refactor_dependencies';
      default:
        return 'manual_intervention_required';
    }
  }

  /**
   * Расчет уверенности в классификации
   */
  _calculateConfidence(pattern, failureArtifact) {
    // Базовая уверенность из паттерна
    let confidence = pattern.confidence || 0.5;
    
    // Увеличиваем уверенность, если артефакт содержит подробную информацию
    if (failureArtifact.stack_trace) {
      confidence += 0.1;
    }
    
    if (failureArtifact.snapshot_before && failureArtifact.snapshot_after) {
      confidence += 0.15;
    }
    
    if (failureArtifact.entropy_delta !== undefined) {
      confidence += 0.05;
    }
    
    // Учитываем, насколько хорошо артефакт соответствует известному паттерну
    const patternMatchQuality = this._calculatePatternMatchQuality(pattern, failureArtifact);
    confidence = (confidence + patternMatchQuality) / 2;
    
    // Ограничиваем максимальную уверенность
    return Math.min(confidence, 0.99);
  }

  /**
   * Расчет качества соответствия паттерну
   */
  _calculatePatternMatchQuality(pattern, failureArtifact) {
    // Простая эвристика - насколько артефакт соответствует характеристикам паттерна
    let score = 0;
    let maxScore = 0;
    
    // Проверяем соответствие типов
    maxScore += 1;
    if (failureArtifact.failure_type === pattern.type) {
      score += 1;
    }
    
    // Проверяем соответствие инвариантов
    if (failureArtifact.invariant_broken) {
      maxScore += 0.5;
      if (pattern.type.includes(failureArtifact.invariant_broken.toLowerCase())) {
        score += 0.5;
      }
    }
    
    // Проверяем соответствие сообщений об ошибках
    if (failureArtifact.error_message) {
      maxScore += 0.5;
      const errorMessage = failureArtifact.error_message.toLowerCase();
      if (
        (pattern.type === 'null_pointer_exception' && 
          (errorMessage.includes('null') || errorMessage.includes('undefined'))) ||
        (pattern.type === 'race_condition_detected' && 
          errorMessage.includes('race')) ||
        (pattern.type === 'security_violation' && 
          errorMessage.includes('security'))
      ) {
        score += 0.5;
      }
    }
    
    return maxScore > 0 ? score / maxScore : 0;
  }

  /**
   * Проверка, является ли сбой критическим
   */
  _isCriticalFailure(failureArtifact, pattern) {
    // Сбой считается критическим, если:
    // 1. Паттерн имеет высокую серьезность
    const highSeverity = ['critical', 'high'].includes(pattern.severity);
    
    // 2. У артефакта высокий уровень доверия
    const artifactConfidence = failureArtifact.confidence || 0;
    const highConfidence = artifactConfidence > this.securityThreshold;
    
    // 3. Сбой затрагивает критические компоненты
    const affectsCriticalComponents = failureArtifact.affected_modules?.some(module =>
      module.includes('security') || module.includes('auth') || module.includes('crypto')
    ) || false;
    
    // 4. Сбой связан с безопасностью
    const securityRelated = pattern.type === 'security_violation' || 
                           failureArtifact.invariant_broken?.includes('security');
    
    return highSeverity || highConfidence || affectsCriticalComponents || securityRelated;
  }

  /**
   * Добавление нового известного паттерна
   */
  addKnownPattern(name, pattern) {
    this.knownPatterns.set(name, {
      ...pattern,
      lastUpdated: Date.now()
    });
  }

  /**
   * Получение всех известных паттернов
   */
  getAllKnownPatterns() {
    return Array.from(this.knownPatterns.entries()).map(([name, pattern]) => ({
      name,
      ...pattern
    }));
  }

  /**
   * Обучение на новом артефакте (обновление паттернов)
   */
  learnFromArtifact(failureArtifact, actualFix) {
    // В реальной системе это будет обновлять ML-модель на основе
    // результата фактического ремонта
    
    const failureType = this._identifyFailureType(failureArtifact);
    const existingPattern = this.knownPatterns.get(failureType);
    
    if (existingPattern) {
      // Обновляем статистику успешности паттерна
      if (!existingPattern.learnedFrom) {
        existingPattern.learnedFrom = [];
      }
      
      existingPattern.learnedFrom.push({
        artifact: failureArtifact,
        fix: actualFix,
        timestamp: Date.now()
      });
      
      // Пересчитываем уверенность на основе новых данных
      existingPattern.confidence = this._recalculateConfidence(existingPattern);
    }
  }

  /**
   * Пересчет уверенности на основе исторических данных
   */
  _recalculateConfidence(pattern) {
    // В реальной системе это будет использовать ML для пересчета
    // уверенности на основе исторических данных
    
    if (!pattern.learnedFrom || pattern.learnedFrom.length === 0) {
      return pattern.confidence || 0.5;
    }
    
    // Простая эвристика: чем больше успешных фиксов, тем выше уверенность
    const successCount = pattern.learnedFrom.filter(item => item.fix.success).length;
    const totalCount = pattern.learnedFrom.length;
    
    return Math.min(0.95, 0.5 + (successCount / totalCount) * 0.45);
  }
}