# 🛡️ Система Безопасности и Автоматического Восстановления

Комплексная система безопасности для проекта голосования, обеспечивающая мониторинг, автоматическое восстановление и защиту от атак.

## 🎯 Основные Возможности

### 🔍 Мониторинг
- **Непрерывный мониторинг** всех сервисов и доменов
- **Автоматические проверки здоровья** каждые 30 секунд
- **Детекция атак** и подозрительной активности
- **Уведомления в реальном времени** через Telegram и webhook'и

### 🔄 Ротация Токенов
- **Автоматическая ротация** всех токенов и ключей каждые 24 часа
- **Резервные токены** для быстрого восстановления
- **Обновление конфигурации** без простоя сервисов
- **Безопасное хранение** секретов

### 🚨 Автоматическое Восстановление
- **Мгновенное восстановление** при обнаружении атак
- **Создание новых доменов** и развертывание на них
- **Переключение провайдеров** (Vercel, AWS, DigitalOcean)
- **Восстановление данных** из резервных копий

### 💾 Резервное Копирование
- **Автоматические бэкапы** каждые 5 минут
- **Шифрование данных** перед сохранением
- **Множественные локации** хранения
- **Быстрое восстановление** при необходимости

## 🚀 Быстрый Старт

### 1. Установка Зависимостей

```bash
cd security
npm install
```

### 2. Настройка Переменных Окружения

Создайте файл `.env` в корне проекта:

```bash
# Telegram алерты
TELEGRAM_ALERT_BOT_TOKEN=your_alert_bot_token
TELEGRAM_ALERT_CHAT_ID=your_chat_id

# Домены
WEB_DOMAIN=your-domain.com
BOT_DOMAIN=bot.your-domain.com
API_DOMAIN=api.your-domain.com

# Провайдеры
VERCEL_API_KEY=your_vercel_api_key
VERCEL_TEAM_ID=your_vercel_team_id
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
DIGITALOCEAN_API_KEY=your_do_api_key

# DNS
CLOUDFLARE_API_KEY=your_cloudflare_api_key
CLOUDFLARE_ZONE_ID=your_zone_id

# Webhook алерты (опционально)
WEBHOOK_ALERT_URL=https://your-webhook-url.com/alerts
WEBHOOK_ALERT_TOKEN=your_webhook_token
```

### 3. Настройка Конфигурации

Отредактируйте файл `config.json` под ваши нужды:

```json
{
  "security": {
    "enabled": true,
    "monitoring": {
      "enabled": true,
      "checkInterval": 30000,
      "maxFailures": 3
    }
  },
  "domains": {
    "primary": {
      "web": "your-domain.com",
      "bot": "bot.your-domain.com"
    }
  }
}
```

### 4. Тестирование Системы

```bash
npm run test:security
```

### 5. Запуск Системы Безопасности

```bash
npm start
```

## 🐳 Docker Развертывание

### Запуск с Docker Compose

```bash
# Запуск всех сервисов включая систему безопасности
docker-compose -f docker-compose.yml -f docker-compose.security.yml up -d

# Проверка статуса
docker-compose -f docker-compose.security.yml ps

# Просмотр логов
docker-compose -f docker-compose.security.yml logs -f security-manager
```

### Отдельный Запуск Системы Безопасности

```bash
# Сборка образа
docker build -t vote-security ./security

# Запуск контейнера
docker run -d \
  --name vote-security \
  --restart always \
  -e TELEGRAM_ALERT_BOT_TOKEN=your_token \
  -e TELEGRAM_ALERT_CHAT_ID=your_chat_id \
  -v $(pwd)/security:/app/security \
  -v $(pwd)/backups:/app/backups \
  -v /var/run/docker.sock:/var/run/docker.sock:ro \
  vote-security
```

## 📊 Мониторинг и Управление

### Проверка Статуса

```bash
# Статус системы безопасности
curl http://localhost:3001/status

# Статус мониторинга
curl http://localhost:3001/monitoring/status

# Статус ротации токенов
curl http://localhost:3001/tokens/status

# Статус восстановления
curl http://localhost:3001/recovery/status
```

### Управление через API

```bash
# Принудительная ротация токенов
curl -X POST http://localhost:3001/tokens/rotate

# Тестовое восстановление
curl -X POST http://localhost:3001/recovery/test

# Полное восстановление
curl -X POST http://localhost:3001/recovery/full

# Создание резервной копии
curl -X POST http://localhost:3001/backup/create
```

## 🔧 Настройка Провайдеров

### Vercel

1. Создайте API ключ в настройках Vercel
2. Получите Team ID из URL вашей команды
3. Добавьте переменные в `.env`:

```bash
VERCEL_API_KEY=your_vercel_api_key
VERCEL_TEAM_ID=your_vercel_team_id
```

### AWS

1. Создайте IAM пользователя с правами:
   - EC2FullAccess
   - S3FullAccess
   - Route53FullAccess
2. Добавьте переменные в `.env`:

```bash
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1
```

### DigitalOcean

1. Создайте API ключ в DigitalOcean
2. Добавьте переменную в `.env`:

```bash
DIGITALOCEAN_API_KEY=your_do_api_key
```

### Cloudflare (DNS)

1. Создайте API ключ в Cloudflare
2. Получите Zone ID для вашего домена
3. Добавьте переменные в `.env`:

```bash
CLOUDFLARE_API_KEY=your_cloudflare_api_key
CLOUDFLARE_ZONE_ID=your_zone_id
```

## 📱 Настройка Алертов

### Telegram

1. Создайте бота через @BotFather
2. Получите токен бота
3. Добавьте бота в группу и получите chat_id
4. Добавьте переменные в `.env`:

```bash
TELEGRAM_ALERT_BOT_TOKEN=your_bot_token
TELEGRAM_ALERT_CHAT_ID=your_chat_id
```

### Webhook

1. Создайте endpoint для получения алертов
2. Добавьте переменные в `.env`:

```bash
WEBHOOK_ALERT_URL=https://your-webhook-url.com/alerts
WEBHOOK_ALERT_TOKEN=your_webhook_token
```

## 🛠️ Команды Управления

### Основные Команды

```bash
# Запуск системы безопасности
npm start

# Запуск в режиме разработки
npm run dev

# Тестирование системы
npm run test:security

# Создание резервной копии
npm run backup

# Тестовое восстановление
npm run recovery
```

### Docker Команды

```bash
# Запуск системы безопасности
docker-compose -f docker-compose.security.yml up -d

# Остановка системы безопасности
docker-compose -f docker-compose.security.yml down

# Перезапуск системы безопасности
docker-compose -f docker-compose.security.yml restart

# Просмотр логов
docker-compose -f docker-compose.security.yml logs -f

# Обновление образов
docker-compose -f docker-compose.security.yml pull
docker-compose -f docker-compose.security.yml up -d
```

## 🔒 Безопасность

### Рекомендации

1. **Используйте сильные пароли** для всех API ключей
2. **Регулярно ротируйте токены** (система делает это автоматически)
3. **Мониторьте логи** на предмет подозрительной активности
4. **Обновляйте зависимости** регулярно
5. **Используйте HTTPS** для всех соединений

### Переменные Окружения

Все чувствительные данные должны храниться в переменных окружения:

```bash
# Обязательные
TELEGRAM_ALERT_BOT_TOKEN
TELEGRAM_ALERT_CHAT_ID

# Рекомендуемые
VERCEL_API_KEY
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
DIGITALOCEAN_API_KEY
CLOUDFLARE_API_KEY
```

## 📈 Мониторинг Производительности

### Метрики

Система собирает следующие метрики:

- **Время отклика** сервисов
- **Доступность** доменов
- **Использование ресурсов** (CPU, память, диск)
- **Количество атак** и попыток взлома
- **Время восстановления** после сбоев

### Логи

Логи сохраняются в следующих форматах:

- **Системные логи**: `./security/logs/system.log`
- **Логи мониторинга**: `./security/logs/monitoring.log`
- **Логи восстановления**: `./security/logs/recovery.log`
- **Логи алертов**: `./security/logs/alerts.log`

## 🚨 Процедуры Экстренного Восстановления

### При Обнаружении Атаки

1. **Система автоматически**:
   - Обнаруживает атаку
   - Отправляет алерты команде
   - Запускает процедуру восстановления
   - Создает новые домены
   - Разворачивает сервисы на новых доменах
   - Обновляет DNS записи
   - Восстанавливает данные

2. **Команда получает уведомление** с новыми доменами

3. **Пользователи автоматически** перенаправляются на новые домены

### Ручное Восстановление

```bash
# Принудительное восстановление
curl -X POST http://localhost:3001/recovery/full

# Восстановление с новыми доменами
curl -X POST http://localhost:3001/recovery/full -d '{"reason": "manual"}'
```

## 📞 Поддержка

### Полезные Команды

```bash
# Проверка статуса всех компонентов
npm run status

# Просмотр логов
tail -f ./security/logs/system.log

# Тестирование алертов
curl -X POST http://localhost:3001/alerts/test

# Создание отчета о безопасности
curl -X POST http://localhost:3001/reports/generate
```

### Контакты

- **Telegram**: @your_support_bot
- **Email**: security@your-domain.com
- **GitHub Issues**: [Создать issue](https://github.com/your-org/vote-security/issues)

## 📄 Лицензия

MIT License - см. файл [LICENSE](LICENSE) для деталей.

---

**⚠️ Важно**: Эта система безопасности критически важна для защиты вашего проекта. Убедитесь, что все компоненты настроены правильно и регулярно тестируются.
