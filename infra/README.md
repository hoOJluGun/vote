# Инфраструктура

## Компоненты
- Traefik (reverse-proxy, Let’s Encrypt)
- Frontend (Next.js) — `docker-compose.frontend.yml`
- Telegram Bot (Telegraf) — `docker-compose.bot.yml`

## Переменные окружения
Создайте `.env` в корне:

```
# Домены
WEB_DOMAIN=example.org
BOT_DOMAIN=bot.example.org
ACME_EMAIL=admin@example.org

# Фронтенд
API_BASE_URL=https://api.tabletochki.org

# Бот
TELEGRAM_BOT_TOKEN=123:ABC
```

## Запуск
1. Установить Docker + Docker Compose
2. Создать общую сеть: `docker network create proxy`
3. Запустить Traefik: `cd infra/traefik && docker compose up -d`
4. Запустить фронт: `docker compose -f docker-compose.frontend.yml up -d --build`
5. Запустить бота: `docker compose -f docker-compose.bot.yml up -d --build`

## Автоподнятие
- У всех сервисов стоит `restart: always`
- Health-check для бота: `GET /healthz`

## Вебхук Telegram
- `BOT_BASE_URL` формируется из `https://${BOT_DOMAIN}`
- Бот при старте выставляет webhook на `${BOT_BASE_URL}/telegram`
