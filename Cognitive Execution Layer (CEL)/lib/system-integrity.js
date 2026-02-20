/**
 * System Integrity Module
 * 
 * Криптографическая проверка целостности модулей и защита критических компонентов
 */

export class SystemIntegrity {
  constructor(options = {}) {
    // Хэши модулей
    this.moduleHashes = new Map();
    
    // Критические модули, которые не должны изменяться
    this.criticalModules = new Set([
      'resource-governor.js',
      'deterministic-execution-layer.js',
      'formal-safety-model.js',
      'system-integrity.js',
      'formal-proof-layer.js',
      'byzantine-tolerance.js',
      'trust-boundary-hardening.js',
      'catastrophic-rollback.js',
      'meta-governor.js'
    ]);
    
    // Время жизни кэша проверки
    this.checkCacheTTL = options.checkCacheTTL || 30000; // 30 секунд
    
    // Кэш проверок
    this.checkCache = new Map();
    
    // История нарушений целостности
    this.integrityViolations = [];
    
    // Счетчик нарушений
    this.violationCounter = {
      tamperingAttempts: 0,
      unauthorizedChanges: 0,
      criticalModuleChanges: 0,
      totalViolations: 0
    };
    
    // Функция критического нарушения
    this.onCriticalViolation = options.onCriticalViolation || (() => {});
    
    // Включение защиты криптографической подписью
    this.cryptoProtectionEnabled = options.cryptoProtectionEnabled !== false;
  }

  /**
   * Установка хэша модуля
   */
  setModuleHash(moduleName, hash) {
    this.moduleHashes.set(moduleName, {
      hash,
      timestamp: Date.now(),
      verified: true
    });
    
    console.log(`🔒 Set integrity hash for module: ${moduleName}`);
  }

  /**
   * Вычисление хэша для содержимого
   */
  async computeHash(content) {
    // Простая реализация хэширования - в реальной системе это будет криптографическая функция
    if (typeof content === 'string') {
      let hash = 0;
      for (let i = 0; i < content.length; i++) {
        const char = content.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0; // Convert to 32bit integer
      }
      return Math.abs(hash).toString(16);
    } else {
      const str = JSON.stringify(content);
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0; // Convert to 32bit integer
      }
      return Math.abs(hash).toString(16);
    }
  }

  /**
   * Проверка целостности модуля
   */
  async verifyModuleIntegrity(moduleName, content) {
    const cacheKey = `${moduleName}_${await this.computeHash(content)}`;
    const cached = this.checkCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.checkCacheTTL) {
      return cached.result;
    }
    
    const expectedHash = this.moduleHashes.get(moduleName);
    if (!expectedHash) {
      // Если хэш не установлен, устанавливаем его как эталон
      const hash = await this.computeHash(content);
      this.setModuleHash(moduleName, hash);
      
      const result = {
        moduleName,
        verified: true,
        hash,
        message: 'Module not previously recorded, setting as baseline'
      };
      
      this.checkCache.set(cacheKey, {
        result,
        timestamp: Date.now()
      });
      
      return result;
    }
    
    const actualHash = await this.computeHash(content);
    const isVerified = actualHash === expectedHash.hash;
    
    const result = {
      moduleName,
      expectedHash: expectedHash.hash,
      actualHash,
      verified: isVerified,
      message: isVerified ? 'Module integrity verified' : 'MODULE TAMPERING DETECTED!'
    };
    
    if (!isVerified) {
      this.violationCounter.totalViolations++;
      
      if (this.criticalModules.has(moduleName)) {
        this.violationCounter.criticalModuleChanges++;
        console.error(`🚨 CRITICAL MODULE TAMPERING: ${moduleName}`);
        
        // Вызов критической функции нарушения
        this.onCriticalViolation(moduleName, result);
      } else {
        this.violationCounter.tamperingAttempts++;
        console.warn(`⚠️ Module tampering detected: ${moduleName}`);
      }
      
      // Добавляем в историю нарушений
      this.integrityViolations.push({
        moduleName,
        expectedHash: expectedHash.hash,
        actualHash,
        timestamp: Date.now(),
        type: this.criticalModules.has(moduleName) ? 'critical_module_change' : 'tampering_attempt'
      });
      
      // Ограничиваем историю
      if (this.integrityViolations.length > 1000) {
        this.integrityViolations = this.integrityViolations.slice(-1000);
      }
    }
    
    this.checkCache.set(cacheKey, {
      result,
      timestamp: Date.now()
    });
    
    return result;
  }

  /**
   * Проверка целостности критических модулей
   */
  async verifyCriticalModules() {
    const results = [];
    
    for (const moduleName of this.criticalModules) {
      try {
        // В реальной системе здесь будет чтение содержимого файла
        // Для демонстрации создадим фиктивное содержимое
        const fakeContent = `// Content of ${moduleName}\nconsole.log('fake');`;
        const result = await this.verifyModuleIntegrity(moduleName, fakeContent);
        results.push(result);
      } catch (error) {
        console.error(`Error verifying critical module ${moduleName}:`, error);
        results.push({
          moduleName,
          verified: false,
          error: error.message,
          message: 'Error during integrity check'
        });
      }
    }
    
    return results;
  }

  /**
   * Блокировка изменений критических модулей
   */
  preventCriticalModuleChanges(moduleName) {
    if (this.criticalModules.has(moduleName)) {
      console.error(`🔒 CRITICAL MODULE ${moduleName} IS PROTECTED FROM CHANGES`);
      return false; // Не разрешаем изменения
    }
    
    return true; // Разрешаем изменения незащищенного модуля
  }

  /**
   * Добавление модуля в список критических
   */
  addCriticalModule(moduleName) {
    this.criticalModules.add(moduleName);
    console.log(`🔒 Added critical module: ${moduleName}`);
  }

  /**
   * Удаление модуля из списка критических
   */
  removeCriticalModule(moduleName) {
    this.criticalModules.delete(moduleName);
    console.log(`🔓 Removed critical module: ${moduleName}`);
  }

  /**
   * Проверка на запрет изменения критических компонентов SHVL
   */
  isProtectedComponent(componentName) {
    // Определяем, является ли компонент частью критической системы
    const protectedComponents = [
      'resource-governor',
      'deterministic-execution-layer',
      'formal-safety-model',
      'self-healing-layer',
      'failure-classifier',
      'safe-patch-generator',
      'temporal-simulator',
      'mutation-ledger'
    ];
    
    return protectedComponents.some(pc => componentName.includes(pc));
  }

  /**
   * Проверка попытки изменения защищенного компонента
   */
  checkProtectedComponentAccess(componentName, operation) {
    if (this.isProtectedComponent(componentName) && operation === 'modify') {
      console.error(`🔐 ATTEMPT TO MODIFY PROTECTED COMPONENT: ${componentName}`);
      
      this.violationCounter.unauthorizedChanges++;
      this.integrityViolations.push({
        componentName,
        operation,
        timestamp: Date.now(),
        type: 'protected_component_access'
      });
      
      return false; // Запрещаем операцию
    }
    
    return true; // Разрешаем операцию
  }

  /**
   * Загрузка эталонных хэшей из конфигурации
   */
  loadReferenceHashes(referenceHashes) {
    for (const [moduleName, hash] of Object.entries(referenceHashes)) {
      this.setModuleHash(moduleName, hash);
    }
    
    console.log(`✅ Loaded ${Object.keys(referenceHashes).length} reference hashes`);
  }

  /**
   * Проверка целостности всей системы
   */
  async fullIntegrityCheck() {
    const results = {
      criticalModules: await this.verifyCriticalModules(),
      totalViolations: this.violationCounter.totalViolations,
      recentViolations: this.integrityViolations.slice(-10),
      timestamp: Date.now()
    };
    
    return results;
  }

  /**
   * Получение статистики нарушений
   */
  getViolationStats() {
    return { ...this.violationCounter };
  }

  /**
   * Получение истории нарушений
   */
  getViolationHistory(limit = 10) {
    return this.integrityViolations
      .slice(-limit)
      .reverse();
  }

  /**
   * Сброс счетчиков нарушений
   */
  resetViolationCounters() {
    this.violationCounter = {
      tamperingAttempts: 0,
      unauthorizedChanges: 0,
      criticalModuleChanges: 0,
      totalViolations: 0
    };
    
    console.log('🔄 Reset integrity violation counters');
  }

  /**
   * Получение информации о системе целостности
   */
  getIntegrityInfo() {
    return {
      totalModules: this.moduleHashes.size,
      criticalModules: Array.from(this.criticalModules),
      totalViolations: this.violationCounter.totalViolations,
      cryptoProtectionEnabled: this.cryptoProtectionEnabled
    };
  }
}