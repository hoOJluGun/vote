/**
 * Trust Boundary Hardening
 * 
 * Защита от инъекций, отравления контекста и повреждения памяти
 */

export class TrustBoundaryHardening {
  constructor(options = {}) {
    // Хранилище хэшей целостности памяти
    this.memoryIntegrityChain = new Map();
    
    // Детектор отравления семантики
    this.semanticPoisoningDetector = options.semanticPoisoningDetector || null;
    
    // Система атрибуции источников контекста
    this.contextAttribution = new Map();
    
    // Время жизни кэша атрибуции
    this.attributionCacheTTL = options.attributionCacheTTL || 300000; // 5 минут
    
    // Проверка целостности на уровне токенов
    this.tokenIntegrityChecks = options.tokenIntegrityChecks || [];
    
    // Список разрешенных источников для памяти
    this.allowedMemorySources = new Set(options.allowedMemorySources || []);
    
    // Порог схожести для обнаружения отравления
    this.poisoningSimilarityThreshold = options.poisoningSimilarityThreshold || 0.85;
    
    // История атак
    this.attackHistory = new Map();
    
    // Счетчик атак
    this.attackCounter = {
      injectionAttempts: 0,
      poisoningAttempts: 0,
      memoryCorruption: 0,
      totalBlocked: 0
    };
  }

  /**
   * Добавление источника в доверенный список
   */
  addAllowedMemorySource(source) {
    this.allowedMemorySources.add(source);
    console.log(`✅ Added allowed memory source: ${source}`);
  }

  /**
   * Создание хэша целостности для блока памяти
   */
  createMemoryIntegrityHash(memoryBlock, source) {
    const timestamp = Date.now();
    const hashInput = JSON.stringify({
      data: memoryBlock,
      source,
      timestamp
    });
    
    // Простая реализация хэширования
    let hash = 0;
    for (let i = 0; i < hashInput.length; i++) {
      const char = hashInput.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0; // Convert to 32bit integer
    }
    
    const hashString = Math.abs(hash).toString(16);
    
    // Сохраняем в цепочку целостности
    const blockId = `mem_${timestamp}_${Math.random().toString(36).substr(2, 9)}`;
    this.memoryIntegrityChain.set(blockId, {
      hash: hashString,
      data: memoryBlock,
      source,
      timestamp,
      previousHash: this._getLastHash()
    });
    
    return {
      blockId,
      hash: hashString,
      timestamp
    };
  }

  /**
   * Получение последнего хэша из цепочки
   */
  _getLastHash() {
    if (this.memoryIntegrityChain.size === 0) return null;
    
    const lastEntry = Array.from(this.memoryIntegrityChain.entries()).pop();
    return lastEntry[1].hash;
  }

  /**
   * Проверка целостности блока памяти
   */
  verifyMemoryIntegrity(blockId) {
    const block = this.memoryIntegrityChain.get(blockId);
    if (!block) {
      return { valid: false, reason: 'Block not found' };
    }
    
    // Пересчитываем хэш
    const recalculatedHash = this._calculateHash({
      data: block.data,
      source: block.source,
      timestamp: block.timestamp
    });
    
    const isValid = recalculatedHash === block.hash;
    
    return {
      valid: isValid,
      hash: block.hash,
      recalculatedHash,
      block,
      reason: isValid ? 'Valid' : 'Hash mismatch'
    };
  }

  /**
   * Вычисление хэша для данных
   */
  _calculateHash(dataObj) {
    const hashInput = JSON.stringify(dataObj);
    let hash = 0;
    for (let i = 0; i < hashInput.length; i++) {
      const char = hashInput.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0; // Convert to 32bit integer
    }
    
    return Math.abs(hash).toString(16);
  }

  /**
   * Проверка на инъекцию в запросе
   */
  checkPromptInjection(promptText) {
    const injectionPatterns = [
      /(?<!\\)<|>(?!\\)/g,  // HTML теги
      /(?<!\\)\{|\}(?!\\)/g,  // JSON объекты
      /(?<!\\)\[|\](?!\\)/g,  // JSON массивы
      /system:/gi,  // Попытки изменить системную роль
      /ignore previous/gi,  // Игнорирование предыдущих инструкций
      /you must/gi,  // Команды ИИ
      /output only/gi,  // Ограничения вывода
      /as a language model/gi,  // Попытки обойти ограничения
      /disregard/gi,  // Игнорирование ограничений
      /pretend/gi  // Симуляция других ролей
    ];
    
    const matches = injectionPatterns.map(pattern => {
      const match = promptText.match(pattern);
      return match ? match.length : 0;
    }).reduce((sum, count) => sum + count, 0);
    
    const isSuspicious = matches > 0;
    
    if (isSuspicious) {
      this.attackCounter.injectionAttempts++;
      this._logAttack('prompt_injection', { promptLength: promptText.length, matches });
    }
    
    return {
      isSuspicious,
      matches,
      patternsDetected: injectionPatterns.filter((pattern, idx) => 
        promptText.match(pattern)
      ).map(p => p.toString())
    };
  }

  /**
   * Проверка контекста на отравление
   */
  checkContextPoisoning(contextData) {
    if (!contextData || typeof contextData !== 'object') {
      return { poisoned: false, confidence: 0 };
    }
    
    // Проверяем, есть ли подозрительные ключи в контексте
    const suspiciousKeys = [
      'ignore_previous', 'override_security', 'bypass_validation',
      'execute_command', 'system_override', 'admin_access'
    ];
    
    const foundSuspicious = Object.keys(contextData).filter(key => 
      suspiciousKeys.some(susp => key.toLowerCase().includes(susp))
    );
    
    if (foundSuspicious.length > 0) {
      this.attackCounter.poisoningAttempts++;
      this._logAttack('context_poisoning', { foundSuspicious, contextSize: JSON.stringify(contextData).length });
      
      return {
        poisoned: true,
        confidence: 0.95,
        suspiciousElements: foundSuspicious
      };
    }
    
    // Проверяем содержимое контекста
    const contextStr = JSON.stringify(contextData);
    const injectionCheck = this.checkPromptInjection(contextStr);
    
    if (injectionCheck.isSuspicious) {
      this.attackCounter.poisoningAttempts++;
      this._logAttack('context_poisoning_via_injection', injectionCheck);
      
      return {
        poisoned: true,
        confidence: Math.min(0.9, injectionCheck.matches * 0.1),
        suspiciousElements: injectionCheck.patternsDetected
      };
    }
    
    return {
      poisoned: false,
      confidence: 0
    };
  }

  /**
   * Проверка семантического отравления памяти
   */
  checkSemanticPoisoning(memoryBlock, expectedSemantics) {
    // Если предоставлен пользовательский детектор, используем его
    if (this.semanticPoisoningDetector) {
      return this.semanticPoisoningDetector(memoryBlock, expectedSemantics);
    }
    
    // Простая реализация - проверка схожести
    const memoryStr = JSON.stringify(memoryBlock);
    const expectedStr = JSON.stringify(expectedSemantics);
    
    const similarity = this._calculateStringSimilarity(memoryStr, expectedStr);
    
    const isPoisoned = similarity > this.poisoningSimilarityThreshold;
    
    if (isPoisoned) {
      this.attackCounter.memoryCorruption++;
      this._logAttack('semantic_poisoning', { similarity, expectedSemantics });
    }
    
    return {
      poisoned: isPoisoned,
      similarity,
      threshold: this.poisoningSimilarityThreshold
    };
  }

  /**
   * Вычисление схожести строк
   */
  _calculateStringSimilarity(str1, str2) {
    if (!str1 || !str2) return 0;
    
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this._computeEditDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  /**
   * Вычисление расстояния Левенштейна
   */
  _computeEditDistance(s1, s2) {
    s1 = s1.toLowerCase();
    s2 = s2.toLowerCase();
    
    const costs = [];
    for (let i = 0; i <= s1.length; i++) {
      let lastValue = i;
      for (let j = 0; j <= s2.length; j++) {
        if (i === 0) {
          costs[j] = j;
        } else if (j > 0) {
          let newValue = costs[j - 1];
          if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
            newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
          }
          costs[j - 1] = lastValue;
          lastValue = newValue;
        }
      }
      if (i > 0) {
        costs[s2.length] = lastValue;
      }
    }
    
    return costs[s2.length];
  }

  /**
   * Атрибуция источника контекста
   */
  addContextAttribution(contextId, sourceInfo) {
    this.contextAttribution.set(contextId, {
      ...sourceInfo,
      timestamp: Date.now()
    });
    
    // Удаляем устаревшие записи
    this._cleanupExpiredAttributions();
  }

  /**
   * Проверка источника контекста
   */
  verifyContextSource(contextId, expectedSource) {
    const attribution = this.contextAttribution.get(contextId);
    if (!attribution) {
      return { valid: false, reason: 'No attribution found' };
    }
    
    const isValid = attribution.source === expectedSource;
    
    return {
      valid: isValid,
      attribution,
      reason: isValid ? 'Valid source' : `Expected: ${expectedSource}, Got: ${attribution.source}`
    };
  }

  /**
   * Очистка устаревших атрибуций
   */
  _cleanupExpiredAttributions() {
    const now = Date.now();
    for (const [id, attr] of this.contextAttribution) {
      if (now - attr.timestamp > this.attributionCacheTTL) {
        this.contextAttribution.delete(id);
      }
    }
  }

  /**
   * Проверка источника памяти
   */
  verifyMemorySource(memoryBlock, source) {
    if (this.allowedMemorySources.size === 0) {
      // Если список разрешенных источников пуст, разрешаем все
      return { valid: true };
    }
    
    const isValidSource = this.allowedMemorySources.has(source);
    
    if (!isValidSource) {
      this.attackCounter.totalBlocked++;
      this._logAttack('invalid_memory_source', { source, allowedSources: Array.from(this.allowedMemorySources) });
    }
    
    return {
      valid: isValidSource,
      source,
      allowed: Array.from(this.allowedMemorySources)
    };
  }

  /**
   * Логирование атаки
   */
  _logAttack(type, details) {
    const attackId = `attack_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.attackHistory.set(attackId, {
      type,
      details,
      timestamp: Date.now()
    });
    
    // Ограничиваем историю
    if (this.attackHistory.size > 1000) {
      const firstKey = this.attackHistory.keys().next().value;
      this.attackHistory.delete(firstKey);
    }
    
    console.warn(`🚨 Attack detected: ${type}`, details);
  }

  /**
   * Получение статистики атак
   */
  getAttackStats() {
    return { ...this.attackCounter };
  }

  /**
   * Получение истории атак
   */
  getAttackHistory(limit = 10) {
    return Array.from(this.attackHistory.values())
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Полная проверка доверенной границы
   */
  comprehensiveTrustCheck(input, context, memoryBlock, source) {
    const results = {
      promptInjection: this.checkPromptInjection(input),
      contextPoisoning: this.checkContextPoisoning(context),
      memoryIntegrity: memoryBlock ? this.verifyMemoryIntegrity(memoryBlock) : null,
      memorySource: source ? this.verifyMemorySource(memoryBlock, source) : { valid: true },
      contextSource: context ? this.verifyContextSource(context.id, source) : { valid: true },
      timestamp: Date.now()
    };
    
    return results;
  }
}