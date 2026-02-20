#!/bin/bash

# 🛡️ Скрипт автоматического развертывания системы безопасности
# Развертывает проект с полной системой безопасности и автоматического восстановления

set -e  # Остановка при ошибке

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Функция для вывода сообщений
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️ $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
}

# Проверка зависимостей
check_dependencies() {
    log "Проверка зависимостей..."
    
    # Проверка Docker
    if ! command -v docker &> /dev/null; then
        error "Docker не установлен. Установите Docker и попробуйте снова."
        exit 1
    fi
    
    # Проверка Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        error "Docker Compose не установлен. Установите Docker Compose и попробуйте снова."
        exit 1
    fi
    
    # Проверка Node.js
    if ! command -v node &> /dev/null; then
        error "Node.js не установлен. Установите Node.js и попробуйте снова."
        exit 1
    fi
    
    # Проверка npm
    if ! command -v npm &> /dev/null; then
        error "npm не установлен. Установите npm и попробуйте снова."
        exit 1
    fi
    
    success "Все зависимости установлены"
}

# Создание необходимых директорий
create_directories() {
    log "Создание необходимых директорий..."
    
    mkdir -p backups
    mkdir -p data
    mkdir -p security/logs
    mkdir -p security/reports
    mkdir -p infra/traefik/letsencrypt
    
    success "Директории созданы"
}

# Настройка переменных окружения
setup_environment() {
    log "Настройка переменных окружения..."
    
    if [ ! -f .env ]; then
        warning "Файл .env не найден. Создаю шаблон..."
        
        cat > .env << EOF
# Основные настройки
NODE_ENV=production
PORT=3000

# Домены
WEB_DOMAIN=your-domain.com
BOT_DOMAIN=bot.your-domain.com
API_DOMAIN=api.your-domain.com

# Telegram боты
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_ALERT_BOT_TOKEN=your_alert_bot_token
TELEGRAM_ALERT_CHAT_ID=your_chat_id

# Провайдеры
VERCEL_API_KEY=your_vercel_api_key
VERCEL_TEAM_ID=your_vercel_team_id
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1
DIGITALOCEAN_API_KEY=your_do_api_key

# DNS
CLOUDFLARE_API_KEY=your_cloudflare_api_key
CLOUDFLARE_ZONE_ID=your_zone_id

# Webhook алерты
WEBHOOK_ALERT_URL=https://your-webhook-url.com/alerts
WEBHOOK_ALERT_TOKEN=your_webhook_token

# ACME для SSL
ACME_EMAIL=your-email@example.com

# API URLs
API_BASE_URL=https://your-domain.com/api
BOT_BASE_URL=https://bot.your-domain.com
EOF
        
        warning "Файл .env создан с шаблонными значениями. Отредактируйте его перед продолжением."
        echo "Нажмите Enter после редактирования .env файла..."
        read
    fi
    
    success "Переменные окружения настроены"
}

# Установка зависимостей
install_dependencies() {
    log "Установка зависимостей..."
    
    # Установка зависимостей для системы безопасности
    if [ -d "security" ]; then
        cd security
        npm install
        cd ..
    fi
    
    success "Зависимости установлены"
}

# Создание сети Docker
create_docker_network() {
    log "Создание Docker сети..."
    
    if ! docker network ls | grep -q "proxy"; then
        docker network create proxy
        success "Docker сеть 'proxy' создана"
    else
        success "Docker сеть 'proxy' уже существует"
    fi
}

# Запуск Traefik
start_traefik() {
    log "Запуск Traefik..."
    
    cd infra/traefik
    
    # Создание файла для Let's Encrypt
    if [ ! -f "letsencrypt/acme.json" ]; then
        touch letsencrypt/acme.json
        chmod 600 letsencrypt/acme.json
    fi
    
    docker-compose up -d
    
    cd ../..
    
    success "Traefik запущен"
}

# Сборка и запуск основных сервисов
start_main_services() {
    log "Сборка и запуск основных сервисов..."
    
    # Сборка образов
    docker-compose -f docker-compose.frontend.yml build
    docker-compose -f docker-compose.bot.yml build
    
    # Запуск сервисов
    docker-compose -f docker-compose.frontend.yml up -d
    docker-compose -f docker-compose.bot.yml up -d
    
    success "Основные сервисы запущены"
}

# Запуск системы безопасности
start_security_system() {
    log "Запуск системы безопасности..."
    
    # Сборка образа системы безопасности
    docker-compose -f docker-compose.security.yml build
    
    # Запуск системы безопасности
    docker-compose -f docker-compose.security.yml up -d
    
    success "Система безопасности запущена"
}

# Тестирование системы
test_system() {
    log "Тестирование системы..."
    
    # Ожидание запуска сервисов
    sleep 30
    
    # Тестирование системы безопасности
    if [ -f "security/test-security.js" ]; then
        cd security
        node test-security.js
        cd ..
    fi
    
    # Проверка статуса контейнеров
    log "Проверка статуса контейнеров..."
    docker-compose ps
    
    success "Тестирование завершено"
}

# Создание скриптов управления
create_management_scripts() {
    log "Создание скриптов управления..."
    
    # Скрипт остановки
    cat > stop-all.sh << 'EOF'
#!/bin/bash
echo "🛑 Остановка всех сервисов..."
docker-compose -f docker-compose.frontend.yml down
docker-compose -f docker-compose.bot.yml down
docker-compose -f docker-compose.security.yml down
docker-compose -f infra/traefik/docker-compose.yml down
echo "✅ Все сервисы остановлены"
EOF
    
    # Скрипт перезапуска
    cat > restart-all.sh << 'EOF'
#!/bin/bash
echo "🔄 Перезапуск всех сервисов..."
./stop-all.sh
sleep 5
./deploy-secure.sh
echo "✅ Все сервисы перезапущены"
EOF
    
    # Скрипт обновления
    cat > update-system.sh << 'EOF'
#!/bin/bash
echo "🔄 Обновление системы..."
git pull
docker-compose -f docker-compose.frontend.yml build --no-cache
docker-compose -f docker-compose.bot.yml build --no-cache
docker-compose -f docker-compose.security.yml build --no-cache
docker-compose -f docker-compose.frontend.yml up -d
docker-compose -f docker-compose.bot.yml up -d
docker-compose -f docker-compose.security.yml up -d
echo "✅ Система обновлена"
EOF
    
    # Скрипт мониторинга
    cat > monitor.sh << 'EOF'
#!/bin/bash
echo "📊 Мониторинг системы..."
echo "=== Статус контейнеров ==="
docker-compose ps
echo ""
echo "=== Использование ресурсов ==="
docker stats --no-stream
echo ""
echo "=== Логи системы безопасности ==="
docker-compose -f docker-compose.security.yml logs --tail=20
EOF
    
    # Делаем скрипты исполняемыми
    chmod +x stop-all.sh restart-all.sh update-system.sh monitor.sh
    
    success "Скрипты управления созданы"
}

# Создание cron задач
setup_cron() {
    log "Настройка cron задач..."
    
    # Создание файла cron задач
    cat > security-cron << EOF
# Система безопасности - резервное копирование каждые 6 часов
0 */6 * * * cd $(pwd) && docker-compose -f docker-compose.security.yml exec -T backup-service node backup-manager.js

# Система безопасности - проверка здоровья каждые 5 минут
*/5 * * * * cd $(pwd) && docker-compose -f docker-compose.security.yml exec -T security-manager node health-check.js

# Система безопасности - очистка старых логов каждый день в 2:00
0 2 * * * cd $(pwd) && find ./security/logs -name "*.log" -mtime +7 -delete

# Система безопасности - очистка старых резервных копий каждый день в 3:00
0 3 * * * cd $(pwd) && find ./backups -name "*.tar.gz" -mtime +30 -delete
EOF
    
    # Установка cron задач (только если пользователь root)
    if [ "$EUID" -eq 0 ]; then
        crontab security-cron
        success "Cron задачи установлены"
    else
        warning "Для установки cron задач запустите: sudo crontab security-cron"
    fi
    
    rm security-cron
}

# Основная функция
main() {
    echo "🛡️ Развертывание системы безопасности для проекта голосования"
    echo "=============================================================="
    
    check_dependencies
    create_directories
    setup_environment
    install_dependencies
    create_docker_network
    start_traefik
    start_main_services
    start_security_system
    test_system
    create_management_scripts
    setup_cron
    
    echo ""
    echo "🎉 Развертывание завершено!"
    echo ""
    echo "📋 Следующие шаги:"
    echo "1. Отредактируйте файл .env с вашими реальными значениями"
    echo "2. Настройте DNS записи для ваших доменов"
    echo "3. Проверьте статус системы: ./monitor.sh"
    echo "4. Протестируйте систему безопасности: cd security && npm run test:security"
    echo ""
    echo "🔧 Полезные команды:"
    echo "- Остановка: ./stop-all.sh"
    echo "- Перезапуск: ./restart-all.sh"
    echo "- Обновление: ./update-system.sh"
    echo "- Мониторинг: ./monitor.sh"
    echo ""
    echo "📚 Документация: ./security/README.md"
    echo ""
    echo "⚠️ Важно: Убедитесь, что все переменные окружения настроены правильно!"
}

# Запуск основной функции
main "$@"
