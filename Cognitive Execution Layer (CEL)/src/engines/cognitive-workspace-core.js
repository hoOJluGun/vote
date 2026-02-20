import { ProjectKnowledgeGraph } from './project-knowledge-graph.js';

/**
 * Ядро когнитивного рабочего пространства
 */
export class CognitiveWorkspaceCore {
  constructor(projectRoot) {
    this.projectRoot = projectRoot;
    this.conceptualModel = null;
    this.responsibilityMap = null;
    this.invariants = [];
    this.riskAssessments = [];
    this.evolutionModel = null;
    this.graphBuilder = new ProjectKnowledgeGraph(projectRoot);
  }

  /**
   * Строит концептуальную модель проекта
   */
  async buildConceptualModel() {
    console.log('🧠 Building cognitive workspace model...');
    
    // Сначала строим граф знаний проекта
    const projectGraph = await this.graphBuilder.buildGraph();
    
    // Создаем концептуальную модель на основе графа
    this.conceptualModel = {
      entities: this.extractConceptualEntities(projectGraph),
      relationships: this.extractConceptualRelationships(projectGraph),
      responsibilities: this.buildResponsibilityMap(projectGraph),
      invariants: this.trackSystemInvariants(projectGraph),
      riskZones: this.analyzeRiskZones(projectGraph),
      evolutionTimeline: this.predictEvolution(projectGraph)
    };
    
    console.log(`✅ Cognitive model built with ${this.conceptualModel.entities.length} entities`);
    
    return this.conceptualModel;
  }

  /**
   * Извлекает концептуальные сущности из графа проекта
   */
  extractConceptualEntities(projectGraph) {
    const entities = [];
    
    for (const [nodeId, node] of projectGraph.nodes.entries()) {
      if (node.type === 'file' || node.type === 'class' || node.type === 'function') {
        const entity = {
          id: nodeId,
          name: node.filePath ? path.basename(node.filePath) : nodeId,
          type: this.determineEntityType(node),
          purpose: this.determinePurpose(node),
          abstractionLevel: this.calculateAbstractionLevel(node),
          connectedEntities: this.findConnectedEntities(nodeId, projectGraph.edges),
          cognitiveLoad: this.calculateCognitiveLoad(node)
        };
        
        entities.push(entity);
      }
    }
    
    return entities;
  }

  /**
   * Определяет тип сущности
   */
  determineEntityType(node) {
    if (node.type === 'class') return 'service';
    if (node.type === 'function') {
      if (node.name && (node.name.toLowerCase().includes('controller') || 
                        node.name.toLowerCase().includes('handler'))) {
        return 'controller';
      }
      return 'utility';
    }
    if (node.type === 'file') {
      const ext = path.extname(node.filePath).toLowerCase();
      if (ext === '.model' || ext === '.entity' || ext === '.dto') {
        return 'model';
      }
      if (node.filePath.includes('config') || node.filePath.includes('setting')) {
        return 'configuration';
      }
      if (node.filePath.includes('interface') || node.filePath.includes('types')) {
        return 'interface';
      }
      return 'service';
    }
    return 'utility';
  }

  /**
   * Определяет назначение сущности
   */
  determinePurpose(node) {
    if (node.semanticTags && node.semanticTags.length > 0) {
      return node.semanticTags.join(', ');
    }
    
    if (node.filePath) {
      if (node.filePath.includes('test') || node.filePath.includes('spec')) {
        return 'Contains test logic';
      }
      if (node.filePath.includes('api') || node.filePath.includes('route')) {
        return 'Handles API requests';
      }
      if (node.filePath.includes('util') || node.filePath.includes('helper')) {
        return 'Provides utility functions';
      }
      if (node.filePath.includes('model') || node.filePath.includes('entity')) {
        return 'Defines data structures';
      }
    }
    
    return 'General purpose component';
  }

  /**
   * Рассчитывает уровень абстракции
   */
  calculateAbstractionLevel(node) {
    // Уровень абстракции от 0 до 10, где 10 - высокий уровень абстракции
    if (node.type === 'file') {
      // Файлы с "interface", "abstract", "base" имеют высокий уровень абстракции
      if (node.filePath.includes('interface') || 
          node.filePath.includes('abstract') || 
          node.filePath.includes('base')) {
        return 9;
      }
      
      // Файлы с "impl", "concrete" имеют низкий уровень абстракции
      if (node.filePath.includes('impl') || node.filePath.includes('concrete')) {
        return 2;
      }
      
      // Средний уровень для сервисов и контроллеров
      if (node.filePath.includes('service') || node.filePath.includes('controller')) {
        return 6;
      }
      
      // Низкий уровень для утилит
      if (node.filePath.includes('util') || node.filePath.includes('helper')) {
        return 3;
      }
    }
    
    return 5; // по умолчанию
  }

  /**
   * Находит связанные сущности
   */
  findConnectedEntities(nodeId, edges) {
    const connected = [];
    
    for (const [edgeId, edge] of edges.entries()) {
      if (edge.from === nodeId || edge.to === nodeId) {
        const otherId = edge.from === nodeId ? edge.to : edge.from;
        if (!connected.includes(otherId)) {
          connected.push(otherId);
        }
      }
    }
    
    return connected;
  }

  /**
   * Рассчитывает когнитивную нагрузку
   */
  calculateCognitiveLoad(node) {
    // Когнитивная нагрузка от 0 до 1, где 1 - максимальная сложность
    if (node.metrics) {
      const complexity = node.metrics.complexity || 0;
      // Нормализуем значение сложности
      return Math.min(complexity / 50, 1); // предполагаем максимум 50 для нормализации
    }
    return 0.5; // по умолчанию средняя сложность
  }

  /**
   * Извлекает концептуальные отношения
   */
  extractConceptualRelationships(projectGraph) {
    const relationships = [];
    
    for (const [edgeId, edge] of projectGraph.edges.entries()) {
      relationships.push({
        id: edgeId,
        from: edge.from,
        to: edge.to,
        type: edge.type,
        strength: edge.strength || 1.0
      });
    }
    
    return relationships;
  }

  /**
   * Строит карту ответственности
   */
  buildResponsibilityMap(projectGraph) {
    const responsibilityMap = {
      componentResponsibilities: new Map(),
      crosscuttingConcerns: [],
      responsibilityOverlap: new Map()
    };
    
    for (const [nodeId, node] of projectGraph.nodes.entries()) {
      if (node.type === 'file' || node.type === 'class') {
        const responsibility = {
          componentId: nodeId,
          primaryResponsibility: this.determinePrimaryResponsibility(node),
          secondaryResponsibilities: this.determineSecondaryResponsibilities(node),
          stakeholderDomains: this.identifyStakeholderDomains(node),
          changeFrequency: this.estimateChangeFrequency(node),
          couplingStrength: new Map(),
          cohesionScore: this.calculateCohesionScore(node)
        };
        
        // Определяем силу связанности с другими компонентами
        for (const [edgeId, edge] of projectGraph.edges.entries()) {
          if (edge.from === nodeId) {
            responsibility.couplingStrength.set(edge.to, edge.strength || 1.0);
          } else if (edge.to === nodeId) {
            responsibility.couplingStrength.set(edge.from, edge.strength || 1.0);
          }
        }
        
        responsibilityMap.componentResponsibilities.set(nodeId, responsibility);
      }
    }
    
    return responsibilityMap;
  }

  /**
   * Определяет основную ответственность компонента
   */
  determinePrimaryResponsibility(node) {
    if (node.filePath) {
      if (node.filePath.includes('auth') || node.filePath.includes('security')) {
        return 'Authentication and authorization management';
      }
      if (node.filePath.includes('database') || node.filePath.includes('db')) {
        return 'Data persistence and retrieval';
      }
      if (node.filePath.includes('api') || node.filePath.includes('endpoint')) {
        return 'API endpoint handling';
      }
      if (node.filePath.includes('model') || node.filePath.includes('entity')) {
        return 'Data modeling and validation';
      }
      if (node.filePath.includes('service') || node.filePath.includes('manager')) {
        return 'Business logic implementation';
      }
    }
    
    return 'General component functionality';
  }

  /**
   * Определяет второстепенные ответственности
   */
  determineSecondaryResponsibilities(node) {
    const responsibilities = [];
    
    if (node.semanticTags) {
      if (node.semanticTags.includes('logging')) {
        responsibilities.push('Logging and diagnostics');
      }
      if (node.semanticTags.includes('validation')) {
        responsibilities.push('Input validation');
      }
      if (node.semanticTags.includes('cache')) {
        responsibilities.push('Caching');
      }
    }
    
    return responsibilities;
  }

  /**
   * Определяет домены интересов
   */
  identifyStakeholderDomains(node) {
    const domains = [];
    
    if (node.filePath) {
      if (node.filePath.includes('user') || node.filePath.includes('profile')) {
        domains.push('user_management');
      }
      if (node.filePath.includes('payment') || node.filePath.includes('billing')) {
        domains.push('payment_processing');
      }
      if (node.filePath.includes('inventory') || node.filePath.includes('product')) {
        domains.push('inventory_management');
      }
      if (node.filePath.includes('order') || node.filePath.includes('cart')) {
        domains.push('order_processing');
      }
    }
    
    return domains;
  }

  /**
   * Оценивает частоту изменений
   */
  estimateChangeFrequency(node) {
    // В реальной системе это будет основываться на истории Git
    // Пока используем эвристику
    if (node.filePath && node.filePath.includes('test')) {
      return 0.3; // тесты меняются часто
    }
    if (node.filePath && (node.filePath.includes('config') || node.filePath.includes('setting'))) {
      return 0.1; // конфигурации меняются редко
    }
    return 0.5; // средняя частота
  }

  /**
   * Рассчитывает оценку когезии
   */
  calculateCohesionScore(node) {
    // В реальной системе это будет основываться на анализе кода
    // Пока используем простую эвристику
    if (node.type === 'class' && node.semanticTags && node.semanticTags.includes('single-responsibility')) {
      return 0.9; // высокая когезия
    }
    return 0.6; // средняя когезия
  }

  /**
   * Отслеживает системные инварианты
   */
  trackSystemInvariants(projectGraph) {
    const invariants = [];
    
    // Проверяем основные инварианты проекта
    const invariant1 = {
      id: 'no_cycles_in_dependencies',
      description: 'No circular dependencies in the system',
      scope: 'GLOBAL',
      enforcementMechanism: 'BUILD_CHECK',
      criticality: 0.9,
      violationHistory: []
    };
    
    const invariant2 = {
      id: 'proper_layer_separation',
      description: 'Proper separation of architectural layers',
      scope: 'MODULE',
      enforcementMechanism: 'CODE_CONVENTION',
      criticality: 0.8,
      violationHistory: []
    };
    
    invariants.push(invariant1, invariant2);
    
    return invariants;
  }

  /**
   * Анализирует зоны риска
   */
  analyzeRiskZones(projectGraph) {
    const riskAssessments = [];
    
    for (const [nodeId, node] of projectGraph.nodes.entries()) {
      if (node.type === 'file' || node.type === 'class') {
        const riskFactors = [];
        
        // Определяем факторы риска
        if (node.metrics && node.metrics.complexity > 20) {
          riskFactors.push({
            factor: 'high_complexity',
            weight: 0.8,
            evidence: [{ source: 'cyclomatic_complexity', value: node.metrics.complexity, timestamp: new Date() }]
          });
        }
        
        if (node.dependencies && node.dependencies.length > 10) {
          riskFactors.push({
            factor: 'high_cohesion',
            weight: 0.7,
            evidence: [{ source: 'dependency_count', value: node.dependencies.length, timestamp: new Date() }]
          });
        }
        
        if (riskFactors.length > 0) {
          const probability = Math.min(riskFactors.reduce((sum, rf) => sum + rf.weight, 0) / riskFactors.length, 1);
          const impact = this.estimateImpact(node);
          
          riskAssessments.push({
            entity: nodeId,
            riskFactors,
            probability,
            impact,
            riskScore: probability * impact,
            mitigationStrategies: this.proposeMitigations(riskFactors),
            trend: 'UNKNOWN'
          });
        }
      }
    }
    
    return riskAssessments;
  }

  /**
   * Оценивает влияние
   */
  estimateImpact(node) {
    // В реальной системе это будет более сложной логикой
    return 0.7; // среднее влияние
  }

  /**
   * Предлагает стратегии смягчения
   */
  proposeMitigations(riskFactors) {
    const strategies = [];
    
    for (const factor of riskFactors) {
      if (factor.factor === 'high_complexity') {
        strategies.push('Refactor to reduce complexity');
      } else if (factor.factor === 'high_cohesion') {
        strategies.push('Reduce dependencies and improve modularity');
      }
    }
    
    return strategies;
  }

  /**
   * Прогнозирует развитие системы
   */
  predictEvolution(projectGraph) {
    return {
      changePrediction: this.predictChanges(projectGraph),
      architecturalDebt: this.assessArchitecturalDebt(projectGraph),
      growthProjection: this.projectGrowth(projectGraph),
      refactoringPriorities: this.identifyRefactoringPriorities(projectGraph)
    };
  }

  /**
   * Прогнозирует изменения
   */
  predictChanges(projectGraph) {
    const predictions = [];
    
    // В реальной системе это будет основываться на анализе истории Git и паттернов изменений
    // Пока возвращаем заглушку
    return predictions;
  }

  /**
   * Оценивает архитектурный долг
   */
  assessArchitecturalDebt(projectGraph) {
    const debtItems = [];
    
    // В реальной системе это будет основываться на анализе отклонений от архитектурных принципов
    // Пока возвращаем заглушку
    return debtItems;
  }

  /**
   * Проецирует рост
   */
  projectGrowth(projectGraph) {
    // В реальной системе это будет основываться на исторических данных
    return {
      componentGrowth: new Map(),
      resourceNeeds: [],
      timeline: []
    };
  }

  /**
   * Определяет приоритеты рефакторинга
   */
  identifyRefactoringPriorities(projectGraph) {
    const priorities = [];
    
    // Сортируем зоны риска по уровню риска
    const sortedRisks = [...this.riskAssessments].sort((a, b) => b.riskScore - a.riskScore);
    
    for (const risk of sortedRisks) {
      priorities.push({
        component: risk.entity,
        priority: risk.riskScore,
        reason: risk.riskFactors.map(rf => rf.factor).join(', ')
      });
    }
    
    return priorities;
  }

  /**
   * Создает сжатое когнитивное представление для LLM
   */
  getCognitiveViewForLLM() {
    if (!this.conceptualModel) {
      throw new Error('Conceptual model not built yet. Call buildConceptualModel() first.');
    }
    
    // Отбираем ключевые элементы для передачи в LLM
    const keyEntities = this.conceptualModel.entities
      .sort((a, b) => b.cognitiveLoad - a.cognitiveLoad)
      .slice(0, 10); // берем топ-10 самых сложных сущностей
    
    const highRiskAreas = this.conceptualModel.riskZones
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, 5); // берем топ-5 зон риска
    
    const refactoringPriorities = this.conceptualModel.evolutionTimeline.refactoringPriorities
      .slice(0, 5); // берем топ-5 приоритетов рефакторинга
    
    return {
      keyEntities,
      mainResponsibilities: Array.from(this.conceptualModel.responsibilities.componentResponsibilities.values()).slice(0, 10),
      criticalInvariants: this.conceptualModel.invariants,
      highRiskAreas,
      architectureSummary: this.getArchitectureSummary(),
      immediateRecommendations: this.getImmediateRecommendations(refactoringPriorities, highRiskAreas)
    };
  }

  /**
   * Получает краткое архитектурное резюме
   */
  getArchitectureSummary() {
    if (!this.conceptualModel) {
      return null;
    }
    
    const entityTypes = this.conceptualModel.entities.reduce((acc, entity) => {
      acc[entity.type] = (acc[entity.type] || 0) + 1;
      return acc;
    }, {});
    
    const avgCoupling = Array.from(this.conceptualModel.responsibilities.componentResponsibilities.values())
      .reduce((sum, resp) => sum + resp.couplingStrength.size, 0) / 
      this.conceptualModel.responsibilities.componentResponsibilities.size;
    
    return {
      entityDistribution: entityTypes,
      averageCoupling: avgCoupling,
      totalEntities: this.conceptualModel.entities.length,
      highRiskCount: this.conceptualModel.riskZones.length
    };
  }

  /**
   * Получает немедленные рекомендации
   */
  getImmediateRecommendations(refactoringPriorities, highRiskAreas) {
    const recommendations = [];
    
    // Рекомендации по рефакторингу
    for (const priority of refactoringPriorities.slice(0, 3)) {
      recommendations.push({
        target: priority.component,
        type: 'REFACTOR',
        priority: priority.priority,
        briefJustification: `High complexity component with score: ${priority.priority}`,
        expectedBenefit: 0.7
      });
    }
    
    // Рекомендации по зонам риска
    for (const risk of highRiskAreas.slice(0, 2)) {
      recommendations.push({
        target: risk.entity,
        type: 'ADD_TEST',
        priority: risk.riskScore,
        briefJustification: `High-risk area with score: ${risk.riskScore}`,
        expectedBenefit: 0.8
      });
    }
    
    return recommendations;
  }
}

// Импортируем path для использования в модуле
import path from 'path';