/**
 * Byzantine Fault Tolerance Module
 * 
 * Обеспечивает устойчивость к злонамеренным или коррумпированным агентам
 */

export class ByzantineTolerance {
  constructor(options = {}) {
    // Кворум для голосования
    this.quorumSize = options.quorumSize || 3;
    
    // Минимальное доверие для участия в кворуме
    this.minTrustThreshold = options.minTrustThreshold || 0.5;
    
    // Репутационная система
    this.agentReputation = new Map();
    
    // История действий агентов
    this.actionHistory = new Map();
    
    // Система консенсуса
    this.consensusMechanism = options.consensusMechanism || 'majority_vote';
    
    // Порог для принятия решения
    this.consensusThreshold = options.consensusThreshold || 0.6;
    
    // Время жизни голосов
    this.voteExpirationTime = options.voteExpirationTime || 30000; // 30 секунд
    
    // История голосов
    this.voteHistory = new Map();
    
    // Список подозреваемых агентов
    this.suspectedAgents = new Set();
    
    // Время карантина для подозреваемых агентов
    this.quarantineDuration = options.quarantineDuration || 300000; // 5 минут
  }

  /**
   * Регистрация агента в системе
   */
  registerAgent(agentId, initialTrust = 1.0) {
    this.agentReputation.set(agentId, {
      trust: initialTrust,
      lastActivity: Date.now(),
      reputationHistory: [{ trust: initialTrust, timestamp: Date.now() }]
    });
    
    console.log(`✅ Registered agent: ${agentId} with initial trust: ${initialTrust}`);
  }

  /**
   * Получение уровня доверия к агенту
   */
  getAgentTrust(agentId) {
    const agent = this.agentReputation.get(agentId);
    return agent ? agent.trust : 0;
  }

  /**
   * Обновление репутации агента
   */
  updateAgentReputation(agentId, action, outcome, weight = 1.0) {
    const agent = this.agentReputation.get(agentId);
    if (!agent) {
      console.warn(`Agent ${agentId} not registered`);
      return;
    }
    
    // Обновляем доверие на основе результата действия
    const oldTrust = agent.trust;
    let trustDelta = 0;
    
    if (outcome === 'success') {
      trustDelta = 0.1 * weight;
    } else if (outcome === 'failure') {
      trustDelta = -0.1 * weight;
    } else if (outcome === 'malicious') {
      trustDelta = -0.5 * weight;
    }
    
    // Ограничиваем доверие от 0 до 1
    agent.trust = Math.max(0, Math.min(1, agent.trust + trustDelta));
    
    // Добавляем в историю
    agent.reputationHistory.push({
      trust: agent.trust,
      timestamp: Date.now(),
      action,
      outcome,
      oldTrust
    });
    
    // Ограничиваем историю до последних 100 записей
    if (agent.reputationHistory.length > 100) {
      agent.reputationHistory = agent.reputationHistory.slice(-100);
    }
    
    agent.lastActivity = Date.now();
    
    console.log(`📊 Updated trust for agent ${agentId}: ${oldTrust.toFixed(2)} → ${agent.trust.toFixed(2)}`);
  }

  /**
   * Добавление действия агента в историю
   */
  logAgentAction(agentId, action, context) {
    if (!this.actionHistory.has(agentId)) {
      this.actionHistory.set(agentId, []);
    }
    
    const history = this.actionHistory.get(agentId);
    history.push({
      action,
      context,
      timestamp: Date.now()
    });
    
    // Ограничиваем историю до последних 1000 записей
    if (history.length > 1000) {
      history.shift();
    }
  }

  /**
   * Проверка консенсуса для действия
   */
  async reachConsensus(action, context, proposerId) {
    // Получаем всех агентов с достаточным уровнем доверия
    const qualifiedAgents = Array.from(this.agentReputation.entries())
      .filter(([id, data]) => 
        data.trust >= this.minTrustThreshold && id !== proposerId
      )
      .map(([id, data]) => id)
      .slice(0, this.quorumSize - 1); // -1 потому что включаем пропонента
    
    // Добавляем пропонента если он проходит порог
    if (this.getAgentTrust(proposerId) >= this.minTrustThreshold) {
      qualifiedAgents.unshift(proposerId);
    }
    
    // Ограничиваем до кворума
    qualifiedAgents.splice(this.quorumSize);
    
    if (qualifiedAgents.length < Math.floor(this.quorumSize / 2) + 1) {
      console.warn(`⚠️ Insufficient agents for consensus (${qualifiedAgents.length}/${this.quorumSize})`);
      return { approved: false, reason: 'insufficient_agents' };
    }
    
    // Симуляция голосования (в реальной системе это было бы асинхронно)
    const votes = await this._simulateVotes(qualifiedAgents, action, context);
    
    // Подсчет голосов
    const yesVotes = votes.filter(vote => vote.decision === true).length;
    const totalVotes = votes.length;
    
    const consensusReached = (yesVotes / totalVotes) >= this.consensusThreshold;
    
    // Записываем результат голосования
    const voteRecord = {
      action,
      context,
      proposerId,
      votes,
      yesVotes,
      totalVotes,
      consensusReached,
      timestamp: Date.now()
    };
    
    const voteId = `vote_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.voteHistory.set(voteId, voteRecord);
    
    // Ограничиваем историю голосов
    if (this.voteHistory.size > 1000) {
      const firstKey = this.voteHistory.keys().next().value;
      this.voteHistory.delete(firstKey);
    }
    
    if (consensusReached) {
      console.log(`✅ Consensus reached for action "${action}" (${yesVotes}/${totalVotes})`);
    } else {
      console.warn(`❌ Consensus failed for action "${action}" (${yesVotes}/${totalVotes})`);
    }
    
    return {
      approved: consensusReached,
      yesVotes,
      totalVotes,
      voteId,
      voters: votes.map(v => v.agentId)
    };
  }

  /**
   * Симуляция голосования агентов
   */
  async _simulateVotes(agents, action, context) {
    // В реальной системе это было бы асинхронным взаимодействием с агентами
    return Promise.all(agents.map(async agentId => {
      const trust = this.getAgentTrust(agentId);
      const randomFactor = Math.random();
      
      // Чем выше доверие, тем более вероятно, что агент проголосует "да"
      // Но даже с высоким доверием возможны отказы
      const decision = randomFactor < (trust * 0.8 + 0.1);
      
      return {
        agentId,
        decision,
        trust,
        timestamp: Date.now()
      };
    }));
  }

  /**
   * Проверка, является ли агент подозрительным
   */
  isAgentSuspected(agentId) {
    return this.suspectedAgents.has(agentId);
  }

  /**
   * Пометка агента как подозрительного
   */
  suspectAgent(agentId, reason) {
    if (!this.suspectedAgents.has(agentId)) {
      this.suspectedAgents.add(agentId);
      
      console.warn(`🚨 Agent ${agentId} marked as suspected: ${reason}`);
      
      // Снижаем доверие к подозрительному агенту
      this.updateAgentReputation(agentId, 'suspected', 'failure', 2.0);
      
      // Изолируем агента на время
      setTimeout(() => {
        this.suspectedAgents.delete(agentId);
        console.info(`🔓 Agent ${agentId} released from suspicion quarantine`);
      }, this.quarantineDuration);
    }
  }

  /**
   * Проверка агента на коррумпированность
   */
  checkAgentCorruption(agentId, recentActions) {
    const agent = this.agentReputation.get(agentId);
    if (!agent) return false;
    
    // Проверяем историю действий агента
    const recentHistory = this.actionHistory.get(agentId) || [];
    const recentCount = recentHistory.filter(a => 
      Date.now() - a.timestamp < 300000 // Последние 5 минут
    ).length;
    
    // Если агент совершил много действий за короткое время - подозрительно
    if (recentCount > 20) {
      return {
        corrupted: true,
        reason: `Excessive activity: ${recentCount} actions in last 5 minutes`
      };
    }
    
    // Проверяем, совпадают ли последние действия с известными шаблонами атак
    for (const action of recentActions) {
      if (this._isMaliciousActionPattern(action)) {
        return {
          corrupted: true,
          reason: `Detected malicious action pattern: ${action.type}`
        };
      }
    }
    
    // Проверяем, не противоречит ли поведение агента его репутации
    if (agent.trust > 0.8 && recentCount > 10) {
      // Высокодоверенный агент с высокой активностью - потенциальный риск
      return {
        corrupted: true,
        reason: `High trust agent with excessive activity: ${recentCount} recent actions`
      };
    }
    
    return {
      corrupted: false,
      reason: null
    };
  }

  /**
   * Проверка, является ли действие потенциально вредоносным
   */
  _isMaliciousActionPattern(action) {
    // Простая проверка на основе шаблонов
    if (!action || typeof action !== 'object') return false;
    
    // Проверяем тип действия
    const maliciousTypes = [
      'file_system_access', 
      'network_request', 
      'system_command',
      'memory_manipulation',
      'critical_resource_access'
    ];
    
    if (maliciousTypes.includes(action.type)) {
      return true;
    }
    
    // Проверяем параметры действия
    if (action.target && typeof action.target === 'string') {
      const suspiciousTargets = [
        '.env', 'config', 'password', 'secret', 'key', 'credential'
      ];
      
      if (suspiciousTargets.some(target => 
        action.target.toLowerCase().includes(target)
      )) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Получение статистики по системе
   */
  getStats() {
    return {
      totalAgents: this.agentReputation.size,
      suspectedAgents: this.suspectedAgents.size,
      totalVotes: this.voteHistory.size,
      quorumSize: this.quorumSize,
      minTrustThreshold: this.minTrustThreshold,
      consensusThreshold: this.consensusThreshold
    };
  }
}