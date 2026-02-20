/**
 * Теория устойчивости мультиагентной системы
 */

export class StabilityTheoryEngine {
  constructor() {
    this.conflictRate = 0;
    this.rollbackFrequency = 0;
    this.resourceSpikeRate = 0;
    this.driftRate = 0;
    this.agents = new Map();
    this.metricsWindow = [];
    this.maxWindowSize = 100; // размер окна для расчета метрик
  }

  /**
   * Рассчитывает индекс устойчивости системы
   */
  calculateStabilityIndex() {
    // Используем формулу: StabilityIndex = 1 - (conflictRate + rollbackFrequency + resourceSpikeRate + driftRate)
    // Значения нормализуем к диапазону [0, 1], где 1 - максимальная устойчивость
    const normalizedConflictRate = this.conflictRate;
    const normalizedRollbackFreq = this.rollbackFrequency;
    const normalizedResourceSpikeRate = this.resourceSpikeRate;
    const normalizedDriftRate = this.driftRate;
    
    // Взвешенная сумма (все веса равны 0.25 для простоты, можно настраивать)
    const instabilitySum = 0.25 * normalizedConflictRate + 
                          0.25 * normalizedRollbackFreq + 
                          0.25 * normalizedResourceSpikeRate + 
                          0.25 * normalizedDriftRate;
    
    const stabilityIndex = Math.max(0, 1 - instabilitySum);
    
    return {
      value: stabilityIndex,
      components: {
        conflictRate: normalizedConflictRate,
        rollbackFrequency: normalizedRollbackFreq,
        resourceSpikeRate: normalizedResourceSpikeRate,
        driftRate: normalizedDriftRate
      }
    };
  }

  /**
   * Обновляет метрики на основе новых данных
   */
  updateMetrics(metrics) {
    // Добавляем новые метрики в окно
    this.metricsWindow.push({
      timestamp: Date.now(),
      ...metrics
    });
    
    // Ограничиваем размер окна
    if (this.metricsWindow.length > this.maxWindowSize) {
      this.metricsWindow.shift();
    }
    
    // Пересчитываем метрики на основе окна
    this._recalculateMetrics();
  }

  /**
   * Пересчитывает метрики на основе окна данных
   */
  _recalculateMetrics() {
    if (this.metricsWindow.length === 0) {
      this.conflictRate = 0;
      this.rollbackFrequency = 0;
      this.resourceSpikeRate = 0;
      this.driftRate = 0;
      return;
    }
    
    const totalEntries = this.metricsWindow.length;
    let conflictCount = 0;
    let rollbackCount = 0;
    let resourceSpikeCount = 0;
    let driftCount = 0;
    
    for (const entry of this.metricsWindow) {
      if (entry.conflict) conflictCount++;
      if (entry.rollback) rollbackCount++;
      if (entry.resourceSpike) resourceSpikeCount++;
      if (entry.architectureDrift) driftCount++;
    }
    
    this.conflictRate = conflictCount / totalEntries;
    this.rollbackFrequency = rollbackCount / totalEntries;
    this.resourceSpikeRate = resourceSpikeCount / totalEntries;
    this.driftRate = driftCount / totalEntries;
  }

  /**
   * Обнаруживает конфликты между агентами
   */
  detectConflicts() {
    const conflicts = [];
    
    // Проверяем конфликты на уровне агентов
    for (const [agentId, agent] of this.agents.entries()) {
      if (agent.status === 'BUSY' && agent.executionTime > 30000) { // 30 секунд
        conflicts.push({
          type: 'execution_timeout',
          agentId,
          severity: 'HIGH',
          description: `Agent ${agentId} execution exceeded timeout`
        });
      }
      
      if (agent.resourceUsage && agent.resourceUsage.cpu > 0.9) {
        conflicts.push({
          type: 'resource_overuse',
          agentId,
          severity: 'MEDIUM',
          description: `Agent ${agentId} using excessive CPU`
        });
      }
    }
    
    // Проверяем конфликты на уровне ресурсов
    const resourceConflicts = this._detectResourceConflicts();
    conflicts.push(...resourceConflicts);
    
    return {
      detected: conflicts,
      count: conflicts.length,
      criticalCount: conflicts.filter(c => c.severity === 'HIGH').length
    };
  }

  /**
   * Обнаруживает конфликты ресурсов
   */
  _detectResourceConflicts() {
    const conflicts = [];
    
    // Здесь будет логика обнаружения конфликтов ресурсов
    // Например, если несколько агентов пытаются одновременно модифицировать один файл
    
    return conflicts;
  }

  /**
   * Балансирует нагрузку между агентами
   */
  balanceLoad() {
    const distribution = {
      agents: [],
      loadBalance: 0
    };
    
    // Собираем информацию о нагрузке агентов
    for (const [agentId, agent] of this.agents.entries()) {
      distribution.agents.push({
        id: agentId,
        load: agent.currentLoad || 0,
        capacity: agent.capacity || 1,
        utilization: agent.currentLoad ? agent.currentLoad / agent.capacity : 0
      });
    }
    
    // Рассчитываем баланс (0 = идеально сбалансировано, 1 = полностью дисбаланс)
    if (distribution.agents.length > 1) {
      const utilizations = distribution.agents.map(a => a.utilization);
      const avgUtilization = utilizations.reduce((sum, u) => sum + u, 0) / utilizations.length;
      const variance = utilizations.reduce((sum, u) => sum + Math.pow(u - avgUtilization, 2), 0) / utilizations.length;
      distribution.loadBalance = Math.sqrt(variance); // стандартное отклонение
    }
    
    return distribution;
  }

  /**
   * Изолирует нестабильных агентов
   */
  isolateUnstableAgents() {
    const isolationReport = {
      isolated: [],
      unaffected: []
    };
    
    for (const [agentId, agent] of this.agents.entries()) {
      // Определяем, является ли агент нестабильным
      const isUnstable = this._isAgentUnstable(agent);
      
      if (isUnstable) {
        agent.status = 'ISOLATED';
        isolationReport.isolated.push(agentId);
        
        console.log(`⚠️ Isolating unstable agent: ${agentId}`);
      } else {
        isolationReport.unaffected.push(agentId);
      }
    }
    
    return isolationReport;
  }

  /**
   * Проверяет, является ли агент нестабильным
   */
  _isAgentUnstable(agent) {
    // Критерии нестабильности:
    // - слишком высокое потребление ресурсов
    // - частые ошибки
    // - длительное время выполнения
    // - частые откаты
    
    if (agent.errorCount && agent.errorCount > 5) {
      return true;
    }
    
    if (agent.resourceUsage && agent.resourceUsage.memory > 0.95) {
      return true;
    }
    
    if (agent.executionTime && agent.executionTime > 60000) { // 60 секунд
      return true;
    }
    
    if (agent.rollbackCount && agent.rollbackCount > 3) {
      return true;
    }
    
    return false;
  }

  /**
   * Регистрирует агента в системе
   */
  registerAgent(agentId, agentSpec) {
    this.agents.set(agentId, {
      id: agentId,
      spec: agentSpec,
      status: 'IDLE',
      errorCount: 0,
      rollbackCount: 0,
      executionTime: 0,
      resourceUsage: {},
      currentLoad: 0,
      capacity: agentSpec.capacity || 1,
      registeredAt: Date.now()
    });
  }

  /**
   * Обновляет статус агента
   */
  updateAgentStatus(agentId, status, additionalData = {}) {
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.status = status;
      Object.assign(agent, additionalData);
    }
  }

  /**
   * Получает статус устойчивости системы
   */
  getSystemStabilityStatus() {
    const stabilityIndex = this.calculateStabilityIndex();
    const conflictReport = this.detectConflicts();
    const loadDistribution = this.balanceLoad();
    
    // Определяем уровень устойчивости
    let stabilityLevel = 'CRITICAL';
    if (stabilityIndex.value > 0.8) {
      stabilityLevel = 'STABLE';
    } else if (stabilityIndex.value > 0.6) {
      stabilityLevel = 'MODERATE';
    } else if (stabilityIndex.value > 0.4) {
      stabilityLevel = 'UNSTABLE';
    }
    
    return {
      timestamp: Date.now(),
      stabilityIndex: stabilityIndex.value,
      stabilityLevel,
      components: stabilityIndex.components,
      conflictReport,
      loadDistribution,
      agentCount: this.agents.size,
      totalMetrics: this.metricsWindow.length
    };
  }

  /**
   * Активирует защитные механизмы при низкой устойчивости
   */
  activateProtectionMeasures() {
    const status = this.getSystemStabilityStatus();
    
    if (status.stabilityLevel === 'CRITICAL' || status.stabilityIndex < 0.3) {
      console.warn('🚨 CRITICAL STABILITY THREAT DETECTED - ACTIVATING PROTECTION MEASURES');
      
      // Изолируем нестабильных агентов
      const isolationReport = this.isolateUnstableAgents();
      
      // Уменьшаем количество параллельных операций
      // (в реальной системе это будет влиять на другие компоненты)
      
      return {
        activated: true,
        isolationReport,
        reason: 'Low stability index',
        currentStability: status.stabilityIndex
      };
    }
    
    return {
      activated: false,
      reason: 'Stability within acceptable range',
      currentStability: status.stabilityIndex
    };
  }
}