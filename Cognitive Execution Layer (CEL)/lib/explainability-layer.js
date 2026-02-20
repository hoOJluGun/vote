/**
 * Explainability Layer
 * 
 * Слой объяснимости для принятых решений системы
 */

export class ExplainabilityLayer {
  constructor(options = {}) {
    // История решений
    this.decisionLog = [];
    
    // Причины изменений энтропии
    this.entropyChangeReasons = [];
    
    // История переходов в режим ремонта
    this.repairModeHistory = [];
    
    // История принятых решений
    this.explanationHistory = new Map();
    
    // Максимальный размер истории
    this.maxHistorySize = options.maxHistorySize || 1000;
    
    // Функция логирования объяснений
    this.explanationLogger = options.explanationLogger || console.log;
  }

  /**
   * Логирование решения
   */
  logDecision(decision, metadata = {}) {
    const decisionRecord = {
      id: `decision_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      decision,
      metadata,
      timestamp: Date.now(),
      context: metadata.context || {},
      factors: metadata.factors || [],
      confidence: metadata.confidence || 0.5
    };
    
    this.decisionLog.push(decisionRecord);
    
    // Ограничиваем размер истории
    if (this.decisionLog.length > this.maxHistorySize) {
      this.decisionLog.shift();
    }
    
    this.explanationLogger(`💡 Decision logged: ${decision.type || 'unknown'} - ${decision.description || 'No description'}`);
    
    return decisionRecord.id;
  }

  /**
   * Объяснение выбора патча
   */
  explainPatchChoice(patch, reason, confidence = 0.8) {
    const explanation = {
      type: 'patch_choice_explanation',
      patchId: patch.id,
      reason,
      confidence,
      patchDetails: {
        operations: patch.operations?.length || 0,
        affectedFiles: patch.affectedFiles || [],
        repairStrategy: patch.repairStrategy,
        entropyImpact: patch.metadata?.entropyEstimate
      },
      timestamp: Date.now()
    };
    
    const explanationId = this._storeExplanation(explanation);
    
    this.explanationLogger(`🔍 Patch choice explained: ${reason}`);
    
    return explanationId;
  }

  /**
   * Объяснение роста энтропии
   */
  explainEntropyIncrease(increaseAmount, contributingFactors = [], systemState = {}) {
    const explanation = {
      type: 'entropy_increase_explanation',
      increaseAmount,
      contributingFactors,
      systemState,
      timestamp: Date.now()
    };
    
    // Добавляем в историю изменений энтропии
    this.entropyChangeReasons.push(explanation);
    
    // Ограничиваем размер истории
    if (this.entropyChangeReasons.length > this.maxHistorySize) {
      this.entropyChangeReasons.shift();
    }
    
    const explanationId = this._storeExplanation(explanation);
    
    this.explanationLogger(`📈 Entropy increase explained: +${increaseAmount.toFixed(3)}. Factors: ${contributingFactors.join(', ')}`);
    
    return explanationId;
  }

  /**
   * Объяснение включения режима ремонта
   */
  explainRepairModeActivation(trigger, systemMetrics = {}) {
    const explanation = {
      type: 'repair_mode_activation_explanation',
      trigger,
      systemMetrics,
      timestamp: Date.now()
    };
    
    this.repairModeHistory.push(explanation);
    
    // Ограничиваем размер истории
    if (this.repairModeHistory.length > this.maxHistorySize) {
      this.repairModeHistory.shift();
    }
    
    const explanationId = this._storeExplanation(explanation);
    
    this.explanationLogger(`🛠️ Repair mode activated because: ${trigger}`);
    
    return explanationId;
  }

  /**
   * Объяснение стратегии оркестрации
   */
  explainOrchestrationStrategy(strategy, reasoning = {}, confidence = 0.75) {
    const explanation = {
      type: 'orchestration_strategy_explanation',
      strategy,
      reasoning,
      confidence,
      timestamp: Date.now()
    };
    
    const explanationId = this._storeExplanation(explanation);
    
    this.explanationLogger(`📋 Orchestration strategy: ${strategy}. Reasoning: ${JSON.stringify(reasoning)}`);
    
    return explanationId;
  }

  /**
   * Объяснение изменения автономии
   */
  explainAutonomyChange(newLevel, reason, previousLevel = null) {
    const explanation = {
      type: 'autonomy_change_explanation',
      newLevel,
      previousLevel,
      reason,
      timestamp: Date.now()
    };
    
    const explanationId = this._storeExplanation(explanation);
    
    this.explanationLogger(`⚖️ Autonomy level changed: ${previousLevel || 'unknown'} → ${newLevel}. Reason: ${reason}`);
    
    return explanationId;
  }

  /**
   * Хранилище объяснений
   */
  _storeExplanation(explanation) {
    const explanationId = `exp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.explanationHistory.set(explanationId, {
      ...explanation,
      id: explanationId
    });
    
    // Ограничиваем размер истории
    if (this.explanationHistory.size > this.maxHistorySize) {
      const firstKey = this.explanationHistory.keys().next().value;
      this.explanationHistory.delete(firstKey);
    }
    
    return explanationId;
  }

  /**
   * Получение объяснения по ID
   */
  getExplanation(explanationId) {
    return this.explanationHistory.get(explanationId) || null;
  }

  /**
   * Получение объяснений по типу
   */
  getExplanationsByType(type, limit = 10) {
    const results = [];
    
    for (const [id, explanation] of this.explanationHistory) {
      if (explanation.type === type) {
        results.push(explanation);
        if (results.length >= limit) break;
      }
    }
    
    return results;
  }

  /**
   * Получение объяснений за период
   */
  getExplanationsByTime(fromTime, toTime, limit = 20) {
    const results = [];
    
    for (const [id, explanation] of this.explanationHistory) {
      if (explanation.timestamp >= fromTime && explanation.timestamp <= toTime) {
        results.push(explanation);
      }
    }
    
    // Сортируем по времени и ограничиваем
    return results
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Объяснение текущего состояния системы
   */
  explainCurrentSystemState(systemState) {
    const explanation = {
      type: 'system_state_explanation',
      stateSummary: this._summarizeSystemState(systemState),
      keyIndicators: this._extractKeyIndicators(systemState),
      detectedIssues: this._detectIssues(systemState),
      recommendations: this._generateRecommendations(systemState),
      timestamp: Date.now()
    };
    
    const explanationId = this._storeExplanation(explanation);
    
    this.explanationLogger(`📡 System state explained: ${explanation.stateSummary}`);
    
    return explanationId;
  }

  /**
   * Создание сводки состояния системы
   */
  _summarizeSystemState(systemState) {
    const summary = [];
    
    if (systemState.health) {
      summary.push(`Health: ${systemState.health}%`);
    }
    
    if (systemState.stability) {
      summary.push(`Stability: ${systemState.stability.toFixed(2)}`);
    }
    
    if (systemState.entropy) {
      summary.push(`Entropy: ${systemState.entropy.toFixed(3)}`);
    }
    
    if (systemState.agents) {
      summary.push(`Active agents: ${systemState.agents.active}/${systemState.agents.total}`);
    }
    
    return summary.join(', ');
  }

  /**
   * Извлечение ключевых индикаторов
   */
  _extractKeyIndicators(systemState) {
    const indicators = {};
    
    // Добавляем ключевые метрики
    if (systemState.metrics) {
      for (const [key, value] of Object.entries(systemState.metrics)) {
        if (typeof value === 'number') {
          indicators[key] = value;
        }
      }
    }
    
    // Добавляем состояние компонентов
    if (systemState.components) {
      indicators.componentStatus = Object.keys(systemState.components)
        .map(name => ({
          name,
          status: systemState.components[name].status
        }));
    }
    
    return indicators;
  }

  /**
   * Обнаружение проблем в состоянии системы
   */
  _detectIssues(systemState) {
    const issues = [];
    
    // Проверяем метрики на аномалии
    if (systemState.metrics) {
      if (systemState.metrics.entropy > 0.7) {
        issues.push({
          type: 'high_entropy',
          severity: 'warning',
          description: `Entropy is high: ${systemState.metrics.entropy.toFixed(3)}`
        });
      }
      
      if (systemState.metrics.conflict_rate > 0.5) {
        issues.push({
          type: 'high_conflict_rate',
          severity: 'warning',
          description: `Conflict rate is elevated: ${(systemState.metrics.conflict_rate * 100).toFixed(1)}%`
        });
      }
      
      if (systemState.metrics.error_rate > 0.1) {
        issues.push({
          type: 'high_error_rate',
          severity: 'critical',
          description: `Error rate is high: ${(systemState.metrics.error_rate * 100).toFixed(1)}%`
        });
      }
    }
    
    // Проверяем состояние агентов
    if (systemState.agents && systemState.agents.inactive > systemState.agents.total * 0.3) {
      issues.push({
        type: 'many_inactive_agents',
        severity: 'warning',
        description: `${systemState.agents.inactive} out of ${systemState.agents.total} agents are inactive`
      });
    }
    
    return issues;
  }

  /**
   * Генерация рекомендаций на основе состояния
   */
  _generateRecommendations(systemState) {
    const recommendations = [];
    
    const issues = this._detectIssues(systemState);
    
    for (const issue of issues) {
      switch (issue.type) {
        case 'high_entropy':
          recommendations.push({
            action: 'run_architecture_refactoring',
            priority: 'high',
            description: 'High entropy detected, consider refactoring architecture'
          });
          break;
          
        case 'high_conflict_rate':
          recommendations.push({
            action: 'activate_conflict_resolution',
            priority: 'medium',
            description: 'High conflict rate detected, activate conflict resolution protocols'
          });
          break;
          
        case 'high_error_rate':
          recommendations.push({
            action: 'reduce_autonomy_level',
            priority: 'critical',
            description: 'High error rate detected, consider reducing system autonomy'
          });
          break;
          
        case 'many_inactive_agents':
          recommendations.push({
            action: 'check_agent_health',
            priority: 'high',
            description: 'Many agents are inactive, investigate agent health'
          });
          break;
      }
    }
    
    return recommendations;
  }

  /**
   * Получение всех объяснений
   */
  getAllExplanations(limit = 50) {
    return Array.from(this.explanationHistory.values())
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Получение статистики объяснений
   */
  getExplanationStats() {
    const stats = {
      totalExplanations: this.explanationHistory.size,
      decisionLogCount: this.decisionLog.length,
      entropyChangeCount: this.entropyChangeReasons.length,
      repairModeActivations: this.repairModeHistory.length,
      typeBreakdown: {}
    };
    
    // Подсчитываем типы объяснений
    for (const explanation of this.explanationHistory.values()) {
      const type = explanation.type;
      stats.typeBreakdown[type] = (stats.typeBreakdown[type] || 0) + 1;
    }
    
    return stats;
  }

  /**
   * Очистка истории объяснений
   */
  clearHistory() {
    this.decisionLog = [];
    this.entropyChangeReasons = [];
    this.repairModeHistory = [];
    this.explanationHistory.clear();
    
    this.explanationLogger('🧹 Cleared explanation history');
  }
}