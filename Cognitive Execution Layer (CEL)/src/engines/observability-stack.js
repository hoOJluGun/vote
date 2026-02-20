/**
 * Comprehensive Observability Stack for LLM Control Plane
 * Implements metrics, monitoring, logging, and alerting
 */

export class ObservabilityStack {
  constructor(options = {}) {
    this.options = {
      metricsCollection: options.metricsCollection !== false,
      detailedLogging: options.detailedLogging !== false,
      alertingEnabled: options.alertingEnabled !== false,
      tracingEnabled: options.tracingEnabled !== false,
      dashboardEnabled: options.dashboardEnabled !== false,
      retentionPeriod: options.retentionPeriod || 30, // days
      ...options
    };
    
    this.metricsCollector = new MetricsCollector();
    this.eventLogger = new EventLogger(this.options);
    this.alertManager = new AlertManager();
    this.tracer = new RequestTracer();
    this.dashboardServer = null;
    
    this.systemMetrics = {
      cpuUsage: 0,
      memoryUsage: 0,
      activeConnections: 0,
      requestsPerSecond: 0,
      errorRate: 0,
      latency: 0,
      lastUpdated: Date.now()
    };
    
    this.logger = console; // In production, this would be a proper logger
    this.monitoringInterval = null;
  }

  /**
   * Initialize the observability stack
   */
  async initialize() {
    this.logger.log('📡 Initializing Observability Stack...');
    
    // Initialize all components
    await this.metricsCollector.initialize();
    await this.eventLogger.initialize();
    await this.alertManager.initialize();
    await this.tracer.initialize();
    
    // Start monitoring
    this.startMonitoring();
    
    // Start dashboard server if enabled
    if (this.options.dashboardEnabled) {
      await this.startDashboardServer();
    }
    
    this.logger.log('✅ Observability Stack initialized');
  }

  /**
   * Start system monitoring
   */
  startMonitoring() {
    this.logger.log('📊 Starting system monitoring...');
    
    // Collect metrics periodically
    this.monitoringInterval = setInterval(() => {
      this.collectSystemMetrics();
    }, 5000); // Every 5 seconds
  }

  /**
   * Collect system metrics
   */
  async collectSystemMetrics() {
    // In a real system, this would collect actual system metrics
    // For now, we'll simulate them
    this.systemMetrics = {
      cpuUsage: Math.random() * 30 + 10, // 10-40%
      memoryUsage: Math.random() * 40 + 20, // 20-60%
      activeConnections: Math.floor(Math.random() * 50) + 10, // 10-60
      requestsPerSecond: Math.floor(Math.random() * 100) + 5, // 5-105
      errorRate: Math.random() * 5, // 0-5%
      latency: Math.floor(Math.random() * 200) + 50, // 50-250ms
      lastUpdated: Date.now()
    };
    
    // Add to metrics collector
    await this.metricsCollector.addMetrics({
      timestamp: Date.now(),
      ...this.systemMetrics
    });
    
    // Check for any metrics exceeding thresholds
    await this.checkMetricThresholds();
  }

  /**
   * Check if any metrics exceed defined thresholds
   */
  async checkMetricThresholds() {
    const alerts = [];
    
    // CPU usage threshold
    if (this.systemMetrics.cpuUsage > 80) {
      alerts.push({
        type: 'high_cpu',
        severity: 'warning',
        message: `CPU usage high: ${this.systemMetrics.cpuUsage}%`,
        value: this.systemMetrics.cpuUsage,
        threshold: 80
      });
    }
    
    // Memory usage threshold
    if (this.systemMetrics.memoryUsage > 85) {
      alerts.push({
        type: 'high_memory',
        severity: 'warning',
        message: `Memory usage high: ${this.systemMetrics.memoryUsage}%`,
        value: this.systemMetrics.memoryUsage,
        threshold: 85
      });
    }
    
    // Error rate threshold
    if (this.systemMetrics.errorRate > 2) {
      alerts.push({
        type: 'high_error_rate',
        severity: 'critical',
        message: `Error rate high: ${this.systemMetrics.errorRate}%`,
        value: this.systemMetrics.errorRate,
        threshold: 2
      });
    }
    
    // Latency threshold
    if (this.systemMetrics.latency > 500) {
      alerts.push({
        type: 'high_latency',
        severity: 'warning',
        message: `Latency high: ${this.systemMetrics.latency}ms`,
        value: this.systemMetrics.latency,
        threshold: 500
      });
    }
    
    // Trigger alerts if any found
    for (const alert of alerts) {
      await this.alertManager.triggerAlert(alert);
    }
  }

  /**
   * Log an event
   */
  async logEvent(event) {
    await this.eventLogger.logEvent(event);
  }

  /**
   * Trace a request
   */
  async traceRequest(traceId, step, data) {
    if (this.options.tracingEnabled) {
      await this.tracer.traceStep(traceId, step, data);
    }
  }

  /**
   * Record a metric
   */
  async recordMetric(metricName, value, tags = {}) {
    if (this.options.metricsCollection) {
      await this.metricsCollector.addMetric(metricName, value, tags);
    }
  }

  /**
   * Get current system metrics
   */
  getSystemMetrics() {
    return { ...this.systemMetrics };
  }

  /**
   * Get metrics for a specific time range
   */
  async getHistoricalMetrics(startTime, endTime) {
    return await this.metricsCollector.getMetricsInRange(startTime, endTime);
  }

  /**
   * Start the dashboard server
   */
  async startDashboardServer() {
    // In a real implementation, this would start a web server for the dashboard
    // For now, we'll just simulate it
    this.logger.log('🖥️ Dashboard server started (simulated)');
    this.dashboardServer = { running: true };
  }

  /**
   * Get dashboard data
   */
  async getDashboardData() {
    return {
      systemMetrics: this.getSystemMetrics(),
      recentLogs: await this.eventLogger.getRecentLogs(50),
      activeAlerts: await this.alertManager.getActiveAlerts(),
      traceSample: await this.tracer.getRecentTraces(10),
      metricSummaries: await this.metricsCollector.getSummaries()
    };
  }

  /**
   * Generate a report
   */
  async generateReport(reportType, options = {}) {
    const report = {
      type: reportType,
      timestamp: Date.now(),
      generatedBy: 'ObservabilityStack',
      data: {}
    };
    
    switch (reportType) {
      case 'system_health':
        report.data = {
          systemMetrics: this.getSystemMetrics(),
          activeAlerts: await this.alertManager.getActiveAlerts(),
          recentEvents: await this.eventLogger.getRecentLogs(100)
        };
        break;
        
      case 'performance':
        report.data = {
          performanceMetrics: await this.metricsCollector.getPerformanceMetrics(),
          latencyPercentiles: await this.metricsCollector.getLatencyPercentiles(),
          throughput: await this.metricsCollector.getThroughput()
        };
        break;
        
      case 'security':
        report.data = {
          securityEvents: await this.eventLogger.getSecurityEvents(),
          threatIndicators: await this.alertManager.getSecurityAlerts(),
          accessPatterns: await this.metricsCollector.getAccessPatterns()
        };
        break;
        
      default:
        throw new Error(`Unknown report type: ${reportType}`);
    }
    
    return report;
  }

  /**
   * Shutdown the observability stack
   */
  async shutdown() {
    this.logger.log('🔌 Shutting down Observability Stack...');
    
    // Stop monitoring
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    
    // Shutdown all components
    await this.metricsCollector.shutdown();
    await this.eventLogger.shutdown();
    await this.alertManager.shutdown();
    await this.tracer.shutdown();
    
    // Stop dashboard server if running
    if (this.dashboardServer) {
      this.dashboardServer.running = false;
      this.logger.log('🖥️ Dashboard server stopped');
    }
    
    this.logger.log('✅ Observability Stack shut down');
  }
}

/**
 * Metrics Collector - collects and stores metrics
 */
class MetricsCollector {
  constructor() {
    this.metrics = new Map();
    this.metricHistory = [];
    this.maxHistorySize = 10000;
  }

  async initialize() {
    console.log('📊 Metrics collector initialized');
  }

  async addMetric(name, value, tags = {}) {
    const timestamp = Date.now();
    
    const metric = {
      name,
      value,
      tags,
      timestamp
    };
    
    // Store in history
    this.metricHistory.push(metric);
    
    // Trim if too large
    if (this.metricHistory.length > this.maxHistorySize) {
      this.metricHistory = this.metricHistory.slice(-this.maxHistorySize);
    }
    
    // Update current value for this metric
    if (!this.metrics.has(name)) {
      this.metrics.set(name, {
        currentValue: value,
        history: [],
        tags
      });
    }
    
    const metricData = this.metrics.get(name);
    metricData.currentValue = value;
    metricData.history.push({ value, timestamp, tags });
    
    // Trim history for this metric
    if (metricData.history.length > 1000) {
      metricData.history = metricData.history.slice(-1000);
    }
  }

  async addMetrics(metricsObj) {
    // Add multiple metrics at once
    for (const [key, value] of Object.entries(metricsObj)) {
      if (key !== 'timestamp') {
        await this.addMetric(key, value, { source: 'system' });
      }
    }
  }

  async getMetricsInRange(startTime, endTime) {
    return this.metricHistory.filter(m => 
      m.timestamp >= startTime && m.timestamp <= endTime
    );
  }

  async getSummaries() {
    const summaries = {};
    
    for (const [name, data] of this.metrics) {
      const values = data.history.map(h => h.value).filter(v => typeof v === 'number');
      
      if (values.length > 0) {
        const sum = values.reduce((a, b) => a + b, 0);
        summaries[name] = {
          currentValue: data.currentValue,
          average: sum / values.length,
          min: Math.min(...values),
          max: Math.max(...values),
          count: values.length
        };
      }
    }
    
    return summaries;
  }

  async getPerformanceMetrics() {
    // Calculate performance-specific metrics
    const latencyMetrics = this.metrics.get('latency');
    if (latencyMetrics) {
      const values = latencyMetrics.history
        .map(h => h.value)
        .filter(v => typeof v === 'number');
      
      if (values.length > 0) {
        const sortedValues = [...values].sort((a, b) => a - b);
        return {
          avgLatency: values.reduce((a, b) => a + b, 0) / values.length,
          medianLatency: sortedValues[Math.floor(sortedValues.length / 2)],
          p95Latency: sortedValues[Math.floor(sortedValues.length * 0.95)],
          p99Latency: sortedValues[Math.floor(sortedValues.length * 0.99)]
        };
      }
    }
    
    return {};
  }

  async getLatencyPercentiles() {
    const latencyMetrics = this.metrics.get('latency');
    if (latencyMetrics) {
      const values = latencyMetrics.history
        .map(h => h.value)
        .filter(v => typeof v === 'number')
        .sort((a, b) => a - b);
      
      if (values.length > 0) {
        return {
          p50: values[Math.floor(values.length * 0.5)],
          p90: values[Math.floor(values.length * 0.9)],
          p95: values[Math.floor(values.length * 0.95)],
          p99: values[Math.floor(values.length * 0.99)]
        };
      }
    }
    
    return {};
  }

  async getThroughput() {
    const requestMetrics = this.metrics.get('requestsPerSecond');
    if (requestMetrics && requestMetrics.history.length > 0) {
      const recent = requestMetrics.history.slice(-10); // Last 10 measurements
      const sum = recent.reduce((sum, h) => sum + h.value, 0);
      return sum / recent.length;
    }
    
    return 0;
  }

  async getAccessPatterns() {
    // Return access pattern metrics
    const accessMetrics = this.metrics.get('activeConnections');
    if (accessMetrics) {
      const values = accessMetrics.history
        .map(h => h.value)
        .filter(v => typeof v === 'number');
      
      if (values.length > 0) {
        return {
          avgConcurrent: values.reduce((a, b) => a + b, 0) / values.length,
          peakConcurrent: Math.max(...values),
          currentConcurrent: values[values.length - 1]
        };
      }
    }
    
    return {};
  }

  async shutdown() {
    console.log('📊 Metrics collector shut down');
  }
}

/**
 * Event Logger - logs system events
 */
class EventLogger {
  constructor(options) {
    this.options = options;
    this.events = [];
    this.maxEvents = 10000;
    this.securityEvents = [];
    this.maxSecurityEvents = 1000;
  }

  async initialize() {
    console.log('📝 Event logger initialized');
  }

  async logEvent(event) {
    const logEntry = {
      ...event,
      timestamp: Date.now(),
      logId: this.generateLogId()
    };
    
    // Add to events list
    this.events.push(logEntry);
    
    // If it's a security event, add to security events list too
    if (event.category === 'security' || event.level === 'error') {
      this.securityEvents.push(logEntry);
    }
    
    // Trim if too large
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }
    
    if (this.securityEvents.length > this.maxSecurityEvents) {
      this.securityEvents = this.securityEvents.slice(-this.maxSecurityEvents);
    }
    
    // Log to console if detailed logging is enabled
    if (this.options.detailedLogging) {
      console.log(`[${logEntry.level || 'INFO'}] Event:`, logEntry);
    }
  }

  generateLogId() {
    return `LOG-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  async getRecentLogs(count = 50) {
    return this.events.slice(-count).reverse();
  }

  async getSecurityEvents() {
    return this.securityEvents.slice(-50); // Last 50 security events
  }

  async shutdown() {
    console.log('📝 Event logger shut down');
  }
}

/**
 * Alert Manager - manages system alerts
 */
class AlertManager {
  constructor() {
    this.activeAlerts = [];
    this.alertHistory = [];
    this.maxActiveAlerts = 100;
    this.maxAlertHistory = 1000;
    this.subscribers = [];
  }

  async initialize() {
    console.log('🚨 Alert manager initialized');
  }

  async triggerAlert(alert) {
    const alertEntry = {
      ...alert,
      id: this.generateAlertId(),
      timestamp: Date.now(),
      acknowledged: false
    };
    
    // Add to active alerts
    this.activeAlerts.push(alertEntry);
    
    // Also add to history
    this.alertHistory.push(alertEntry);
    
    // Trim if too large
    if (this.activeAlerts.length > this.maxActiveAlerts) {
      this.activeAlerts = this.activeAlerts.slice(-this.maxActiveAlerts);
    }
    
    if (this.alertHistory.length > this.maxAlertHistory) {
      this.alertHistory = this.alertHistory.slice(-this.maxAlertHistory);
    }
    
    // Notify subscribers
    for (const subscriber of this.subscribers) {
      try {
        await subscriber(alertEntry);
      } catch (error) {
        console.error('Alert subscription error:', error);
      }
    }
    
    console.log(`🚨 ALERT [${alertEntry.severity.toUpperCase()}]:`, alertEntry.message);
  }

  generateAlertId() {
    return `ALERT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  async getActiveAlerts() {
    return this.activeAlerts.filter(alert => !alert.acknowledged);
  }

  async getSecurityAlerts() {
    return this.alertHistory
      .filter(alert => alert.type.includes('security') || alert.severity === 'critical')
      .slice(-20); // Last 20 security alerts
  }

  async acknowledgeAlert(alertId) {
    const alert = this.activeAlerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      return true;
    }
    return false;
  }

  subscribe(callback) {
    this.subscribers.push(callback);
  }

  async shutdown() {
    console.log('🚨 Alert manager shut down');
  }
}

/**
 * Request Tracer - traces request flows
 */
class RequestTracer {
  constructor() {
    this.traces = new Map();
    this.maxTraces = 1000;
    this.completedTraces = [];
    this.maxCompletedTraces = 10000;
  }

  async initialize() {
    console.log('🔍 Request tracer initialized');
  }

  async traceStep(traceId, step, data) {
    if (!this.traces.has(traceId)) {
      this.traces.set(traceId, {
        id: traceId,
        startTime: Date.now(),
        steps: [],
        completed: false
      });
    }
    
    const trace = this.traces.get(traceId);
    trace.steps.push({
      step,
      data,
      timestamp: Date.now(),
      duration: Date.now() - trace.startTime
    });
    
    // If this is a completion step, move to completed traces
    if (step.includes('complete') || step.includes('done') || step.includes('finish')) {
      trace.completed = true;
      trace.endTime = Date.now();
      trace.totalDuration = trace.endTime - trace.startTime;
      
      this.completedTraces.push({...trace});
      this.traces.delete(traceId);
      
      // Trim completed traces if too large
      if (this.completedTraces.length > this.maxCompletedTraces) {
        this.completedTraces = this.completedTraces.slice(-this.maxCompletedTraces);
      }
    }
    
    // Trim active traces if too large
    if (this.traces.size > this.maxTraces) {
      // Remove oldest traces
      const traceIds = Array.from(this.traces.keys());
      for (let i = 0; i < 10; i++) {  // Remove 10 oldest
        if (traceIds[i]) {
          this.traces.delete(traceIds[i]);
        }
      }
    }
  }

  async getRecentTraces(count = 10) {
    const allTraces = [...this.completedTraces, ...Array.from(this.traces.values())];
    return allTraces.slice(-count).reverse();
  }

  async shutdown() {
    console.log('🔍 Request tracer shut down');
  }
}

// If running directly
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('Observability stack module loaded. Import and use the ObservabilityStack class in your application.');
}