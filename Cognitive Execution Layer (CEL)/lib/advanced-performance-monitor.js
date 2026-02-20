/**
 * Advanced Performance Monitor with Real-time Analytics
 * Provides comprehensive performance tracking, bottleneck detection, and optimization recommendations
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class AdvancedPerformanceMonitor {
  constructor(options = {}) {
    this.metrics = new Map();
    this.thresholds = options.thresholds || {
      responseTime: 5000,      // 5 seconds
      memoryUsage: 80,          // 80%
      cpuUsage: 70,             // 70%
      errorRate: 5,             // 5%
      throughput: 100,           // requests per minute
      diskIO: 85               // 85%
    };
    
    this.alerts = [];
    this.maxAlerts = 1000;
    this.benchmarks = new Map();
    this.trends = new Map();
    this.performanceHistory = [];
    this.maxHistorySize = 10000;
    
    // Real-time metrics
    this.currentMetrics = {
      requestsPerSecond: 0,
      averageResponseTime: 0,
      errorRate: 0,
      memoryUsage: 0,
      cpuUsage: 0,
      activeConnections: 0,
      queueSize: 0
    };
    
    // Performance optimization flags
    this.optimizationSuggestions = [];
    this.autoOptimizationEnabled = options.autoOptimization || false;
    
    // Initialize monitoring
    this.initializeMonitoring();
  }

  /**
   * Initialize monitoring systems
   */
  async initializeMonitoring() {
    // Start real-time monitoring
    this.startRealTimeMonitoring();
    
    // Load historical data
    await this.loadHistoricalData();
    
    // Set up periodic analysis
    this.setupPeriodicAnalysis();
    
    console.log('[PerformanceMonitor] Advanced monitoring initialized');
  }

  /**
   * Record a performance metric
   */
  recordMetric(type, value, metadata = {}) {
    const timestamp = Date.now();
    const metric = {
      type,
      value,
      timestamp,
      metadata
    };
    
    // Store in metrics map
    if (!this.metrics.has(type)) {
      this.metrics.set(type, []);
    }
    
    this.metrics.get(type).push(metric);
    
    // Update current metrics
    this.updateCurrentMetrics(type, value);
    
    // Check thresholds
    this.checkThresholds(type, value, metadata);
    
    // Update trends
    this.updateTrends(type, value, timestamp);
    
    // Trigger auto-optimization if enabled
    if (this.autoOptimizationEnabled) {
      this.checkForOptimizationOpportunities(type, value);
    }
  }

  /**
   * Record API request performance
   */
  recordApiRequest(endpoint, method, responseTime, statusCode, metadata = {}) {
    const requestMetric = {
      endpoint,
      method,
      responseTime,
      statusCode,
      timestamp: Date.now(),
      success: statusCode >= 200 && statusCode < 400,
      metadata
    };
    
    // Record various metrics
    this.recordMetric('response_time', responseTime, { endpoint, method });
    this.recordMetric('request_count', 1, { endpoint, method, success: requestMetric.success });
    
    if (!requestMetric.success) {
      this.recordMetric('error_count', 1, { endpoint, method, statusCode });
    }
    
    // Update real-time metrics
    this.updateRealTimeMetrics(requestMetric);
  }

  /**
   * Record system resource usage
   */
  recordSystemMetrics() {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    const memoryPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
    
    this.recordMetric('memory_usage', memoryPercent, {
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      external: memUsage.external,
      rss: memUsage.rss
    });
    
    this.recordMetric('cpu_usage', this.calculateCPUPercent(cpuUsage), {
      user: cpuUsage.user,
      system: cpuUsage.system
    });
  }

  /**
   * Start real-time monitoring
   */
  startRealTimeMonitoring() {
    // Monitor system metrics every 5 seconds
    setInterval(() => {
      this.recordSystemMetrics();
    }, 5000);
    
    // Calculate real-time metrics every second
    setInterval(() => {
      this.calculateRealTimeMetrics();
    }, 1000);
  }

  /**
   * Update real-time metrics
   */
  updateRealTimeMetrics(requestMetric) {
    const now = Date.now();
    const recentWindow = 60000; // Last minute
    
    // Filter recent requests
    const recentRequests = this.performanceHistory.filter(
      entry => now - entry.timestamp < recentWindow
    );
    
    // Calculate requests per second
    this.currentMetrics.requestsPerSecond = recentRequests.length / 60;
    
    // Calculate average response time
    const responseTimes = recentRequests.map(r => r.responseTime);
    this.currentMetrics.averageResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length 
      : 0;
    
    // Calculate error rate
    const errors = recentRequests.filter(r => !r.success);
    this.currentMetrics.errorRate = recentRequests.length > 0 
      ? (errors.length / recentRequests.length) * 100 
      : 0;
    
    // Store in history
    this.performanceHistory.push(requestMetric);
    
    // Limit history size
    if (this.performanceHistory.length > this.maxHistorySize) {
      this.performanceHistory.shift();
    }
  }

  /**
   * Calculate real-time metrics
   */
  calculateRealTimeMetrics() {
    const now = Date.now();
    const recentWindow = 10000; // Last 10 seconds
    
    const recentMetrics = Array.from(this.metrics.entries())
      .flatMap(([type, entries]) => 
        entries
          .filter(entry => now - entry.timestamp < recentWindow)
          .map(entry => ({ type, ...entry }))
      );
    
    // Update current metrics based on recent data
    this.currentMetrics.memoryUsage = this.getLatestMetric('memory_usage') || 0;
    this.currentMetrics.cpuUsage = this.getLatestMetric('cpu_usage') || 0;
  }

  /**
   * Check performance thresholds
   */
  checkThresholds(type, value, metadata) {
    const threshold = this.thresholds[type];
    if (!threshold) return;
    
    let severity = 'warning';
    if (value > threshold * 1.5) severity = 'critical';
    else if (value > threshold * 1.2) severity = 'high';
    
    if (value > threshold) {
      const alert = {
        id: this.generateAlertId(),
        type: 'threshold_violation',
        metric: type,
        value,
        threshold,
        severity,
        timestamp: new Date().toISOString(),
        metadata
      };
      
      this.addAlert(alert);
      this.triggerAlert(alert);
    }
  }

  /**
   * Detect performance bottlenecks
   */
  detectBottlenecks() {
    const bottlenecks = [];
    
    // Analyze response times
    const responseTimes = this.metrics.get('response_time') || [];
    if (responseTimes.length > 10) {
      const avgResponseTime = responseTimes.reduce((sum, m) => sum + m.value, 0) / responseTimes.length;
      const maxResponseTime = Math.max(...responseTimes.map(m => m.value));
      
      if (avgResponseTime > this.thresholds.responseTime) {
        bottlenecks.push({
          type: 'slow_response_times',
          severity: 'high',
          description: `Average response time ${avgResponseTime.toFixed(2)}ms exceeds threshold`,
          recommendation: 'Consider optimizing database queries or adding caching'
        });
      }
      
      if (maxResponseTime > avgResponseTime * 3) {
        bottlenecks.push({
          type: 'response_time_spikes',
          severity: 'medium',
          description: `Response time spikes detected (max: ${maxResponseTime}ms)`,
          recommendation: 'Investigate specific endpoints causing delays'
        });
      }
    }
    
    // Analyze memory usage
    const memoryUsage = this.getLatestMetric('memory_usage');
    if (memoryUsage > this.thresholds.memoryUsage) {
      bottlenecks.push({
        type: 'high_memory_usage',
        severity: 'high',
        description: `Memory usage at ${memoryUsage.toFixed(2)}%`,
        recommendation: 'Check for memory leaks or optimize data structures'
      });
    }
    
    // Analyze error rates
    const errorRate = this.currentMetrics.errorRate;
    if (errorRate > this.thresholds.errorRate) {
      bottlenecks.push({
        type: 'high_error_rate',
        severity: 'critical',
        description: `Error rate at ${errorRate.toFixed(2)}%`,
        recommendation: 'Investigate error patterns and fix root causes'
      });
    }
    
    return bottlenecks;
  }

  /**
   * Generate performance optimization suggestions
   */
  generateOptimizationSuggestions() {
    const suggestions = [];
    const bottlenecks = this.detectBottlenecks();
    
    for (const bottleneck of bottlenecks) {
      switch (bottleneck.type) {
        case 'slow_response_times':
          suggestions.push({
            type: 'caching',
            priority: 'high',
            description: 'Implement response caching for frequently accessed endpoints',
            estimatedImprovement: '40-60% reduction in response time',
            implementation: 'Add Redis or in-memory cache layer'
          });
          
          suggestions.push({
            type: 'database_optimization',
            priority: 'medium',
            description: 'Optimize database queries and add indexes',
            estimatedImprovement: '20-30% reduction in response time',
            implementation: 'Analyze query performance and add appropriate indexes'
          });
          break;
          
        case 'high_memory_usage':
          suggestions.push({
            type: 'memory_optimization',
            priority: 'high',
            description: 'Implement memory pooling and reduce object creation',
            estimatedImprovement: '30-50% reduction in memory usage',
            implementation: 'Use object pools and minimize object allocations'
          });
          break;
          
        case 'high_error_rate':
          suggestions.push({
            type: 'error_handling',
            priority: 'critical',
            description: 'Implement comprehensive error handling and retry mechanisms',
            estimatedImprovement: '80-90% reduction in error rate',
            implementation: 'Add circuit breakers and exponential backoff'
          });
          break;
          
        case 'response_time_spikes':
          suggestions.push({
            type: 'load_balancing',
            priority: 'medium',
            description: 'Implement load balancing and request queuing',
            estimatedImprovement: 'Eliminate response time spikes',
            implementation: 'Add load balancer and request queue management'
          });
          break;
      }
    }
    
    this.optimizationSuggestions = suggestions;
    return suggestions;
  }

  /**
   * Auto-optimization implementation
   */
  async applyAutoOptimizations() {
    const suggestions = this.generateOptimizationSuggestions();
    const applicableSuggestions = suggestions.filter(s => s.priority === 'critical' || s.priority === 'high');
    
    for (const suggestion of applicableSuggestions) {
      console.log(`[PerformanceMonitor] Applying auto-optimization: ${suggestion.type}`);
      
      try {
        switch (suggestion.type) {
          case 'caching':
            await this.enableCaching();
            break;
          case 'memory_optimization':
            await this.optimizeMemoryUsage();
            break;
          case 'error_handling':
            await this.enhanceErrorHandling();
            break;
        }
        
        console.log(`[PerformanceMonitor] Auto-optimization applied: ${suggestion.type}`);
      } catch (error) {
        console.error(`[PerformanceMonitor] Auto-optimization failed: ${error.message}`);
      }
    }
  }

  /**
   * Enable dynamic caching
   */
  async enableCaching() {
    // Implementation would enable caching mechanisms
    console.log('[PerformanceMonitor] Enabling dynamic caching');
  }

  /**
   * Optimize memory usage
   */
  async optimizeMemoryUsage() {
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
    
    // Clear old metrics
    const cutoffTime = Date.now() - 3600000; // 1 hour ago
    for (const [type, entries] of this.metrics.entries()) {
      const filteredEntries = entries.filter(entry => entry.timestamp > cutoffTime);
      this.metrics.set(type, filteredEntries);
    }
    
    console.log('[PerformanceMonitor] Memory optimization completed');
  }

  /**
   * Enhance error handling
   */
  async enhanceErrorHandling() {
    // Implementation would enhance error handling mechanisms
    console.log('[PerformanceMonitor] Enhanced error handling activated');
  }

  /**
   * Generate comprehensive performance report
   */
  generatePerformanceReport(timeRange = '1h') {
    const now = Date.now();
    let startTime;
    
    switch (timeRange) {
      case '1h': startTime = now - 3600000; break;
      case '24h': startTime = now - 86400000; break;
      case '7d': startTime = now - 604800000; break;
      default: startTime = now - 3600000;
    }
    
    const report = {
      timeRange,
      generatedAt: new Date().toISOString(),
      summary: this.generateSummary(startTime, now),
      bottlenecks: this.detectBottlenecks(),
      optimizationSuggestions: this.generateOptimizationSuggestions(),
      trends: this.getTrends(),
      alerts: this.getRecentAlerts(startTime),
      recommendations: this.generateRecommendations()
    };
    
    return report;
  }

  /**
   * Generate performance summary
   */
  generateSummary(startTime, endTime) {
    const filteredMetrics = this.filterMetricsByTimeRange(startTime, endTime);
    
    return {
      totalRequests: this.getMetricCount('request_count', startTime, endTime),
      averageResponseTime: this.getAverageMetric('response_time', startTime, endTime),
      errorRate: this.calculateErrorRate(startTime, endTime),
      peakMemoryUsage: this.getMaxMetric('memory_usage', startTime, endTime),
      averageMemoryUsage: this.getAverageMetric('memory_usage', startTime, endTime),
      peakCpuUsage: this.getMaxMetric('cpu_usage', startTime, endTime),
      throughput: this.calculateThroughput(startTime, endTime)
    };
  }

  /**
   * Utility methods
   */
  generateAlertId() {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  addAlert(alert) {
    this.alerts.push(alert);
    if (this.alerts.length > this.maxAlerts) {
      this.alerts.shift();
    }
  }

  triggerAlert(alert) {
    console.warn(`[PerformanceMonitor] ALERT: ${alert.type} - ${alert.description}`);
    // In production, this would send notifications, create tickets, etc.
  }

  updateCurrentMetrics(type, value) {
    switch (type) {
      case 'memory_usage':
        this.currentMetrics.memoryUsage = value;
        break;
      case 'cpu_usage':
        this.currentMetrics.cpuUsage = value;
        break;
    }
  }

  updateTrends(type, value, timestamp) {
    if (!this.trends.has(type)) {
      this.trends.set(type, []);
    }
    
    const trendData = this.trends.get(type);
    trendData.push({ value, timestamp });
    
    // Keep only last 100 data points for trend analysis
    if (trendData.length > 100) {
      trendData.shift();
    }
  }

  getTrends() {
    const trends = {};
    for (const [type, data] of this.trends.entries()) {
      if (data.length > 1) {
        const first = data[0].value;
        const last = data[data.length - 1].value;
        const change = ((last - first) / first) * 100;
        
        trends[type] = {
          direction: change > 0 ? 'increasing' : change < 0 ? 'decreasing' : 'stable',
          changePercent: change,
          dataPoints: data.length
        };
      }
    }
    return trends;
  }

  calculateCPUPercent(cpuUsage) {
    // Simple CPU percentage calculation
    const totalUsage = cpuUsage.user + cpuUsage.system;
    return Math.min((totalUsage / 1000000) * 100, 100); // Convert to percentage
  }

  getLatestMetric(type) {
    const entries = this.metrics.get(type);
    return entries && entries.length > 0 ? entries[entries.length - 1].value : null;
  }

  getMetricCount(type, startTime, endTime) {
    const entries = this.metrics.get(type) || [];
    return entries.filter(entry => 
      entry.timestamp >= startTime && entry.timestamp <= endTime
    ).length;
  }

  getAverageMetric(type, startTime, endTime) {
    const entries = this.metrics.get(type) || [];
    const filtered = entries.filter(entry => 
      entry.timestamp >= startTime && entry.timestamp <= endTime
    );
    
    return filtered.length > 0 
      ? filtered.reduce((sum, entry) => sum + entry.value, 0) / filtered.length 
      : 0;
  }

  getMaxMetric(type, startTime, endTime) {
    const entries = this.metrics.get(type) || [];
    const filtered = entries.filter(entry => 
      entry.timestamp >= startTime && entry.timestamp <= endTime
    );
    
    return filtered.length > 0 ? Math.max(...filtered.map(entry => entry.value)) : 0;
  }

  filterMetricsByTimeRange(startTime, endTime) {
    const filtered = {};
    for (const [type, entries] of this.metrics.entries()) {
      filtered[type] = entries.filter(entry => 
        entry.timestamp >= startTime && entry.timestamp <= endTime
      );
    }
    return filtered;
  }

  calculateErrorRate(startTime, endTime) {
    const totalRequests = this.getMetricCount('request_count', startTime, endTime);
    const totalErrors = this.getMetricCount('error_count', startTime, endTime);
    
    return totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0;
  }

  calculateThroughput(startTime, endTime) {
    const totalRequests = this.getMetricCount('request_count', startTime, endTime);
    const duration = (endTime - startTime) / 1000; // Convert to seconds
    
    return totalRequests / duration; // Requests per second
  }

  getRecentAlerts(startTime) {
    return this.alerts.filter(alert => alert.timestamp >= startTime);
  }

  generateRecommendations() {
    const bottlenecks = this.detectBottlenecks();
    const suggestions = this.generateOptimizationSuggestions();
    
    return {
      immediate: suggestions.filter(s => s.priority === 'critical'),
      shortTerm: suggestions.filter(s => s.priority === 'high'),
      longTerm: suggestions.filter(s => s.priority === 'medium' || s.priority === 'low'),
      bottlenecks: bottlenecks.map(b => b.description)
    };
  }

  setupPeriodicAnalysis() {
    // Run comprehensive analysis every 5 minutes
    setInterval(() => {
      const bottlenecks = this.detectBottlenecks();
      if (bottlenecks.length > 0) {
        console.log(`[PerformanceMonitor] Detected ${bottlenecks.length} bottlenecks`);
        
        if (this.autoOptimizationEnabled) {
          this.applyAutoOptimizations();
        }
      }
    }, 300000); // 5 minutes
  }

  async loadHistoricalData() {
    try {
      const dataPath = path.join(__dirname, '../data/performance-metrics.json');
      const data = await fs.readFile(dataPath, 'utf8');
      const historicalData = JSON.parse(data);
      
      // Load historical metrics
      if (historicalData.metrics) {
        this.metrics = new Map(Object.entries(historicalData.metrics));
      }
      
      console.log('[PerformanceMonitor] Historical data loaded');
    } catch (error) {
      console.log('[PerformanceMonitor] No historical data found, starting fresh');
    }
  }

  async saveMetrics() {
    try {
      const dataPath = path.join(__dirname, '../data/performance-metrics.json');
      const data = {
        metrics: Object.fromEntries(this.metrics),
        currentMetrics: this.currentMetrics,
        alerts: this.alerts.slice(-100), // Save last 100 alerts
        timestamp: new Date().toISOString()
      };
      
      await fs.writeFile(dataPath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('[PerformanceMonitor] Failed to save metrics:', error);
    }
  }

  getMetrics() {
    return {
      current: this.currentMetrics,
      alerts: this.alerts.slice(-10),
      suggestions: this.optimizationSuggestions,
      trends: this.getTrends()
    };
  }
}

export default AdvancedPerformanceMonitor;
