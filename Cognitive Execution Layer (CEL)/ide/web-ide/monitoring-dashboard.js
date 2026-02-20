/**
 * Advanced Monitoring Dashboard with Real-time Analytics
 * Provides comprehensive monitoring interface with real-time updates
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { Line, Bar, Pie, Area } from 'recharts';
import { format } from 'date-fns';

const AdvancedMonitoringDashboard = () => {
  // State management
  const [metrics, setMetrics] = useState({
    system: { cpu: 0, memory: 0, disk: 0, network: 0 },
    performance: { avgResponseTime: 0, requestsPerSecond: 0, errorRate: 0, throughput: 0 },
    security: { threats: 0, blocked: 0, incidents: 0 },
    ai: { tokensUsed: 0, requests: 0, avgLatency: 0, modelUsage: {} }
  });
  
  const [alerts, setAlerts] = useState([]);
  const [logs, setLogs] = useState([]);
  const [connected, setConnected] = useState(false);
  const [selectedTimeRange, setSelectedTimeRange] = useState('1h');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  
  const ws = useRef(null);
  const refreshInterval = useRef(null);

  // WebSocket connection for real-time updates
  useEffect(() => {
    const connectWebSocket = () => {
      try {
        ws.current = new WebSocket('ws://localhost:3000/ws');
        
        ws.current.onopen = () => {
          setConnected(true);
          console.log('Connected to CEL monitoring stream');
        };
        
        ws.current.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            handleRealtimeUpdate(data);
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };
        
        ws.current.onclose = () => {
          setConnected(false);
          // Attempt reconnection after 5 seconds
          setTimeout(connectWebSocket, 5000);
        };
        
        ws.current.onerror = (error) => {
          console.error('WebSocket error:', error);
          setConnected(false);
        };
      } catch (error) {
        console.error('Failed to connect WebSocket:', error);
      }
    };

    connectWebSocket();

    return () => {
      if (ws.current) {
        ws.current.close();
      }
      if (refreshInterval.current) {
        clearInterval(refreshInterval.current);
      }
    };
  }, []);

  // Auto-refresh setup
  useEffect(() => {
    if (autoRefresh) {
      refreshInterval.current = setInterval(fetchMetrics, 5000); // Refresh every 5 seconds
    } else if (refreshInterval.current) {
      clearInterval(refreshInterval.current);
    }

    return () => {
      if (refreshInterval.current) {
        clearInterval(refreshInterval.current);
      }
    };
  }, [autoRefresh]);

  // Handle real-time updates
  const handleRealtimeUpdate = useCallback((data) => {
    switch (data.type) {
      case 'metrics_update':
        setMetrics(prev => ({ ...prev, ...data.metrics }));
        break;
      case 'alert':
        setAlerts(prev => [data.alert, ...prev.slice(0, 9)]);
        break;
      case 'log':
        setLogs(prev => [data.log, ...prev.slice(0, 99)]);
        break;
      default:
        console.log('Unknown message type:', data.type);
    }
  }, []);

  // Fetch initial metrics
  const fetchMetrics = useCallback(async () => {
    try {
      const response = await fetch('/api/metrics');
      const data = await response.json();
      setMetrics(data);
    } catch (error) {
      console.error('Failed to fetch metrics:', error);
    }
  }, []);

  // Initialize metrics on mount
  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  // Format numbers for display
  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  // Format percentage
  const formatPercentage = (num) => {
    return (num * 100).toFixed(1) + '%';
  };

  // System metrics component
  const SystemMetrics = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">CPU Usage</h3>
        <div className="flex items-center">
          <div className="text-3xl font-bold text-blue-600">{formatPercentage(metrics.system.cpu)}</div>
          <div className="ml-4">
            <div className="text-sm text-gray-500">Load Average</div>
            <div className="text-lg font-medium">{metrics.system.cpu > 0.8 ? 'High' : 'Normal'}</div>
          </div>
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">Memory Usage</h3>
        <div className="flex items-center">
          <div className="text-3xl font-bold text-green-600">{formatPercentage(metrics.system.memory)}</div>
          <div className="ml-4">
            <div className="text-sm text-gray-500">Available</div>
            <div className="text-lg font-medium">{formatNumber((1 - metrics.system.memory) * 16)}GB</div>
          </div>
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">Disk Usage</h3>
        <div className="flex items-center">
          <div className="text-3xl font-bold text-yellow-600">{formatPercentage(metrics.system.disk)}</div>
          <div className="ml-4">
            <div className="text-sm text-gray-500">Free Space</div>
            <div className="text-lg font-medium">{formatNumber((1 - metrics.system.disk) * 500)}GB</div>
          </div>
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">Network I/O</h3>
        <div className="flex items-center">
          <div className="text-3xl font-bold text-purple-600">{formatNumber(metrics.system.network)}</div>
          <div className="ml-4">
            <div className="text-sm text-gray-500">MB/s</div>
            <div className="text-lg font-medium">{metrics.system.network > 100 ? 'High' : 'Normal'}</div>
          </div>
        </div>
      </div>
    </div>
  );

  // Performance metrics component
  const PerformanceMetrics = () => {
    const performanceData = [
      { name: 'Response Time', value: metrics.performance.avgResponseTime, unit: 'ms', color: 'blue' },
      { name: 'Requests/sec', value: metrics.performance.requestsPerSecond, unit: 'req/s', color: 'green' },
      { name: 'Error Rate', value: metrics.performance.errorRate, unit: '%', color: 'red' },
      { name: 'Throughput', value: metrics.performance.throughput, unit: 'MB/s', color: 'purple' }
    ];

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {performanceData.map((metric, index) => (
          <div key={index} className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">{metric.name}</h3>
            <div className="flex items-center">
              <div className={`text-3xl font-bold text-${metric.color}-600`}>
                {formatNumber(metric.value)}
              </div>
              <div className="ml-4">
                <div className="text-sm text-gray-500">Unit</div>
                <div className="text-lg font-medium">{metric.unit}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Security metrics component
  const SecurityMetrics = () => {
    const securityData = [
      { name: 'Threats Detected', value: metrics.security.threats, color: 'red' },
      { name: 'Requests Blocked', value: metrics.security.blocked, color: 'yellow' },
      { name: 'Security Incidents', value: metrics.security.incidents, color: 'orange' },
      { name: 'Safety Score', value: Math.max(0, 100 - metrics.security.incidents * 10), color: 'green' }
    ];

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {securityData.map((metric, index) => (
          <div key={index} className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">{metric.name}</h3>
            <div className="flex items-center">
              <div className={`text-3xl font-bold text-${metric.color}-600`}>
                {formatNumber(metric.value)}
              </div>
              <div className="ml-4">
                <div className="text-sm text-gray-500">Status</div>
                <div className="text-lg font-medium">
                  {metric.value > 10 ? 'Critical' : metric.value > 5 ? 'Warning' : 'Normal'}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // AI metrics component
  const AIMetrics = () => {
    const modelUsageData = Object.entries(metrics.ai.modelUsage).map(([model, usage]) => ({
      name: model,
      requests: usage.requests,
      tokens: usage.tokens,
      avgLatency: usage.avgLatency
    }));

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Total Requests</h3>
            <div className="text-3xl font-bold text-indigo-600">
              {formatNumber(metrics.ai.requests)}
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Tokens Used</h3>
            <div className="text-3xl font-bold text-purple-600">
              {formatNumber(metrics.ai.tokensUsed)}
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Avg Latency</h3>
            <div className="text-3xl font-bold text-green-600">
              {metrics.ai.avgLatency.toFixed(0)}ms
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Model Usage Breakdown</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Model</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Requests</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tokens</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Latency</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {modelUsageData.map((model, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {model.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatNumber(model.requests)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatNumber(model.tokens)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {model.avgLatency.toFixed(0)}ms
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // Charts component
  const ChartsSection = () => {
    // Prepare data for charts
    const responseTimeData = [
      { time: '00:00', value: 120 },
      { time: '00:05', value: 150 },
      { time: '00:10', value: 100 },
      { time: '00:15', value: 180 },
      { time: '00:20', value: 140 },
      { time: '00:25', value: 160 },
      { time: '00:30', value: 130 }
    ];

    const requestVolumeData = [
      { name: 'Mon', requests: 4500 },
      { name: 'Tue', requests: 5200 },
      { name: 'Wed', requests: 4800 },
      { name: 'Thu', requests: 6100 },
      { name: 'Fri', requests: 5500 },
      { name: 'Sat', requests: 3200 },
      { name: 'Sun', requests: 2800 }
    ];

    const errorDistribution = [
      { name: '4xx Errors', value: 15, color: '#F59E0B' },
      { name: '5xx Errors', value: 5, color: '#EF4444' },
      { name: 'Timeouts', value: 8, color: '#F59E0B' },
      { name: 'Success', value: 72, color: '#10B981' }
    ];

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Response Time Trend</h3>
          <Line width={500} height={300} data={responseTimeData}>
            <Line type="monotone" dataKey="value" stroke="#3B82F6" strokeWidth={2} />
            <XAxis dataKey="time" />
            <YAxis />
            <Tooltip />
          </Line>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Request Volume</h3>
          <Bar width={500} height={300} data={requestVolumeData}>
            <XAxis dataKey="name" />
            <YAxis />
            <Bar dataKey="requests" fill="#10B981" />
            <Tooltip />
          </Bar>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Error Distribution</h3>
          <Pie width={500} height={300} data={errorDistribution}>
            <Pie dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} fill="#8884d8">
              {errorDistribution.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip />
          </Pie>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">System Load</h3>
          <Area width={500} height={300} data={responseTimeData}>
            <Area type="monotone" dataKey="value" stroke="#8B5CF6" fill="#8B5CF6" fillOpacity={0.3} />
            <XAxis dataKey="time" />
            <YAxis />
            <Tooltip />
          </Area>
        </div>
      </div>
    );
  };

  // Alerts component
  const AlertsSection = () => (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Recent Alerts</h3>
      {alerts.length === 0 ? (
        <p className="text-gray-500">No recent alerts</p>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert, index) => (
            <div key={index} className={`p-4 rounded-lg border-l-4 ${
              alert.severity === 'critical' ? 'bg-red-50 border-red-500' :
              alert.severity === 'high' ? 'bg-orange-50 border-orange-500' :
              alert.severity === 'medium' ? 'bg-yellow-50 border-yellow-500' :
              'bg-blue-50 border-blue-500'
            }`}>
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">{alert.title}</h4>
                  <p className="text-sm text-gray-600 mt-1">{alert.description}</p>
                </div>
                <div className="text-xs text-gray-500">
                  {format(new Date(alert.timestamp), 'MMM dd, HH:mm')}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // Logs component
  const LogsSection = () => (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-800">System Logs</h3>
        <button
          onClick={() => setLogs([])}
          className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded-md"
        >
          Clear Logs
        </button>
      </div>
      <div className="space-y-2 max-h-96 overflow-y-auto font-mono text-sm">
        {logs.length === 0 ? (
          <p className="text-gray-500">No logs available</p>
        ) : (
          logs.map((log, index) => (
            <div key={index} className={`p-2 rounded ${
              log.level === 'error' ? 'bg-red-100 text-red-800' :
              log.level === 'warn' ? 'bg-yellow-100 text-yellow-800' :
              log.level === 'info' ? 'bg-blue-100 text-blue-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              <div className="flex justify-between">
                <span>[{format(new Date(log.timestamp), 'HH:mm:ss')}] {log.level.toUpperCase()}</span>
                <span>{log.source}</span>
              </div>
              <div className="mt-1">{log.message}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  // Control panel
  const ControlPanel = () => (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Control Panel</h3>
      
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Auto Refresh</span>
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              autoRefresh ? 'bg-blue-600' : 'bg-gray-200'
            }`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full transition-transform ${
              autoRefresh ? 'translate-x-6 bg-white' : 'translate-x-1 bg-white'
            }`} />
          </button>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Time Range</span>
          <select
            value={selectedTimeRange}
            onChange={(e) => setSelectedTimeRange(e.target.value)}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm border rounded-md"
          >
            <option value="5m">Last 5 minutes</option>
            <option value="15m">Last 15 minutes</option>
            <option value="1h">Last 1 hour</option>
            <option value="6h">Last 6 hours</option>
            <option value="24h">Last 24 hours</option>
            <option value="7d">Last 7 days</option>
          </select>
        </div>

        <div className="flex space-x-2">
          <button
            onClick={fetchMetrics}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md"
          >
            Refresh Now
          </button>
          <button
            onClick={() => window.open('/api/metrics/export', '_blank')}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-md"
          >
            Export Report
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <h1 className="text-3xl font-bold text-gray-900">CEL Monitoring Dashboard</h1>
              <div className={`ml-4 px-2 py-1 rounded-full text-xs font-medium ${
                connected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {connected ? 'Connected' : 'Disconnected'}
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">
                Last updated: {format(new Date(), 'MMM dd, HH:mm:ss')}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            {['overview', 'performance', 'security', 'ai', 'charts', 'alerts', 'logs'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {activeTab === 'overview' && (
            <div>
              <SystemMetrics />
              <PerformanceMetrics />
              <SecurityMetrics />
            </div>
          )}
          
          {activeTab === 'performance' && (
            <div>
              <PerformanceMetrics />
              <ChartsSection />
            </div>
          )}
          
          {activeTab === 'security' && (
            <div>
              <SecurityMetrics />
              <AlertsSection />
            </div>
          )}
          
          {activeTab === 'ai' && (
            <div>
              <AIMetrics />
            </div>
          )}
          
          {activeTab === 'charts' && (
            <div>
              <ChartsSection />
            </div>
          )}
          
          {activeTab === 'alerts' && (
            <div>
              <AlertsSection />
            </div>
          )}
          
          {activeTab === 'logs' && (
            <div>
              <LogsSection />
            </div>
          )}
        </div>

        {/* Control Panel */}
        <ControlPanel />
      </main>
    </div>
  );
};

// Initialize and render the dashboard
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<AdvancedMonitoringDashboard />);
}

export default AdvancedMonitoringDashboard;
