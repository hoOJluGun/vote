#!/usr/bin/env node
/**
 * Frontend Server - ІЗОЛЬОВАНИЙ EXRESS СЕРВЕР
 * Повністю відокремлений від bot backend, спілкується тільки через API/WebSocket
 */

const express = require('express');
const WebSocket = require('ws');
const path = require('path');
const fs = require('fs').promises;

// Конфігурація
const PORT = process.env.PORT || 3000;
const BOT_BACKEND_URL = process.env.BOT_BACKEND_URL || 'http://localhost:5000';
const BOT_WS_URL = process.env.BOT_WS_URL || 'ws://localhost:5000';

// Створюємо Express додаток
const app = express();

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// КОЛЕКЦІЯ ДІТЕЙ (локальна база - повністю ізольована)
const children = [
  {
    id: 1,
    name: "Тимофій",
    age: 6,
    diagnosis: "Лейкоз",
    treatmentCost: 83400,
    donated: 15000,
    urgent: true,
    city: "Київ",
    story: "Маленький герой бореться з страшним діагнозом..."
  },
  {
    id: 2,
    name: "Максим",
    age: 8,
    diagnosis: "Рак мозку",
    treatmentCost: 82229,
    donated: 22000,
    urgent: true,
    city: "Харків",
    story: "Спортсмен та учень, що мріє повернутися до життя..."
  },
  {
    id: 3,
    name: "Вікторія",
    age: 5,
    diagnosis: "Мозкова пухлина",
    treatmentCost: 8500,
    donated: 3200,
    urgent: true,
    city: "Львів",
    story: "Маленька принцеса з посмішкою сонечка..."
  },
  {
    id: 4,
    name: "Олександра",
    age: 7,
    diagnosis: "Аннемія Фанконі",
    treatmentCost: 95000,
    donated: 45000,
    urgent: true,
    city: "Одеса",
    story: "Креативна дівчинка, що любить малювати..."
  },
  {
    id: 5,
    name: "Анна",
    age: 9,
    diagnosis: "Лейкемія",
    treatmentCost: 78000,
    donated: 28000,
    urgent: false,
    city: "Дніпро",
    story: "Музикантка з золотим голосом..."
  },
  {
    id: 6,
    name: "Софія",
    age: 11,
    diagnosis: "Нейробластома",
    treatmentCost: 92000,
    donated: 35000,
    urgent: false,
    city: "Запоріжжя",
    story: "Танцюристка, що мріє виступати на сцені..."
  },
  {
    id: 7,
    name: "Дмитро",
    age: 13,
    diagnosis: "Саркома Юїнга",
    treatmentCost: 115000,
    donated: 68000,
    urgent: true,
    city: "Київ",
    story: "Футбольний фанат, чемпіон школи..."
  },
  {
    id: 8,
    name: "Мар'ян",
    age: 4,
    diagnosis: "Лімфома",
    treatmentCost: 65000,
    donated: 18000,
    urgent: false,
    city: "Вінниця",
    story: "Курйозний хлопчик, що знає всі жарти..."
  },
  {
    id: 9,
    name: "Аліна",
    age: 10,
    diagnosis: "Рак крові",
    treatmentCost: 88000,
    donated: 41000,
    urgent: false,
    city: "Суми",
    story: "Читанка, що мріє стати письменницею..."
  },
  {
    id: 10,
    name: "Іван",
    age: 12,
    diagnosis: "Медулобластома",
    treatmentCost: 105000,
    donated: 57000,
    urgent: true,
    city: "Полтава",
    story: "Програміст майбутнього, полюбляє кодити..."
  }
];

// ЛОГИ ГОЛОСУВАНЬ (локальна база)
let voteLogs = [];

// API ЕНДПОІНТИ (повністю ізольовані від bot backend)

// Здоров'я сервера
app.get('/api/health', (req, res) => {
  res.json({
    status: 'Frontend server active',
    children_count: children.length,
    logs_count: voteLogs.length,
    timestamp: new Date().toISOString()
  });
});

// Отримання всіх дітей
app.get('/api/children', (req, res) => {
  try {
    const childrenWithProgress = children.map(child => ({
      ...child,
      progress: child.treatmentCost > 0 ?
        Math.round((child.donated / child.treatmentCost) * 100) : 0
    }));

    res.json({
      success: true,
      children: childrenWithProgress,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Children API error:', error);
    res.status(500).json({
      success: false,
      error: 'Не вдалося отримати дані дітей',
      children: []
    });
  }
});

// Статистика системи
app.get('/api/stats', (req, res) => {
  try {
    const totalDonated = children.reduce((sum, child) => sum + (child.donated || 0), 0);
    const totalTarget = children.reduce((sum, child) => sum + (child.treatmentCost || 0), 0);
    const totalProgress = totalTarget > 0 ? Math.round((totalDonated / totalTarget) * 100) : 0;

    res.json({
      success: true,
      childrenStats: {
        totalChildren: children.length,
        totalDonated,
        totalTarget,
        totalProgress
      },
      databaseStats: {
        totalVotes: voteLogs.length,
        lastVote: voteLogs.length > 0 ? voteLogs[voteLogs.length - 1].timestamp : null
      },
      urgentChildren: children.filter(c => c.urgent).length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Stats API error:', error);
    res.status(500).json({
      success: false,
      error: 'Не вдалося отримати статистику',
      childrenStats: {},
      databaseStats: {}
    });
  }
});

// Логи голосувань
app.get('/api/logs', (req, res) => {
  try {
    // Повертаємо останні 50 логів
    const recentLogs = voteLogs.slice(-50).reverse();
    res.json({
      success: true,
      logs: recentLogs,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Logs API error:', error);
    res.status(500).json({
      success: false,
      logs: [],
      error: 'Не вдалося отримати логи'
    });
  }
});

// Експорт логів
app.get('/api/logs/export', (req, res) => {
  try {
    res.json({
      success: true,
      logs: voteLogs,
      exportDate: new Date().toISOString(),
      totalLogs: voteLogs.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      logs: [],
      error: 'Не вдалося експортувати логи'
    });
  }
});

// Експорт дітей
app.get('/api/children/export', (req, res) => {
  try {
    res.json({
      success: true,
      children,
      exportDate: new Date().toISOString(),
      totalChildren: children.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      children: [],
      error: 'Не вдалося експортувати дітей'
    });
  }
});

// Відправка голосу (ізольовано, без залежності від bot)
app.post('/api/submit-vote', (req, res) => {
  try {
    const { childId } = req.body;

    if (!childId || typeof childId !== 'number') {
      return res.status(400).json({
        success: false,
        error: 'Невірний childId'
      });
    }

    const child = children.find(c => c.id === childId);
    if (!child) {
      return res.status(404).json({
        success: false,
        error: 'Дитина не знайдена'
      });
    }

    // Додаємо 100 гривень до збори дитини
    child.donated += 100;

    // Логуємо голос
    const logEntry = {
      id: Date.now(),
      childId,
      childName: child.name,
      amount: 100,
      donationAmount: 100,
      timestamp: new Date().toISOString(),
      source: 'frontend_vote',
      status: 'Успішно'
    };

    voteLogs.push(logEntry);

    console.log(`📝 Vote logged: ${child.name} (+100грн)`);

    // Транслюємо через WebSocket до bot backend
    if (global.wsConnection && global.wsConnection.readyState === WebSocket.OPEN) {
      global.wsConnection.send(JSON.stringify({
        type: 'vote_cast',
        data: logEntry
      }));
    }

    res.json({
      success: true,
      message: `Дякуємо! Ваш голос додано до допомоги ${child.name}`,
      child: {
        name: child.name,
        donated: child.donated,
        treatmentCost: child.treatmentCost,
        progress: Math.round((child.donated / child.treatmentCost) * 100)
      },
      vote: logEntry
    });

  } catch (error) {
    console.error('Vote submission error:', error);
    res.status(500).json({
      success: false,
      error: 'Помилка при обробці голосу'
    });
  }
});

// Очищення голосів
app.post('/api/clear-votes', (req, res) => {
  try {
    // Скидаємо всі донати до початкових значень
    children.forEach(child => {
      child.donated = Math.floor(child.treatmentCost * 0.1); // 10% від потрібного
    });

    // Очищаємо логи голосувань
    voteLogs = [];

    res.json({
      success: true,
      message: 'Всі голоси очищені',
      children_reset: children.length,
      logs_cleared: true
    });
  } catch (error) {
    console.error('Clear votes error:', error);
    res.status(500).json({
      success: false,
      error: 'Не вдалося очистити голоси'
    });
  }
});

// Очищення дітей (демо функція)
app.post('/api/clear-children', (req, res) => {
  try {
    // Скидаємо донати дітей до мінімальних значень
    children.forEach(child => {
      child.donated = Math.floor(child.treatmentCost * 0.05); // 5%
    });

    res.json({
      success: true,
      message: 'Дані дітей скинуті',
      children_updated: children.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Не вдалося очистити дані дітей'
    });
  }
});

// Жива статистика
app.get('/api/stats/live', (req, res) => {
  try {
    const onlineUsers = Math.floor(Math.random() * 50) + 10; // Симуляція
    const currentVotes = Math.floor(Math.random() * 20) + 5;

    const recentVotes = voteLogs.slice(-3).map(log => ({
      childName: log.childName,
      amount: log.amount,
      timestamp: log.timestamp
    }));

    res.json({
      success: true,
      onlineUsers,
      currentVotes,
      recentVotes,
      lastDonation: voteLogs.length > 0 ? voteLogs[voteLogs.length - 1].amount : 0,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Не вдалося отримати живу статистику'
    });
  }
});

// СТВОРЕННЯ PUBLIC ДИРЕКТОРІЇ
async function setupPublicDir() {
  const publicDir = path.join(__dirname, 'public');
  try {
    await fs.mkdir(publicDir, { recursive: true });

    // Створюємо HTML сторінку
    const indexPath = path.join(publicDir, 'index.html');
    const indexContent = generateIndexHTML();
    await fs.writeFile(indexPath, indexContent, 'utf8');

    // Створюємо assets директорію для фото
    const assetsDir = path.join(publicDir, 'assets');
    await fs.mkdir(assetsDir, { recursive: true });

    console.log('✅ Public directory setup complete');
  } catch (error) {
    console.error('❌ Public directory setup failed:', error);
  }
}

// ГЕНЕРАЦІЯ HTML СТОРІНКИ
function generateIndexHTML() {
  const totalFunds = children.reduce((sum, c) => sum + c.donated, 0);
  const totalTarget = children.reduce((sum, c) => sum + c.treatmentCost, 0);
  const progress = Math.round((totalFunds / totalTarget) * 100);

  return `<!DOCTYPE html>
<html lang="uk">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🇺🇦 Рятуємо життя українських дітей</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #0057b7, #ffd700);
            color: white;
            min-height: 100vh;
        }
        .header {
            background: rgba(0, 0, 0, 0.3);
            padding: 2rem;
            text-align: center;
        }
        .header h1 { font-size: 2.5rem; margin-bottom: 0.5rem; color: #ffd700; }
        .main { max-width: 1200px; margin: 0 auto; padding: 2rem; }
        .stats {
            background: rgba(0, 0, 0, 0.2);
            border-radius: 10px;
            padding: 2rem;
            margin-bottom: 2rem;
            text-align: center;
        }
        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
            gap: 1.5rem;
        }
        .child-card {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 10px;
            padding: 1.5rem;
            backdrop-filter: blur(10px);
            transition: transform 0.3s ease;
        }
        .child-card:hover { transform: translateY(-5px); }
        .child-card h3 {
            color: ${'#ffd700'};
            margin-bottom: 0.5rem;
        }
        .vote-btn {
            background: #28a745;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 1rem;
            margin-top: 1rem;
            transition: background 0.3s ease;
        }
        .vote-btn:hover { background: #218838; }
        .footer {
            background: rgba(0, 0, 0, 0.3);
            padding: 2rem;
            text-align: center;
            margin-top: 2rem;
        }
        .progress-bar {
            background: rgba(255, 255, 255, 0.2);
            border-radius: 10px;
            height: 8px;
            margin: 10px 0;
            overflow: hidden;
        }
        .progress-fill {
            height: 100%;
            background: #ffd700;
            transition: width 0.3s ease;
        }
    </style>
</head>
<body>
    <header class="header">
        <h1>🇺🇦 ДОПОМОЖІТЬ РЯТУВАТИ ЖИТТЯ УКРАЇНСЬКИХ ДІТЕЙ</h1>
        <p>Ваш голос вирішує, хто отримає термінове лікування за кордоном</p>
    </header>

    <main class="main">
        <section class="stats">
            <h2>📊 ЗАГАЛЬНА СТАТИСТИКА</h2>
            <p>Дітей у проекті: <strong>${children.length}</strong> | Зібрано: <strong>${totalFunds.toLocaleString()} гривень</strong> | Прогрес: <strong>${progress}%</strong></p>
        </section>

        <section>
            <h2 style="text-align: center; margin-bottom: 2rem; color: #ffd700;">👶 ДІТИ, ЯКІ ОЧІКУЮТЬ ДОПОМОГИ</h2>
            <div class="grid" id="children-container">
                ${children.map(child => {
    const progressPercent = child.treatmentCost > 0 ? Math.round((child.donated / child.treatmentCost) * 100) : 0;
    const statusEmoji = child.urgent ? '🔴' : '🟡';
    return `
                        <div class="child-card">
                            <h3>${statusEmoji} ${child.name}, ${child.age} років</h3>
                            <p>✨ Діагноз: ${child.diagnosis}</p>
                            <p>💰 Зібрано: ${child.donated.toLocaleString()} / ${child.treatmentCost.toLocaleString()} гривень</p>
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${progressPercent}%"></div>
                            </div>
                            <p style="font-size: 0.9rem; opacity: 0.8;">Прогрес: ${progressPercent}%</p>
                            <button class="vote-btn" onclick="vote(${child.id}, '${child.name}')">🗳️ Подати голос (+100грн)</button>
                        </div>
                    `;
  }).join('')}
            </div>
        </section>
    </main>

    <footer class="footer">
        <p>&copy; 2024 🇺🇦 Волонтерська система допомоги онкохворим дітям України | Разом рятуємо життя!</p>
        <p style="font-size: 0.9rem; opacity: 0.7; margin-top: 10px;">Система працює в режимі реального часу з повною асихронізацією frontend ↔ backend</p>
    </footer>

    <script>
        // WebSocket підключення до bot backend
        let ws;
        let reconnectAttempts = 0;
        const maxReconnectAttempts = 5;

        function connectWebSocket() {
            try {
                ws = new WebSocket('${BOT_WS_URL.replace('http', 'ws')}');

                ws.onopen = () => {
                    console.log('🔗 WebSocket connected to bot backend');
                    reconnectAttempts = 0;
                    // Надсилаємо ping для перевірки зв'язку
                    ws.send(JSON.stringify({ type: 'ping' }));
                };

                ws.onmessage = (event) => {
                    try {
                        const data = JSON.parse(event.data);
                        handleWebSocketMessage(data);
                    } catch (error) {
                        console.error('WebSocket message parse error:', error);
                    }
                };

                ws.onclose = () => {
                    console.log('🔌 WebSocket disconnected from bot backend');
                    attemptReconnect();
                };

                ws.onerror = (error) => {
                    console.error('WebSocket error:', error);
                    attemptReconnect();
                };

            } catch (error) {
                console.error('WebSocket connection failed:', error);
                attemptReconnect();
            }
        }

        function attemptReconnect() {
            if (reconnectAttempts < maxReconnectAttempts) {
                reconnectAttempts++;
                console.log(\`🔄 Attempting to reconnect (\${reconnectAttempts}/\${maxReconnectAttempts})...\`);
                setTimeout(connectWebSocket, 3000);
            } else {
                console.log('❌ Max reconnect attempts reached');
            }
        }

        function handleWebSocketMessage(data) {
            switch (data.type) {
                case 'vote_update':
                    console.log('📊 Vote update received:', data.vote);
                    updateUI();
                    break;
                case 'bot_message':
                    console.log('🤖 Bot message:', data.data);
                    break;
                case 'pong':
                    console.log('🏓 WebSocket pong received');
                    break;
            }
        }

        // Голосування функція
        async function vote(childId, childName) {
            try {
                const response = await fetch('/api/submit-vote', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ childId })
                });

                const result = await response.json();

                if (result.success) {
                    alert(\`✅ \${result.message}\`);

                    // Оновлюємо UI
                    updateUI();

                    // Надсилаємо через WebSocket до bot backend
                    if (ws && ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify({
                            type: 'vote',
                            vote: result.vote
                        }));
                    }

                } else {
                    alert(\`❌ Помилка: \${result.error}\`);
                }
            } catch (error) {
                alert('❌ Помилка з\\'єднання з сервером');
                console.error('Vote error:', error);
            }
        }

        // Оновлення UI
        async function updateUI() {
            try {
                const response = await fetch('/api/children');
                const data = await response.json();

                if (data.success && data.children) {
                    updateChildrenCards(data.children);
                    updateStats(data.children);
                }
            } catch (error) {
                console.error('UI update error:', error);
            }
        }

        function updateChildrenCards(children) {
            const container = document.getElementById('children-container');
            container.innerHTML = children.map(child => {
                const progressPercent = child.treatmentCost > 0 ? Math.round((child.donated / child.treatmentCost) * 100) : 0;
                const statusEmoji = child.urgent ? '🔴' : '🟡';
                return \`
                    <div class="child-card">
                        <h3>\${statusEmoji} \${child.name}, \${child.age} років</h3>
                        <p>✨ Діагноз: \${child.diagnosis}</p>
                        <p>💰 Зібрано: \${child.donated.toLocaleString()} / \${child.treatmentCost.toLocaleString()} гривень</p>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: \${progressPercent}%"></div>
                        </div>
                        <p style="font-size: 0.9rem; opacity: 0.8;">Прогрес: \${progressPercent}%</p>
                        <button class="vote-btn" onclick="vote(\${child.id}, '\${child.name}')">🗳️ Подати голос (+100грн)</button>
                    </div>
                \`;
            }).join('');
        }

        function updateStats(children) {
            const totalFunds = children.reduce((sum, c) => sum + c.donated, 0);
            const totalTarget = children.reduce((sum, c) => sum + c.treatmentCost, 0);
            const progress = Math.round((totalFunds / totalTarget) * 100);

            const statsDiv = document.querySelector('.stats p');
            statsDiv.innerHTML = \`
                Дітей у проекті: <strong>\${children.length}</strong> |
                Зібрано: <strong>\${totalFunds.toLocaleString()} гривень</strong> |
                Прогрес: <strong>\${progress}%</strong>
            \`;
        }

        // Запуск системи
        document.addEventListener('DOMContentLoaded', () => {
            console.log('🚀 Frontend loaded - connecting to bot backend...');
            connectWebSocket();
        });

        // Періодичне оновлення кожні 30 секунд
        setInterval(updateUI, 30000);
    </script>
</body>
</html>`;
}

// СТАРТ СЕРВЕРА
async function start() {
  console.log('🌐 Frontend Server starting...');

  // Створюємо public директорію з файлами
  await setupPublicDir();

  // Статичні файли
  app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });

  // WebSocket підключення до bot backend
  global.wsConnection = null;

  function connectToBotBackend() {
    try {
      global.wsConnection = new WebSocket(BOT_WS_URL);

      global.wsConnection.onopen = () => {
        console.log('🔗 Connected to bot backend via WebSocket');
      };

      global.wsConnection.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📨 Message from bot backend:', data);
          // Тут можна обробляти повідомлення від bot backend
        } catch (error) {
          console.error('Bot backend message parse error:', error);
        }
      };

      global.wsConnection.onclose = () => {
        console.log('🔌 Disconnected from bot backend');
        // Перепідключення через 5 секунд
        setTimeout(connectToBotBackend, 5000);
      };

      global.wsConnection.onerror = (error) => {
        console.error('Bot backend WebSocket error:', error);
      };

    } catch (error) {
      console.error('Failed to connect to bot backend:', error);
      setTimeout(connectToBotBackend, 5000);
    }
  }

  // Підключаємося до bot backend в окремому потоці
  connectToBotBackend();

  // Запускаємо сервер
  app.listen(PORT, () => {
    console.log('✅ Frontend Server active!');
    console.log(\`🌐 HTTP: http://localhost:\${PORT}\`);
    console.log(\`🔗 Bot Backend: \${BOT_BACKEND_URL}\`);
    console.log(\`🔌 WebSocket: \${BOT_WS_URL}\`);
    console.log(\`👶 Children loaded: \${children.length}\`);
    console.log(\`📊 Vote logs: \${voteLogs.length}\`);
    console.log('');
    console.log('🚀 SYSTEM READY FOR PRODUCTION! 🇺🇦💙');
  });
}

start().catch(console.error);
