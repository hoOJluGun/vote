/**
 * Meta-Metrics Layer
 * 
 * Единый индекс глобального здоровья системы (Global System Health Index)
 */

export class MetaMetrics {
  constructor(options = {}) {
    // Веса для различных компонентов
    this.weights = {
      stability: options.stabilityWeight || 0.20,
      entropy: options.entropyWeight || 0.15,
      conflict_rate: options.conflictRateWeight || 0.15,
      fix_rate: options.fixRateWeight || 0.10,
      cost_variance: options.costVarianceWeight || 0.10,
      agent_health: options.agentHealthWeight || 0.10,
      safety: options.safetyWeight || 0.10,
      resource_utilization: options.resourceUtilizationWeight || 0.10
    };

    // История метрик
    this.metricsHistory = [];

    // Пороги для различных состояний
    this.thresholds = {
      healthy: options.healthyThreshold || 0.8,
      warning: options.warningThreshold || 0.6,
      critical: options.criticalThreshold || 0.4
    };

    // Время жизни кэша GSHI
    this.gshiCacheTTL = options.gshiCacheTTL || 5000; // 5 секунд

    // Кэш GSHI
    this.gshiCache = null;
    this.gshiCacheTime = 0;

    // История состояний системы
    this.systemStates = [];

    // События изменения состояния
    this.stateChangeEventHandlers = [];
  }

  /**
   * Регистрация обработчика события изменения состояния
   */
  onSystemStateChange(handler) {
    this.stateChangeEventHandlers.push(handler);
  }

  /**
   * Вычисление Global System Health Index (GSHI)
   */
  calculateGSHI(metrics) {
    const now = Date.now();

    // Проверяем кэш
    if (this.gshiCache && (now - this.gshiCacheTime) < this.gshiCacheTTL) {
      return this.gshiCache;
    }

    // Нормализация значений метрик к диапазону [0, 1]
    const normalizedMetrics = {
      stability: this._normalizeMetric(metrics.stability || 0, 0, 1),
      entropy: 1 - this._normalizeMetric(metrics.entropy || 0, 0, 1), // Инвертируем, т.к. низкая энтропия лучше
      conflict_rate: 1 - this._normalizeMetric(metrics.conflict_rate || 0, 0, 1), // Инвертируем
      fix_rate: this._normalizeMetric(metrics.fix_rate || 0, 0, 1),
      cost_variance: 1 - this._normalizeMetric(metrics.cost_variance || 0, 0, 1), // Инвертируем
      agent_health: this._normalizeMetric(metrics.agent_health || 0, 0, 1),
      safety: this._normalizeMetric(metrics.safety || 0, 0, 1),
      resource_utilization: 1 - this._normalizeMetric(metrics.resource_utilization || 0, 0, 1) // Инвертируем если слишком высок
    };

    // Вычисление взвешенного среднего
    let gshi = 0;
    for (const [metricName, value] of Object.entries(normalizedMetrics)) {
      gshi += value * (this.weights[metricName] || 0);
    }

    // Ограничиваем значение в диапазоне [0, 1]
    gshi = Math.max(0, Math.min(1, gshi));

    // Сохраняем в кэш
    this.gshiCache = {
      value: gshi,
      metrics: normalizedMetrics,
      weights: this.weights,
      timestamp: now
    };
    this.gshiCacheTime = now;

    // Добавляем в историю
    this.metricsHistory.push({
      gshi,
      metrics: { ...normalizedMetrics },
      timestamp: now
    });

    // Ограничиваем историю
    if (this.metricsHistory.length > 1000) {
      this.metricsHistory = this.metricsHistory.slice(-1000);
    }

    return this.gshiCache;
  }

  /**
   * Нормализация метрики к диапазону [0, 1]
   */
  _normalizeMetric(value, min, max) {
    if (max === min) return 0;
    return Math.max(0, Math.min(1, (value - min) / (max - min)));
  }

  /**
   * Определение состояния системы по GSHI
   */
  getSystemState(gshiValue) {
    if (typeof gshiValue === 'object' && gshiValue.value !== undefined) {
      gshiValue = gshiValue.value;
    }

    let state;
    if (gshiValue >= this.thresholds.healthy) {
      state = 'HEALTHY';
    } else if (gshiValue >= this.thresholds.warning) {
      state = 'WARNING';
    } else if (gshiValue >= this.thresholds.critical) {
      state = 'CRITICAL';
    } else {
      state = 'EMERGENCY';
    }

    return state;
  }

  /**
   * Получение рекомендаций на основе GSHI
   */
  getRecommendations(gshiResult) {
    const gshi = typeof gshiResult === 'object' ? gshiResult.value : gshiResult;
    const state = this.getSystemState(gshi);
    
    const recommendations = [];
    
    if (state === 'EMERGENCY') {
      recommendations.push({
        priority: 'CRITICAL',
        action: 'ACTIVATE_EMERGENCY_PROTOCOLS',
        reason: 'System in emergency state, immediate intervention required'
      });
      recommendations.push({
        priority: 'CRITICAL',
        action: 'REDUCE_AUTONOMY_LEVEL',
        reason: 'Reduce system autonomy to minimum, increase human oversight'
      });
    } else if (state === 'CRITICAL') {
      recommendations.push({
        priority: 'HIGH',
        action: 'ENTER_REPAIR_MODE',
        reason: 'Activate self-healing mechanisms'
      });
      recommendations.push({
        priority: 'HIGH',
        action: 'REDUCE_CONCURRENT_OPERATIONS',
        reason: 'Limit concurrent operations to reduce system load'
      });
    } else if (state === 'WARNING') {
      recommendations.push({
        priority: 'MEDIUM',
        action: 'MONITOR_CLOSELY',
        reason: 'System showing signs of stress, monitor metrics closely'
      });
      recommendations.push({
        priority: 'MEDIUM',
        action: 'OPTIMIZE_RESOURCE_USAGE',
        reason: 'Optimize resource allocation based on current usage patterns'
      });
    } else {
      recommendations.push({
        priority: 'LOW',
        action: 'MAINTAIN_CURRENT_OPERATION',
        reason: 'System operating normally'
      });
    }

    // Добавляем рекомендации на основе отдельных метрик
    if (gshiResult.metrics) {
      if (gshiResult.metrics.entropy > 0.7) {
        recommendations.push({
          priority: 'MEDIUM',
          action: 'RUN_ARCHITECTURE_REFACTOR',
          reason: 'High entropy detected, consider architectural refactoring'
        });
      }
      
      if (gshiResult.metrics.conflict_rate > 0.5) {
        recommendations.push({
          priority: 'HIGH',
          action: 'ACTIVATE_CONFLICT_RESOLUTION',
          reason: 'High conflict rate detected, activate conflict resolution protocols'
        });
      }
      
      if (gshiResult.metrics.cost_variance > 0.6) {
        recommendations.push({
          priority: 'MEDIUM',
          action: 'REVIEW_COST_OPTIMIZATION',
          reason: 'High cost variance detected, review optimization strategies'
        });
      }
    }

    return recommendations;
  }

  /**
   * Активация режима ремонта на основе GSHI
   */
  activateRepairModeIfNeeded(gshiResult) {
    const gshi = typeof gshiResult === 'object' ? gshiResult.value : gshiResult;
    
    if (gshi < this.thresholds.warning) {
      console.warn('⚠️ GSHI below warning threshold, considering activating repair mode...');
      return true;
    }
    
    return false;
  }

  /**
   * Переключение стратегии оркестрации
   */
  getOrchestrationStrategy(gshiResult) {
    const gshi = typeof gshiResult === 'object' ? gshiResult.value : gshiResult;
    
    if (gshi >= this.thresholds.healthy) {
      return 'FULL_AUTONOMY';
    } else if (gshi >= this.thresholds.warning) {
      return 'ASSISTED_AUTONOMY';
    } else if (gshi >= this.thresholds.critical) {
      return 'LIMITED_AUTONOMY';
    } else {
      return 'MANUAL_ONLY';
    }
  }

  /**
   * Понижение уровня автономии
   */
  reduceAutonomyLevel(gshiResult) {
    const strategy = this.getOrchestrationStrategy(gshiResult);
    console.info(`🔄 Reducing autonomy level to: ${strategy}`);
    
    return {
      strategy,
      timestamp: Date.now(),
      reason: 'GSHI-based autonomy adjustment'
    };
  }

  /**
   * Получение текущего GSHI
   */
  getCurrentGSHI() {
    if (this.gshiCache && (Date.now() - this.gshiCacheTime) < this.gshiCacheTTL) {
      return this.gshiCache;
    }
    
    // Если кэш просрочен, возвращаем null
    return null;
  }

  /**
   * Получение истории метрик
   */
  getMetricsHistory(limit = 50) {
    return this.metricsHistory
      .slice(-limit)
      .reverse();
  }

  /**
   * Получение агрегированных метрик за период
   */
  getAggregateMetrics(hoursBack = 24) {
    const timeThreshold = Date.now() - (hoursBack * 60 * 60 * 1000);
    
    const relevantMetrics = this.metricsHistory.filter(
      record => record.timestamp >= timeThreshold
    );
    
    if (relevantMetrics.length === 0) {
      return null;
    }
    
    // Вычисляем средние значения метрик
    const aggregate = {
      avgGSHI: 0,
      minGSHI: 1,
      maxGSHI: 0,
      metrics: {},
      count: relevantMetrics.length,
      period: { start: timeThreshold, end: Date.now() }
    };
    
    // Суммируем GSHI
    for (const record of relevantMetrics) {
      aggregate.avgGSHI += record.gshi;
      aggregate.minGSHI = Math.min(aggregate.minGSHI, record.gshi);
      aggregate.maxGSHI = Math.max(aggregate.maxGSHI, record.gshi);
      
      // Суммируем отдельные метрики
      for (const [key, value] of Object.entries(record.metrics)) {
        if (!aggregate.metrics[key]) {
          aggregate.metrics[key] = { sum: 0, count: 0, min: 1, max: 0 };
        }
        
        const metric = aggregate.metrics[key];
        metric.sum += value;
        metric.count++;
        metric.min = Math.min(metric.min, value);
        metric.max = Math.max(metric.max, value);
      }
    }
    
    // Вычисляем средние
    aggregate.avgGSHI /= relevantMetrics.length;
    
    for (const key of Object.keys(aggregate.metrics)) {
      const metric = aggregate.metrics[key];
      metric.avg = metric.sum / metric.count;
    }
    
    return aggregate;
  }

  /**
   * Обновление весов метрик
   */
  updateWeights(newWeights) {
    for (const [key, value] of Object.entries(newWeights)) {
      if (this.weights.hasOwnProperty(key)) {
        this.weights[key] = value;
      }
    }
    
    console.info('⚖️ Updated GSHI weights:', newWeights);
    
    // Инвалидируем кэш, так как веса изменились
    this.gshiCache = null;
  }

  /**
   * Получение информации о мета-метриках
   */
  getMetaMetricsInfo() {
    return {
      weights: { ...this.weights },
      thresholds: { ...this.thresholds },
      historySize: this.metricsHistory.length,
      lastCalculated: this.gshiCacheTime > 0 ? new Date(this.gshiCacheTime).toISOString() : null
    };
  }
}