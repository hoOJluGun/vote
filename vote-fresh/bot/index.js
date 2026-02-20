#!/usr/bin/env node
/**
 * Telegram Bot Backend - АСИНХРОННИЙ СЕРВЕР ДЛЯ ГОЛОСУВАННЯ
 * Реальний час, вебхуки, WebSocket, повна ізоляція від frontend
 */

const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const WebSocket = require('ws');
const cors = require('cors');
const axios = require('axios');

// Конфігурація
const TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8312305494:AAFIt10m3YcbFb2d3t9Rq57WonbtAJ1o1-0';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const PORT = process.env.PORT || 5000;

// Створюємо бота з webhook
const bot = new TelegramBot(TOKEN, { polling: false });

// WebSocket сервери для реального часу
let wssClients = new Set();

// Express додаток для вебхуків та API
const app = express();
app.use(cors());
app.use(express.json());

// Вебхук ендпоінт від Telegram
app.post(`/webhook/${TOKEN.split(':')[0]}`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

// API для перевірки зв'язку з frontend
app.get('/health', (req, res) => {
  res.json({
    status: 'Bot backend active',
    frontend_url: FRONTEND_URL,
    websocket_clients: wssClients.size,
    timestamp: new Date().toISOString()
  });
});

// WebSocket сервер для реального часу
const wss = new WebSocket.Server({ server: app.listen(PORT) });

wss.on('connection', (ws) => {
  console.log('WebSocket client connected');
  wssClients.add(ws);

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      handleWebSocketMessage(ws, data);
    } catch (err) {
      console.error('WebSocket message error:', err);
    }
  });

  ws.on('close', () => {
    console.log('WebSocket client disconnected');
    wssClients.delete(ws);
  });
});

// Обробка WebSocket повідомлень
function handleWebSocketMessage(ws, data) {
  switch (data.type) {
    case 'vote':
      // Надсилаємо голос на frontend
      broadcastVote(data.vote);
      break;
    case 'ping':
      ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
      break;
  }
}

// Функція для трансляції голосів на всі клієнти
function broadcastVote(vote) {
  const message = JSON.stringify({
    type: 'vote_update',
    vote,
    timestamp: new Date().toISOString()
  });

  wssClients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// TELEGRAM BOT ОБРОБНИКИ

// Команда /start
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const welcomeText = `
🤖 БОТ УПРАВЛІННЯ ГОЛОСУВАННЯМ

✅ Активний та підключений до системи
🔄 Реальний час: ${wssClients.size} клієнтів онлайн
🌐 Frontend: ${FRONTEND_URL}

Виберіть дію:
`;

  const options = {
    reply_markup: {
      inline_keyboard: [
        [
          { text: '📊 Статистика', callback_data: 'stats' },
          { text: '👥 Учасники', callback_data: 'participants' }
        ],
        [
          { text: '👶 Діти', callback_data: 'children' },
          { text: '💰 Фонди', callback_data: 'funds' }
        ],
        [
          { text: '🎯 Живий монітор', callback_data: 'monitor' }
        ]
      ]
    }
  };

  bot.sendMessage(chatId, welcomeText, options);
});

// Обробка інлайн кнопок
bot.on('callback_query', (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;

  // Підтверджуємо обробку callback
  bot.answerCallbackQuery(query.id);

  switch (data) {
    case 'stats':
      sendStats(chatId);
      break;
    case 'participants':
      sendParticipants(chatId);
      break;
    case 'children':
      sendChildren(chatId);
      break;
    case 'funds':
      sendFunds(chatId);
      break;
    case 'monitor':
      startMonitor(chatId);
      break;
  }
});

// Функції відправки даних
async function sendStats(chatId) {
  try {
    // Спробуємо отримати дані з frontend API
    const response = await axios.get(`${FRONTEND_URL}/api/stats`, { timeout: 5000 });
    const data = response.data;

    const text = `
📊 СТАТИСТИКА СИСТЕМИ

📈 Загальна мета: ${data.totalTarget || 'N/A'} гривень
💰 Зібрано: ${data.totalDonated || 0} гривень
📊 Прогрес: ${data.totalProgress || 0}%

👶 Дітей: ${data.totalChildren || 0}
🔴 Термінових: ${data.urgentChildren || 0}

🌐 Онлайн клієнтів: ${wssClients.size}

🕐 ${new Date().toLocaleString('uk-UA')}
`;

    bot.sendMessage(chatId, text);
  } catch (error) {
    bot.sendMessage(chatId, `❌ Не вдалося отримати статистику: ${error.message}`);
  }
}

async function sendParticipants(chatId) {
  try {
    const response = await axios.get(`${FRONTEND_URL}/api/logs`, { timeout: 5000 });
    const data = response.data;
    const logs = data.logs || [];

    if (!logs.length) {
      bot.sendMessage(chatId, '📝 Поки що немає учасників голосування');
      return;
    }

    const recent = logs.slice(0, 10);
    let text = `👥 ОСТАННІ УЧАСНИКИ (${logs.length} загалом):\n\n`;

    recent.forEach((log, i) => {
      const time = new Date(log.timestamp).toLocaleTimeString('uk-UA');
      const phone = log.phone ? `***${log.phone.slice(-3)}` : 'N/A';
      text += `${i + 1}. ${time} - ${phone}\n`;
    });

    bot.sendMessage(chatId, text);
  } catch (error) {
    bot.sendMessage(chatId, `❌ Не вдалося отримати учасників: ${error.message}`);
  }
}

async function sendChildren(chatId) {
  try {
    const response = await axios.get(`${FRONTEND_URL}/api/children`, { timeout: 5000 });
    const data = response.data;
    const children = data.children || [];

    if (!children.length) {
      bot.sendMessage(chatId, '👶 Список дітей порожній');
      return;
    }

    let text = `👶 ВСІ ДІТИ (${children.length}):\n\n`;

    children.forEach((child, i) => {
      const status = child.urgent ? '🔴' : '🟡';
      text += `${status} ${child.name}, ${child.age}р. - ${child.diagnosis}\n`;
      text += `💰 Потрібно: ${child.treatmentCost}грн\n\n`;
    });

    bot.sendMessage(chatId, text);
  } catch (error) {
    bot.sendMessage(chatId, `❌ Не вдалося отримати дітей: ${error.message}`);
  }
}

async function sendFunds(chatId) {
  try {
    const response = await axios.get(`${FRONTEND_URL}/api/children`, { timeout: 5000 });
    const data = response.data;
    const children = data.children || [];

    const totalDonated = children.reduce((sum, c) => sum + (c.donated || 0), 0);
    const totalTarget = children.reduce((sum, c) => sum + (c.treatmentCost || 0), 0);
    const progress = totalTarget > 0 ? Math.round((totalDonated / totalTarget) * 100) : 0;

    const text = `
💰 ІНФОРМАЦІЯ ПРО ФОНДИ

💵 Зібрано: ${totalDonated.toLocaleString()} гривень
🎯 Мета: ${totalTarget.toLocaleString()} гривень
📊 Прогрес: ${progress}%

📈 Деталі по дітям в окремому повідомленні...
`;

    bot.sendMessage(chatId, text);

    // Відправляємо деталі по дітям
    let details = '📊 ПОСТУПЛЕННЯ ПО ДІТЯМ:\n\n';
    children.forEach((child, i) => {
      const childProgress = child.treatmentCost > 0 ?
        Math.round((child.donated / child.treatmentCost) * 100) : 0;
      details += `${i + 1}. ${child.name}\n`;
      details += `   ${child.donated}/${child.treatmentCost}грн (${childProgress}%)\n\n`;
    });

    setTimeout(() => bot.sendMessage(chatId, details), 500);

  } catch (error) {
    bot.sendMessage(chatId, `❌ Не вдалося отримати фонди: ${error.message}`);
  }
}

function startMonitor(chatId) {
  const text = `
🎯 ЖИВИЙ МОНІТОР ЗАПУЩЕНО

⚡ Автооновлення кожні 30 секунд
🚫 Щоб зупинити: /stop

Поточний статус буде оновлюватися автоматично...
`;

  bot.sendMessage(chatId, text);

  // Моніторинг інтервал
  const monitorInterval = setInterval(async () => {
    try {
      const statsText = `
🎯 МОНІТОР СИСТЕМИ

🕐 ${new Date().toLocaleTimeString('uk-UA')}

🌐 WebSocket клієнтів: ${wssClients.size}
🤖 Bot активний ✅

Останнє оновлення: зараз
`;

      // Надаємо оновлення
      bot.sendMessage(chatId, statsText, {
        reply_markup: {
          inline_keyboard: [[{ text: '⏹️ Зупинити монітор', callback_data: 'stop_monitor' }]]
        }
      });
    } catch (error) {
      console.error('Monitor error:', error);
    }
  }, 30000);

  // Зупиняємо через 5 хвилин автоматично
  setTimeout(() => {
    clearInterval(monitorInterval);
    bot.sendMessage(chatId, '🎯 Монітор автоматично зупинено через 5 хвилин');
  }, 300000);
}

// Глобальна функція для зупинки моніторингу
bot.on('callback_query', (query) => {
  if (query.data === 'stop_monitor') {
    bot.answerCallbackQuery(query.id, 'Монітор зупинено');
    bot.sendMessage(query.message.chat.id, '✅ Монітор зупинено');
  }
});

// ІНТЕГРАЦІЯ З FRONTEND ЧЕРЕЗ WEBHOOKS

// Функція для надсилання повідомлень frontend
function sendToFrontend(type, data) {
  const message = { type, data, timestamp: new Date().toISOString() };
  broadcastVote({ type: 'bot_message', ...message });
}

// Обробляємо текстові повідомлення бота
bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  if (text && text.startsWith('/')) return; // Пропускаємо команди

  // Надсилаємо повідомлення frontend
  sendToFrontend('bot_message', {
    chatId,
    text,
    from: msg.from.first_name,
    timestamp: msg.date
  });
});

// Встановлюємо webhook
const WEBHOOK_URL = process.env.WEBHOOK_URL || `https://your-domain.com/webhook/${TOKEN.split(':')[0]}`;

async function setupWebhook() {
  try {
    const webhookInfo = await bot.setWebHook(WEBHOOK_URL);
    console.log('Webhook встановлений:', webhookInfo);
  } catch (error) {
    console.log('Webhook не встановлений (локальний режим):', error.message);
  }
}

// СТАРТ СЕРВЕРА
async function start() {
  console.log('🤖 Telegram Bot Backend starting...');

  // Встановлюємо webhook для production
  if (process.env.NODE_ENV === 'production') {
    await setupWebhook();
  }

  console.log('✅ Telegram Bot Backend active!');
  console.log(`📡 Webhook: ${WEBHOOK_URL}`);
  console.log(`🌐 Frontend: ${FRONTEND_URL}`);
  console.log(`🔌 WebSocket Port: ${PORT}`);
  console.log(`👥 Connected clients: ${wssClients.size}`);
}

start().catch(console.error);

module.exports = { bot, wssClients, broadcastVote, sendToFrontend };
