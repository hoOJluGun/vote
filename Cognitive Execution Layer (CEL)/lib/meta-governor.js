/**
 * Meta-Governor
 * 
 * Надсистема управления, следящая за поведением системы как системы
 * Находится над SHVL, Stability Engine и Orchestration
 */

export class MetaGovernor {
  constructor(options = {}) {
    // Ссылки на основные компоненты системы
    this.shvl = options.shvl || null;
    this.stabilityEngine = options.stabilityEngine || null;
    this.orchestrationEngine = options.orchestrationEngine || null;
    
    // Состояние мета-управления
    this.metaControlState = {
      systemHealth: 1.0,  // 0.0 - 1.0
      autonomyLevel: 1.0, // 0.0 - 1.0
      interventionRequired: false,
      lastIntervention: null,
      overrideMode: false
    };
    
    // Параметры управления
    this.controlParameters = {
      healthThreshold: options.healthThreshold || 0.6,
      autonomyAdjustmentRate: options.autonomyAdjustmentRate || 0.1,
      interventionCooldown: options.interventionCooldown || 30000, // 30 секунд
      maxInterventionsPerMinute: options.maxInterventionsPerMinute || 5
    };
    
    // История вмешательств
    this.interventionHistory = [];
    
    // Мета-метрики системы
    this.metaMetrics = {
      systemCoherence: 1.0,
      behavioralConsistency: 1.0,
      metaStability: 1.0,
      selfModificationRate: 0.0
    };
    
    // Таймеры
    this.monitoringTimer = null;
    this.lastInterventionTime = 0;
    this.interventionCountThisMinute = 0;
    
    // Функция уведомления о вмешательстве
    this.onMetaIntervention = options.onMetaIntervention || (() => {});
    
    // Состояние деградации мета-уровня
    this.metaDegradationState = {
      detected: false,
      severity: 0,
      causes: [],
      timestamp: null
    };
  }

  /**
   * Установка ссылки на компонент
   */
  setComponent(componentName, component) {
    switch (componentName) {
      case 'shvl':
        this.shvl = component;
        break;
      case 'stabilityEngine':
        this.stabilityEngine = component;
        break;
      case 'orchestrationEngine':
        this.orchestrationEngine = component;
        break;
      default:
        throw new Error(`Unknown component: ${componentName}`);
    }
    
    console.log(`⚙️ Set component reference: ${componentName}`);
  }

  /**
   * Запуск мониторинга мета-уровня
   */
  startMonitoring(interval = 10000) { // по умолчанию каждые 10 секунд
    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
    }
    
    this.monitoringTimer = setInterval(() => {
      this.performMetaAssessment();
    }, interval);
    
    console.log(`👁️ Started meta-monitoring with ${interval}ms interval`);
  }

  /**
   * Остановка мониторинга мета-уровня
   */
  stopMonitoring() {
    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
      this.monitoringTimer = null;
    }
    
    console.log('✅ Stopped meta-monitoring');
  }

  /**
   * Выполнение мета-оценки системы
   */
  performMetaAssessment() {
    // Проверяем, не было ли недавно вмешательства
    if (Date.now() - this.lastInterventionTime < this.controlParameters.interventionCooldown) {
      return; // Пропускаем оценку
    }
    
    // Получаем метрики от компонентов
    const systemMetrics = this._collectSystemMetrics();
    
    // Оцениваем здоровье системы
    const health = this._assessSystemHealth(systemMetrics);
    
    // Оцениваем координацию между компонентами
    const coherence = this._assessSystemCoherence(systemMetrics);
    
    // Оцениваем стабильность поведения
    const behavioralStability = this._assessBehavioralStability(systemMetrics);
    
    // Обновляем мета-метрики
    this.metaMetrics = {
      systemHealth: health,
      systemCoherence: coherence,
      behavioralConsistency: behavioralStability,
      metaStability: this._calculateMetaStability(),
      selfModificationRate: this._calculateSelfModificationRate()
    };
    
    // Проверяем, требуется ли вмешательство
    const interventionNeeded = this._shouldIntervene(health, coherence, behavioralStability);
    
    if (interventionNeeded) {
      this._performMetaIntervention(systemMetrics);
    }
    
    // Проверяем деградацию мета-уровня
    this._checkMetaDegradation(systemMetrics);
    
    console.log(`📊 Meta-Assessment: Health=${health.toFixed(2)}, Coherence=${coherence.toFixed(2)}, Stability=${behavioralStability.toFixed(2)}, Intervention=${interventionNeeded ? 'YES' : 'NO'}`);
  }

  /**
   * Сбор метрик системы
   */
  _collectSystemMetrics() {
    const metrics = {
      shvl: null,
      stabilityEngine: null,
      orchestrationEngine: null,
      systemWide: {}
    };
    
    // Собираем метрики от SHVL
    if (this.shvl && typeof this.shvl.getStatus === 'function') {
      try {
        metrics.shvl = this.shvl.getStatus();
      } catch (e) {
        console.error('Error collecting SHVL metrics:', e);
      }
    }
    
    // Собираем метрики от Stability Engine
    if (this.stabilityEngine && typeof this.stabilityEngine.getStabilityMetrics === 'function') {
      try {
        metrics.stabilityEngine = this.stabilityEngine.getStabilityMetrics();
      } catch (e) {
        console.error('Error collecting Stability Engine metrics:', e);
      }
    }
    
    // Собираем метрики от Orchestration Engine
    if (this.orchestrationEngine && typeof this.orchestrationEngine.getPerformanceMetrics === 'function') {
      try {
        metrics.orchestrationEngine = this.orchestrationEngine.getPerformanceMetrics();
      } catch (e) {
        console.error('Error collecting Orchestration Engine metrics:', e);
      }
    }
    
    // Собираем общесистемные метрики
    metrics.systemWide = {
      timestamp: Date.now(),
      uptime: process.uptime ? process.uptime() : 0,
      memoryUsage: process.memoryUsage ? process.memoryUsage() : {},
      cpuUsage: null // В реальной системе здесь будет сбор CPU
    };
    
    return metrics;
  }

  /**
   * Оценка здоровья системы
   */
  _assessSystemHealth(metrics) {
    let healthScore = 1.0;
    let componentsChecked = 0;
    
    // Оценка SHVL
    if (metrics.shvl) {
      healthScore *= (metrics.shvl.activeRepairs ? 1 - Math.min(1, metrics.shvl.activeRepairs * 0.1) : 1);
      componentsChecked++;
    }
    
    // Оценка Stability Engine
    if (metrics.stabilityEngine) {
      const stability = metrics.stabilityEngine.stabilityIndex || 1.0;
      healthScore *= stability;
      componentsChecked++;
    }
    
    // Оценка Orchestration Engine
    if (metrics.orchestrationEngine) {
      const performance = metrics.orchestrationEngine.performanceScore || 1.0;
      healthScore *= performance;
      componentsChecked++;
    }
    
    // Усредняем, если были проверки
    if (componentsChecked > 0) {
      healthScore = Math.pow(healthScore, 1 / componentsChecked);
    }
    
    return Math.max(0, Math.min(1, healthScore));
  }

  /**
   * Оценка координации между компонентами
   */
  _assessSystemCoherence(metrics) {
    // Проверяем, насколько согласованы действия компонентов
    // Например, если SHVL часто применяет патчи, а Stability Engine часто откатывает - это признак несогласованности
    
    let coherence = 1.0;
    
    if (metrics.shvl && metrics.stabilityEngine) {
      // Сравниваем количество исправлений и откатов
      const recentFixes = metrics.shvl.getFixHistory ? metrics.shvl.getFixHistory(10).length : 0;
      const recentRollbacks = metrics.stabilityEngine.rollbackCount || 0;
      
      // Если соотношение исправлений к откатам слишком велико - снижаем координацию
      if (recentFixes > 0 && recentRollbacks > 0) {
        const ratio = recentRollbacks / recentFixes;
        if (ratio > 0.3) { // Если откатов больше 30% от исправлений
          coherence -= ratio * 0.5; // Снижаем координацию
        }
      }
    }
    
    return Math.max(0, Math.min(1, coherence));
  }

  /**
   * Оценка стабильности поведения
   */
  _assessBehavioralStability(metrics) {
    // Оценка, насколько стабильно ведет себя система
    // Основывается на частоте изменений и их последствиях
    
    let stability = 1.0;
    
    if (metrics.orchestrationEngine) {
      const changeFrequency = metrics.orchestrationEngine.changeFrequency || 0;
      
      // Если слишком часто происходят изменения - снижаем стабильность
      if (changeFrequency > 0.7) {
        stability -= (changeFrequency - 0.7) * 2;
      }
    }
    
    // Также учитываем количество конфликтов
    if (metrics.stabilityEngine && metrics.stabilityEngine.conflictRate) {
      stability -= metrics.stabilityEngine.conflictRate * 0.5;
    }
    
    return Math.max(0, Math.min(1, stability));
  }

  /**
   * Вычисление мета-стабильности
   */
  _calculateMetaStability() {
    // Мета-стабильность - это стабильность самой системы управления
    // Она оценивает, насколько стабильно работает Meta-Governor
    
    // Пока используем простую эвристику
    return 0.9; // В реальной системе это будет более сложное вычисление
  }

  /**
   * Вычисление скорости самомодификации
   */
  _calculateSelfModificationRate() {
    // Оценка, насколько быстро система модифицирует саму себя
    // Это может быть показателем деградации
    
    // Пока используем заглушку
    return 0.1; // В реальной системе это будет вычисляться на основе логов
  }

  /**
   * Проверка необходимости вмешательства
   */
  _shouldIntervene(health, coherence, behavioralStability) {
    // Вмешательство необходимо, если:
    // - здоровье системы ниже порога
    // - координация между компонентами нарушена
    // - поведенческая стабильность нарушена
    
    const shouldIntervene = 
      health < this.controlParameters.healthThreshold ||
      coherence < 0.5 ||  // Порог согласованности
      behavioralStability < 0.5;  // Порог поведенческой стабильности
    
    return shouldIntervene;
  }

  /**
   * Выполнение мета-вмешательства
   */
  _performMetaIntervention(systemMetrics) {
    // Проверяем, не превышено ли количество вмешательств
    const now = Date.now();
    if (now - Math.floor(now / 60000) * 60000 === 0) {
      // Началась новая минута, сбрасываем счетчик
      this.interventionCountThisMinute = 0;
    }
    
    if (this.interventionCountThisMinute >= this.controlParameters.maxInterventionsPerMinute) {
      console.warn('⚠️ Maximum interventions per minute reached, skipping intervention');
      return;
    }
    
    this.interventionCountThisMinute++;
    this.lastInterventionTime = now;
    
    // Логируем вмешательство
    const intervention = {
      id: `meta_intervention_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: now,
      systemMetrics: { ...systemMetrics },
      metaMetrics: { ...this.metaMetrics },
      type: 'meta_governance_action'
    };
    
    this.interventionHistory.push(intervention);
    
    // Ограничиваем историю
    if (this.interventionHistory.length > 1000) {
      this.interventionHistory = this.interventionHistory.slice(-1000);
    }
    
    // Обновляем состояние управления
    this.metaControlState.interventionRequired = true;
    this.metaControlState.lastIntervention = intervention.id;
    
    // Понижаем уровень автономии
    this._reduceAutonomyLevel();
    
    console.log(`🚨 META-INTERVENTION: System health=${this.metaMetrics.systemHealth.toFixed(2)}, reducing autonomy`);
    
    // Вызываем коллбэк
    this.onMetaIntervention(intervention);
  }

  /**
   * Понижение уровня автономии
   */
  _reduceAutonomyLevel() {
    // Понижаем уровень автономии на основе тяжести ситуации
    const health = this.metaMetrics.systemHealth;
    const requiredReduction = Math.max(
      0, 
      (this.controlParameters.healthThreshold - health) * 2
    );
    
    this.metaControlState.autonomyLevel = Math.max(
      0.1, // Минимальный уровень автономии
      this.metaControlState.autonomyLevel - requiredReduction
    );
    
    console.log(`⚖️ Reduced autonomy level to: ${(this.metaControlState.autonomyLevel * 100).toFixed(1)}%`);
  }

  /**
   * Повышение уровня автономии
   */
  increaseAutonomyLevel(amount = 0.1) {
    this.metaControlState.autonomyLevel = Math.min(
      1.0, // Максимальный уровень автономии
      this.metaControlState.autonomyLevel + amount
    );
    
    console.log(`⚖️ Increased autonomy level to: ${(this.metaControlState.autonomyLevel * 100).toFixed(1)}%`);
  }

  /**
   * Проверка деградации мета-уровня
   */
  _checkMetaDegradation(systemMetrics) {
    // Проверяем, не деградирует ли сама система управления
    
    // Если мета-стабильность падает или слишком часты вмешательства
    if (this.metaMetrics.metaStability < 0.5 || this.interventionCountThisMinute > this.controlParameters.maxInterventionsPerMinute * 0.8) {
      this.metaDegradationState.detected = true;
      this.metaDegradationState.severity = this.interventionCountThisMinute / this.controlParameters.maxInterventionsPerMinute;
      this.metaDegradationState.causes = ['high_intervention_frequency'];
      this.metaDegradationState.timestamp = Date.now();
      
      console.warn(`⚠️ META-LEVEL DEGRADATION DETECTED: Severity=${this.metaDegradationState.severity.toFixed(2)}`);
    } else {
      this.metaDegradationState.detected = false;
    }
  }

  /**
   * Активация режима ручного управления
   */
  activateOverrideMode(operatorId) {
    this.metaControlState.overrideMode = true;
    
    const intervention = {
      id: `override_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'manual_override_activation',
      operatorId,
      timestamp: Date.now()
    };
    
    this.interventionHistory.push(intervention);
    
    console.log(`🚨 OVERRIDE MODE ACTIVATED by ${operatorId}`);
  }

  /**
   * Деактивация режима ручного управления
   */
  deactivateOverrideMode(operatorId) {
    this.metaControlState.overrideMode = false;
    
    const intervention = {
      id: `override_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'manual_override_deactivation',
      operatorId,
      timestamp: Date.now()
    };
    
    this.interventionHistory.push(intervention);
    
    console.log(`✅ OVERRIDE MODE DEACTIVATED by ${operatorId}`);
  }

  /**
   * Получение состояния мета-управления
   */
  getMetaControlState() {
    return { ...this.metaControlState };
  }

  /**
   * Получение мета-метрик
   */
  getMetaMetrics() {
    return { ...this.metaMetrics };
  }

  /**
   * Получение истории вмешательств
   */
  getInterventionHistory(limit = 20) {
    return this.interventionHistory
      .slice(-limit)
      .reverse();
  }

  /**
   * Получение состояния деградации мета-уровня
   */
  getMetaDegradationState() {
    return { ...this.metaDegradationState };
  }

  /**
   * Сброс состояния мета-управления
   */
  resetControlState() {
    this.metaControlState = {
      systemHealth: 1.0,
      autonomyLevel: 1.0,
      interventionRequired: false,
      lastIntervention: null,
      overrideMode: false
    };
    
    this.interventionCountThisMinute = 0;
    this.lastInterventionTime = 0;
    
    console.log('🔄 Reset meta-control state');
  }

  /**
   * Получение информации о Meta-Governor
   */
  getMetaGovernorInfo() {
    return {
      controlParameters: { ...this.controlParameters },
      metaControlState: this.getMetaControlState(),
      metaMetrics: this.getMetaMetrics(),
      interventionCount: this.interventionHistory.length,
      monitoringActive: !!this.monitoringTimer,
      metaDegradationState: this.getMetaDegradationState()
    };
  }
}