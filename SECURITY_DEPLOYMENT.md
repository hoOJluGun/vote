# 🛡️ Полное Руководство по Развертыванию Системы Безопасности

Это руководство поможет вам развернуть проект голосования с комплексной системой безопасности и автоматического восстановления.

## 🎯 Что Включает Система Безопасности

### 🔍 Мониторинг в Реальном Времени
- **Непрерывное отслеживание** всех сервисов и доменов
- **Автоматическое обнаружение атак** и подозрительной активности
- **Мгновенные уведомления** через Telegram и webhook'и
- **Детальная аналитика** производительности и безопасности

### 🔄 Автоматическая Ротация Токенов
- **Ежедневная ротация** всех токенов и ключей
- **Резервные токены** для быстрого восстановления
- **Безопасное обновление** конфигурации без простоя
- **Защита от компрометации** долгоживущих токенов

### 🚨 Автоматическое Восстановление
- **Мгновенное восстановление** при обнаружении атак
- **Создание новых доменов** и автоматическое развертывание
- **Переключение между провайдерами** (Vercel, AWS, DigitalOcean)
- **Восстановление данных** из резервных копий

### 💾 Интеллектуальное Резервное Копирование
- **Автоматические бэкапы** каждые 5 минут
- **Шифрование данных** перед сохранением
- **Множественные локации** хранения (локально, S3, Google Cloud)
- **Быстрое восстановление** при необходимости

## 🚀 Быстрое Развертывание

### Автоматическое Развертывание (Рекомендуется)

```bash
# Клонируйте репозиторий
git clone https://github.com/your-org/vote-fresh.git
cd vote-fresh/vote

# Запустите автоматическое развертывание
./deploy-secure.sh
```

Скрипт автоматически:
- ✅ Проверит все зависимости
- ✅ Создаст необходимые директории
- ✅ Настроит переменные окружения
- ✅ Установит зависимости
- ✅ Запустит все сервисы
- ✅ Протестирует систему
- ✅ Создаст скрипты управления

### Ручное Развертывание

Если вы предпочитаете ручное развертывание, следуйте инструкциям ниже.

## 📋 Предварительные Требования

### Системные Требования
- **Docker** 20.10+
- **Docker Compose** 2.0+
- **Node.js** 18.0+
- **npm** 8.0+
- **Git**
- **Минимум 2GB RAM**
- **Минимум 10GB свободного места**

### API Ключи и Токены

Вам понадобятся следующие API ключи:

#### Telegram
- **Основной бот**: Создайте через @BotFather
- **Бот для алертов**: Создайте отдельного бота для уведомлений
- **Chat ID**: ID группы или канала для алертов

#### Провайдеры Облачных Сервисов
- **Vercel**: API ключ и Team ID
- **AWS**: Access Key ID и Secret Access Key
- **DigitalOcean**: API ключ
- **Cloudflare**: API ключ и Zone ID

## ⚙️ Настройка Переменных Окружения

### 1. Создание .env Файла

```bash
# Основные настройки
NODE_ENV=production
PORT=3000

# Домены (замените на ваши реальные домены)
WEB_DOMAIN=your-domain.com
BOT_DOMAIN=bot.your-domain.com
API_DOMAIN=api.your-domain.com

# Telegram боты
TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz
TELEGRAM_ALERT_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz
TELEGRAM_ALERT_CHAT_ID=-1001234567890

# Провайдеры
VERCEL_API_KEY=your_vercel_api_key_here
VERCEL_TEAM_ID=your_vercel_team_id_here
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
AWS_REGION=us-east-1
DIGITALOCEAN_API_KEY=your_digitalocean_api_key_here

# DNS (Cloudflare)
CLOUDFLARE_API_KEY=your_cloudflare_api_key_here
CLOUDFLARE_ZONE_ID=your_cloudflare_zone_id_here

# Webhook алерты (опционально)
WEBHOOK_ALERT_URL=https://your-webhook-url.com/alerts
WEBHOOK_ALERT_TOKEN=your_webhook_token_here

# ACME для SSL сертификатов
ACME_EMAIL=your-email@example.com

# API URLs
API_BASE_URL=https://your-domain.com/api
BOT_BASE_URL=https://bot.your-domain.com
```

### 2. Получение API Ключей

#### Telegram Боты

1. **Основной бот**:
   ```bash
   # Создайте бота через @BotFather
   # Получите токен и добавьте в TELEGRAM_BOT_TOKEN
   ```

2. **Бот для алертов**:
   ```bash
   # Создайте отдельного бота для уведомлений
   # Получите токен и добавьте в TELEGRAM_ALERT_BOT_TOKEN
   ```

3. **Chat ID**:
   ```bash
   # Добавьте бота в группу/канал
   # Отправьте сообщение и получите chat_id через:
   curl https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates
   ```

#### Vercel

1. Перейдите в [Vercel Dashboard](https://vercel.com/dashboard)
2. Откройте Settings → Tokens
3. Создайте новый токен
4. Получите Team ID из URL: `https://vercel.com/teams/[TEAM_ID]/settings`

#### AWS

1. Перейдите в [AWS IAM Console](https://console.aws.amazon.com/iam/)
2. Создайте нового пользователя с правами:
   - `EC2FullAccess`
   - `S3FullAccess`
   - `Route53FullAccess`
3. Создайте Access Key

#### DigitalOcean

1. Перейдите в [DigitalOcean API](https://cloud.digitalocean.com/account/api/tokens)
2. Создайте новый Personal Access Token
3. Выберите Scopes: `Read` и `Write`

#### Cloudflare

1. Перейдите в [Cloudflare API Tokens](https://dash.cloudflare.com/profile/api-tokens)
2. Создайте Custom token с правами:
   - Zone:Zone:Read
   - Zone:DNS:Edit
3. Получите Zone ID из Overview вашего домена

## 🐳 Развертывание с Docker

### 1. Создание Docker Сети

```bash
docker network create proxy
```

### 2. Запуск Traefik (Reverse Proxy)

```bash
cd infra/traefik
docker-compose up -d
cd ../..
```

### 3. Запуск Основных Сервисов

```bash
# Сборка и запуск веб-приложения
docker-compose -f docker-compose.frontend.yml up -d

# Сборка и запуск Telegram бота
docker-compose -f docker-compose.bot.yml up -d
```

### 4. Запуск Системы Безопасности

```bash
# Сборка и запуск системы безопасности
docker-compose -f docker-compose.security.yml up -d
```

### 5. Проверка Статуса

```bash
# Проверка всех контейнеров
docker-compose ps

# Просмотр логов системы безопасности
docker-compose -f docker-compose.security.yml logs -f
```

## 🔧 Настройка DNS

### Cloudflare (Рекомендуется)

1. **Добавьте домен в Cloudflare**
2. **Настройте DNS записи**:

```bash
# Основной сайт
Type: CNAME
Name: @
Content: your-domain.vercel.app
TTL: Auto

# Telegram бот
Type: CNAME
Name: bot
Content: bot.your-domain.vercel.app
TTL: Auto

# API
Type: CNAME
Name: api
Content: api.your-domain.vercel.app
TTL: Auto
```

### Альтернативные DNS Провайдеры

Если вы используете другой DNS провайдер, настройте аналогичные CNAME записи.

## 🧪 Тестирование Системы

### 1. Тест Системы Безопасности

```bash
cd security
npm run test:security
```

### 2. Тест Мониторинга

```bash
# Проверка статуса мониторинга
curl http://localhost:3001/monitoring/status

# Проверка статуса ротации токенов
curl http://localhost:3001/tokens/status

# Проверка статуса восстановления
curl http://localhost:3001/recovery/status
```

### 3. Тест Алертов

```bash
# Отправка тестового алерта
curl -X POST http://localhost:3001/alerts/test
```

### 4. Тест Восстановления

```bash
# Тестовое восстановление (безопасно)
curl -X POST http://localhost:3001/recovery/test
```

## 📊 Мониторинг и Управление

### Скрипты Управления

После развертывания будут созданы следующие скрипты:

```bash
# Остановка всех сервисов
./stop-all.sh

# Перезапуск всех сервисов
./restart-all.sh

# Обновление системы
./update-system.sh

# Мониторинг системы
./monitor.sh
```

### API Эндпоинты

Система безопасности предоставляет следующие API эндпоинты:

```bash
# Статус системы
GET http://localhost:3001/status

# Статус мониторинга
GET http://localhost:3001/monitoring/status

# Принудительная ротация токенов
POST http://localhost:3001/tokens/rotate

# Тестовое восстановление
POST http://localhost:3001/recovery/test

# Полное восстановление
POST http://localhost:3001/recovery/full

# Создание резервной копии
POST http://localhost:3001/backup/create
```

## 🚨 Процедуры Экстренного Восстановления

### Автоматическое Восстановление

Система автоматически:

1. **Обнаруживает атаки** через мониторинг
2. **Отправляет алерты** команде разработчиков
3. **Создает новые домены** с уникальными именами
4. **Разворачивает сервисы** на новых провайдерах
5. **Обновляет DNS записи** для новых доменов
6. **Восстанавливает данные** из резервных копий
7. **Уведомляет команду** о новых доменах

### Ручное Восстановление

```bash
# Принудительное восстановление
curl -X POST http://localhost:3001/recovery/full -d '{"reason": "manual"}'

# Восстановление с новыми доменами
curl -X POST http://localhost:3001/recovery/full -d '{"reason": "attack_detected", "force_new_domains": true}'
```

### Восстановление из Резервной Копии

```bash
# Список доступных резервных копий
ls -la backups/

# Восстановление из конкретной копии
curl -X POST http://localhost:3001/backup/restore -d '{"backup_file": "backup-2024-01-15.tar.gz"}'
```

## 🔒 Безопасность

### Рекомендации

1. **Используйте сильные пароли** для всех API ключей
2. **Регулярно обновляйте** зависимости
3. **Мониторьте логи** на предмет подозрительной активности
4. **Используйте HTTPS** для всех соединений
5. **Ограничьте доступ** к системе безопасности

### Переменные Окружения

Все чувствительные данные должны храниться в переменных окружения:

```bash
# Обязательные для работы
TELEGRAM_ALERT_BOT_TOKEN
TELEGRAM_ALERT_CHAT_ID

# Рекомендуемые для полной функциональности
VERCEL_API_KEY
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
DIGITALOCEAN_API_KEY
CLOUDFLARE_API_KEY
```

### Мониторинг Безопасности

Система автоматически отслеживает:

- **Попытки взлома** и атаки
- **Подозрительную активность** в логах
- **Необычные паттерны** трафика
- **Попытки доступа** к защищенным ресурсам

## 📈 Производительность

### Оптимизация

1. **Используйте SSD диски** для лучшей производительности
2. **Настройте мониторинг ресурсов** (CPU, память, диск)
3. **Регулярно очищайте логи** и старые резервные копии
4. **Используйте CDN** для статических ресурсов

### Масштабирование

Система поддерживает горизонтальное масштабирование:

```bash
# Увеличение количества экземпляров
docker-compose -f docker-compose.frontend.yml up -d --scale web=3
docker-compose -f docker-compose.bot.yml up -d --scale bot=2
```

## 🆘 Поддержка и Устранение Неполадок

### Частые Проблемы

#### 1. Ошибка "Docker network not found"

```bash
# Создайте сеть заново
docker network create proxy
```

#### 2. Ошибка "Permission denied"

```bash
# Проверьте права доступа
chmod +x deploy-secure.sh
chmod +x security/start-security.js
```

#### 3. Ошибка "Environment variables not set"

```bash
# Проверьте .env файл
cat .env
# Убедитесь, что все переменные заполнены
```

#### 4. Ошибка "SSL certificate not found"

```bash
# Проверьте Traefik
docker-compose -f infra/traefik/docker-compose.yml logs
# Убедитесь, что ACME_EMAIL настроен правильно
```

### Логи и Отладка

```bash
# Логи системы безопасности
docker-compose -f docker-compose.security.yml logs -f

# Логи Traefik
docker-compose -f infra/traefik/docker-compose.yml logs -f

# Логи всех сервисов
docker-compose logs -f
```

### Контакты Поддержки

- **Telegram**: @your_support_bot
- **Email**: security@your-domain.com
- **GitHub Issues**: [Создать issue](https://github.com/your-org/vote-security/issues)

## 📚 Дополнительные Ресурсы

### Документация

- [Система Безопасности](./security/README.md)
- [API Документация](./security/API.md)
- [Конфигурация](./security/config.json)

### Полезные Команды

```bash
# Проверка статуса всех компонентов
docker-compose ps

# Просмотр использования ресурсов
docker stats

# Очистка неиспользуемых образов
docker system prune -a

# Обновление всех образов
docker-compose pull
```

---

**⚠️ Важно**: Эта система безопасности критически важна для защиты вашего проекта. Убедитесь, что все компоненты настроены правильно и регулярно тестируются.

**🎯 Цель**: Обеспечить максимальную защиту от атак и возможность быстрого восстановления в случае компрометации системы.
