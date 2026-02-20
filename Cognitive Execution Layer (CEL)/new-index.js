// new-index.js - Главный файл приложения для CEL v4.2.0
// Обновленная версия index.js с полной архитектурной реализацией

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';
import path from 'path';
import { fileURLToPath } from 'url';

// Загрузка переменных окружения
dotenv.config();

// Импорт маршрутов
import mainRoutes from './routes/main-routes.js';
import orchestrationRoutes from './routes/orchestration-routes.js';
import selfHealingRoutes from './routes/self-healing-routes.js';
import contextRoutes from './routes/context-routes.js';
import safetyRoutes from './routes/safety-routes.js'; // Новый маршрут безопасности

// Импорт библиотек
import AdvancedUsageTracker from './lib/advanced-usage-tracker.js';
import AgentProtocol from './lib/agent-protocol.js';
import FormalSafetyModel from './lib/formal-safety-model.js'; // Новая модель безопасности
import SelfHealingLayer from './lib/self-healing-layer.js';
import ProjectKnowledgeGraph from './lib/project-knowledge-graph.js';
import OrchestrationEngine from './lib/orchestration-engine.js';
import CognitiveWorkspaceCore from './lib/cognitive-workspace-core.js';

// Получение текущего пути для ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Создание Express приложения
const app = express();

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'https://localhost:3000'], // Разрешаем только локальный доступ
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Подключение статических файлов
app.use(express.static(path.join(__dirname, 'public')));

// Инициализация компонентов
const usageTracker = new AdvancedUsageTracker();
const agentProtocol = new AgentProtocol();
const safetyModel = new FormalSafetyModel(); // Инициализация модели безопасности
const selfHealingLayer = new SelfHealingLayer();
const knowledgeGraph = new ProjectKnowledgeGraph();
const orchestrationEngine = new OrchestrationEngine();
const cognitiveWorkspace = new CognitiveWorkspaceCore();

// Middleware для логирования запросов
app.use((req, res, next) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    console.log(`${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
    
    // Отслеживание использования
    usageTracker.trackRequest({
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
      userAgent: req.headers['user-agent'],
      ip: req.ip
    });
  });
  
  next();
});

// Middleware для проверки безопасности (глобально)
app.use(async (req, res, next) => {
  // Пропускаем проверку безопасности для служебных маршрутов
  if (req.path.startsWith('/health') || req.path.startsWith('/metrics')) {
    return next();
  }
  
  // Проверка безопасности для всех остальных маршрутов
  const isSafe = safetyModel.checkOperationSafety(req.method + ' ' + req.path, {
    source: req.ip,
    headers: req.headers,
    body: req.body
  });
  
  if (!isSafe) {
    return res.status(403).json({
      error: 'Request blocked by safety model',
      path: req.path
    });
  }
  
  next();
});

// Подключение маршрутов
app.use('/', mainRoutes);
app.use('/v1/orchestrate', orchestrationRoutes);
app.use('/v1/heal', selfHealingRoutes);
app.use('/v1/context', contextRoutes);
app.use('/v1/safety', safetyRoutes); // Подключение маршрутов безопасности

// Health check endpoint
app.get('/health', (req, res) => {
  const healthCheck = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    gshi: 0.95, // Global System Health Index - заглушка
    components: {
      api_server: 'operational',
      knowledge_graph: knowledgeGraph.isReady(),
      orchestration_engine: true,
      safety_model: true,
      self_healing_layer: true
    }
  };
  
  res.json(healthCheck);
});

// Xcode integration endpoints
app.get('/v1/xcode/health', (req, res) => {
  res.json({
    status: 'connected',
    version: 'v4.2.0',
    capabilities: [
      'intent_to_code',
      'multi_agent_orchestration',
      'formal_verification',
      'self_healing'
    ],
    safety_enabled: true
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  
  res.status(500).json({
    error: 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { details: err.message })
  });
});

// Catch-all для несуществующих маршрутов
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.path
  });
});

// Глобальный обработчик необработанных исключений
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Обработчик завершения процесса
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});

// Запуск сервера
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '127.0.0.1'; // Привязка только к localhost

const server = app.listen(PORT, HOST, () => {
  console.log(`CEL v4.2.0 server running on http://${HOST}:${PORT}`);
  console.log(`Safety model initialized with ${safetyModel.safetyConstraints.length} constraints`);
  console.log(`Trust boundaries established: ${[...safetyModel.trustBoundaries.keys()].join(', ')}`);
  
  // Регистрация критических модулей для проверки целостности
  safetyModel.registerCriticalModule('main-server', __filename);
  safetyModel.registerCriticalModule('safety-model', './lib/formal-safety-model.js');
  safetyModel.registerCriticalModule('router-safety', './routes/safety-routes.js');
});

export default server;