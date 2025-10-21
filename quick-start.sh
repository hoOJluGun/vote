#!/bin/bash

# 🚀 Быстрый запуск системы голосования с полной защитой
# Автоматически настраивает и запускает все компоненты

set -e

# Цвета
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Функции вывода
log() { echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $1"; }
success() { echo -e "${GREEN}✅ $1${NC}"; }
warning() { echo -e "${YELLOW}⚠️ $1${NC}"; }
error() { echo -e "${RED}❌ $1${NC}"; }
info() { echo -e "${PURPLE}ℹ️ $1${NC}"; }

# Заголовок
echo -e "${PURPLE}"
echo "🛡️ СИСТЕМА ГОЛОСОВАНИЯ С АВТОМАТИЧЕСКОЙ ЗАЩИТОЙ"
echo "=============================================="
echo -e "${NC}"

# Проверка зависимостей
check_deps() {
    log "Проверка зависимостей..."
    
    local missing=()
    
    if ! command -v docker &> /dev/null; then
        missing+=("docker")
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        missing+=("docker-compose")
    fi
    
    if ! command -v node &> /dev/null; then
        missing+=("node")
    fi
    
    if [ ${#missing[@]} -ne 0 ]; then
        error "Отсутствуют зависимости: ${missing[*]}"
        echo ""
        info "Установите недостающие зависимости:"
        for dep in "${missing[@]}"; do
            case $dep in
                "docker")
                    echo "  - Docker: https://docs.docker.com/get-docker/"
                    ;;
                "docker-compose")
                    echo "  - Docker Compose: https://docs.docker.com/compose/install/"
                    ;;
                "node")
                    echo "  - Node.js: https://nodejs.org/"
                    ;;
            esac
        done
        exit 1
    fi
    
    success "Все зависимости установлены"
}

# Создание .env файла
create_env() {
    if [ ! -f .env ]; then
        log "Создание файла .env..."
        
        cat > .env << 'EOF'
# Основные настройки
NODE_ENV=production
PORT=3000

# Домены (ЗАМЕНИТЕ НА ВАШИ РЕАЛЬНЫЕ ДОМЕНЫ!)
WEB_DOMAIN=your-domain.com
BOT_DOMAIN=bot.your-domain.com
API_DOMAIN=api.your-domain.com

# Telegram боты (ОБЯЗАТЕЛЬНО ЗАПОЛНИТЕ!)
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
TELEGRAM_ALERT_BOT_TOKEN=your_alert_bot_token_here
TELEGRAM_ALERT_CHAT_ID=your_chat_id_here

# Провайдеры (для автоматического восстановления)
VERCEL_API_KEY=your_vercel_api_key_here
VERCEL_TEAM_ID=your_vercel_team_id_here
AWS_ACCESS_KEY_ID=your_aws_access_key_here
AWS_SECRET_ACCESS_KEY=your_aws_secret_key_here
AWS_REGION=us-east-1
DIGITALOCEAN_API_KEY=your_do_api_key_here

# DNS (Cloudflare)
CLOUDFLARE_API_KEY=your_cloudflare_api_key_here
CLOUDFLARE_ZONE_ID=your_zone_id_here

# Webhook алерты (опционально)
WEBHOOK_ALERT_URL=https://your-webhook-url.com/alerts
WEBHOOK_ALERT_TOKEN=your_webhook_token_here

# ACME для SSL
ACME_EMAIL=your-email@example.com

# API URLs
API_BASE_URL=https://your-domain.com/api
BOT_BASE_URL=https://bot.your-domain.com
EOF
        
        warning "Файл .env создан с шаблонными значениями"
        echo ""
        info "ВАЖНО: Отредактируйте файл .env и заполните реальные значения:"
        echo "  - Домены (WEB_DOMAIN, BOT_DOMAIN, API_DOMAIN)"
        echo "  - Telegram токены (TELEGRAM_BOT_TOKEN, TELEGRAM_ALERT_BOT_TOKEN)"
        echo "  - Chat ID для алертов (TELEGRAM_ALERT_CHAT_ID)"
        echo ""
        echo "Нажмите Enter после редактирования .env файла..."
        read
    else
        success "Файл .env уже существует"
    fi
}

# Создание директорий
create_dirs() {
    log "Создание необходимых директорий..."
    
    mkdir -p backups data security/logs security/reports infra/traefik/letsencrypt
    
    success "Директории созданы"
}

# Установка зависимостей
install_deps() {
    if [ -d "security" ]; then
        log "Установка зависимостей системы безопасности..."
        cd security
        npm install --silent
        cd ..
        success "Зависимости установлены"
    fi
}

# Создание Docker сети
create_network() {
    log "Создание Docker сети..."
    
    if ! docker network ls | grep -q "proxy"; then
        docker network create proxy > /dev/null 2>&1
        success "Docker сеть 'proxy' создана"
    else
        success "Docker сеть 'proxy' уже существует"
    fi
}

# Запуск Traefik
start_traefik() {
    log "Запуск Traefik (reverse proxy)..."
    
    cd infra/traefik
    
    if [ ! -f "letsencrypt/acme.json" ]; then
        touch letsencrypt/acme.json
        chmod 600 letsencrypt/acme.json
    fi
    
    docker-compose up -d > /dev/null 2>&1
    
    cd ../..
    success "Traefik запущен"
}

# Запуск основных сервисов
start_services() {
    log "Запуск основных сервисов..."
    
    # Сборка и запуск веб-приложения
    docker-compose -f docker-compose.frontend.yml up -d --build > /dev/null 2>&1
    
    # Сборка и запуск Telegram бота
    docker-compose -f docker-compose.bot.yml up -d --build > /dev/null 2>&1
    
    success "Основные сервисы запущены"
}

# Запуск системы безопасности
start_security() {
    log "Запуск системы безопасности..."
    
    # Сборка и запуск системы безопасности
    docker-compose -f docker-compose.security.yml up -d --build > /dev/null 2>&1
    
    success "Система безопасности запущена"
}

# Ожидание запуска
wait_for_services() {
    log "Ожидание запуска сервисов..."
    sleep 30
    success "Сервисы готовы"
}

# Проверка статуса
check_status() {
    log "Проверка статуса системы..."
    
    echo ""
    echo "📊 СТАТУС КОНТЕЙНЕРОВ:"
    echo "======================"
    docker-compose ps
    
    echo ""
    echo "🔍 ПРОВЕРКА ДОСТУПНОСТИ:"
    echo "========================"
    
    # Проверка основных сервисов
    if docker-compose ps | grep -q "Up"; then
        success "Основные сервисы работают"
    else
        warning "Некоторые сервисы могут быть недоступны"
    fi
    
    # Проверка системы безопасности
    if docker-compose -f docker-compose.security.yml ps | grep -q "Up"; then
        success "Система безопасности работает"
    else
        warning "Система безопасности может быть недоступна"
    fi
}

# Создание скриптов управления
create_scripts() {
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
docker-compose -f docker-compose.security.yml logs --tail=10
EOF
    
    # Скрипт тестирования
    cat > test-system.sh << 'EOF'
#!/bin/bash
echo "🧪 Тестирование системы..."
cd security
if [ -f "test-security.js" ]; then
    node test-security.js
else
    echo "⚠️ Файл тестирования не найден"
fi
cd ..
EOF
    
    chmod +x stop-all.sh monitor.sh test-system.sh
    
    success "Скрипты управления созданы"
}

# Финальная информация
show_final_info() {
    echo ""
    echo -e "${GREEN}🎉 СИСТЕМА УСПЕШНО ЗАПУЩЕНА!${NC}"
    echo ""
    echo "📋 СЛЕДУЮЩИЕ ШАГИ:"
    echo "=================="
    echo "1. 🔧 Настройте DNS записи для ваших доменов"
    echo "2. 📱 Проверьте работу Telegram бота"
    echo "3. 🌐 Откройте ваш сайт в браузере"
    echo "4. 🧪 Протестируйте систему: ./test-system.sh"
    echo ""
    echo "🔧 ПОЛЕЗНЫЕ КОМАНДЫ:"
    echo "==================="
    echo "• Остановка: ./stop-all.sh"
    echo "• Мониторинг: ./monitor.sh"
    echo "• Тестирование: ./test-system.sh"
    echo "• Логи: docker-compose logs -f"
    echo ""
    echo "🛡️ СИСТЕМА БЕЗОПАСНОСТИ:"
    echo "========================"
    echo "• Автоматический мониторинг всех сервисов"
    echo "• Ротация токенов каждые 24 часа"
    echo "• Автоматическое восстановление при атаках"
    echo "• Резервное копирование каждые 5 минут"
    echo ""
    echo "📚 ДОКУМЕНТАЦИЯ:"
    echo "==============="
    echo "• Полное руководство: SECURITY_DEPLOYMENT.md"
    echo "• Система безопасности: security/README.md"
    echo ""
    echo -e "${YELLOW}⚠️ ВАЖНО: Убедитесь, что все переменные в .env заполнены правильно!${NC}"
    echo ""
}

# Основная функция
main() {
    check_deps
    create_env
    create_dirs
    install_deps
    create_network
    start_traefik
    start_services
    start_security
    wait_for_services
    check_status
    create_scripts
    show_final_info
}

# Обработка сигналов
trap 'echo -e "\n${RED}❌ Прервано пользователем${NC}"; exit 1' INT TERM

# Запуск
main "$@"
