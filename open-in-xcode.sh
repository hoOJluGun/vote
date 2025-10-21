#!/bin/bash

# 🍎 Скрипт для открытия проекта Vote Security System в Xcode
# Настроен для работы с Xcode 15.0, macOS Sequoia 15.0 и встроенным GPT

set -e

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Функции вывода
log() { echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $1"; }
success() { echo -e "${GREEN}✅ $1${NC}"; }
warning() { echo -e "${YELLOW}⚠️ $1${NC}"; }
error() { echo -e "${RED}❌ $1${NC}"; }
info() { echo -e "${PURPLE}ℹ️ $1${NC}"; }

# Заголовок
echo -e "${PURPLE}"
echo "🍎 VOTE SECURITY SYSTEM - XCODE INTEGRATION"
echo "============================================="
echo -e "${NC}"

# Проверка Xcode
check_xcode() {
    log "Проверка установки Xcode..."
    
    if ! command -v xcodebuild &> /dev/null; then
        error "Xcode не установлен или не настроен"
        echo ""
        info "Установите Xcode из Mac App Store:"
        echo "  https://apps.apple.com/app/xcode/id497799835"
        echo ""
        info "После установки выполните:"
        echo "  sudo xcode-select --install"
        exit 1
    fi
    
    # Проверка версии Xcode
    local xcode_version=$(xcodebuild -version | head -n1 | awk '{print $2}')
    local major_version=$(echo $xcode_version | cut -d. -f1)
    
    if [ "$major_version" -lt 15 ]; then
        warning "Рекомендуется Xcode 15.0 или новее. Текущая версия: $xcode_version"
        echo ""
        info "Обновите Xcode до последней версии для полной совместимости"
    else
        success "Xcode $xcode_version обнаружен"
    fi
}

# Проверка macOS версии
check_macos() {
    log "Проверка версии macOS..."
    
    local macos_version=$(sw_vers -productVersion)
    local major_version=$(echo $macos_version | cut -d. -f1)
    local minor_version=$(echo $macos_version | cut -d. -f2)
    
    if [ "$major_version" -lt 14 ] || ([ "$major_version" -eq 14 ] && [ "$minor_version" -lt 0 ]); then
        warning "Рекомендуется macOS Sequoia 15.0 или новее. Текущая версия: $macos_version"
        echo ""
        info "Обновите macOS для полной совместимости с SwiftUI и новыми API"
    else
        success "macOS $macos_version обнаружен"
    fi
}

# Проверка Swift
check_swift() {
    log "Проверка Swift..."
    
    if ! command -v swift &> /dev/null; then
        error "Swift не найден"
        echo ""
        info "Установите Xcode Command Line Tools:"
        echo "  sudo xcode-select --install"
        exit 1
    fi
    
    local swift_version=$(swift --version | head -n1)
    success "Swift обнаружен: $swift_version"
}

# Проверка зависимостей
check_dependencies() {
    log "Проверка зависимостей..."
    
    # Проверка Swift Package Manager
    if ! command -v swift package &> /dev/null; then
        error "Swift Package Manager не найден"
        exit 1
    fi
    
    success "Swift Package Manager готов"
}

# Настройка проекта
setup_project() {
    log "Настройка проекта..."
    
    # Создание необходимых директорий
    mkdir -p Sources/VoteSecurityApp/Resources
    mkdir -p Sources/VoteSecurityCLI
    mkdir -p Sources/VoteSecurityCore/Resources
    mkdir -p Sources/VoteSecurityUI/Resources
    mkdir -p Sources/VoteSecurityiOS/Resources
    mkdir -p Tests/VoteSecurityTests
    
    # Создание .gitignore если не существует
    if [ ! -f .gitignore ]; then
        cat > .gitignore << 'EOF'
# Xcode
.DS_Store
*/build/*
*.pbxuser
!default.pbxuser
*.mode1v3
!default.mode1v3
*.mode2v3
!default.mode2v3
*.perspectivev3
!default.perspectivev3
xcuserdata/
*.moved-aside
*.xccheckout
*.xcscmblueprint

# Swift Package Manager
.build/
Packages/
Package.resolved
*.xcodeproj/xcuserdata/
*.xcodeproj/project.xcworkspace/xcuserdata/

# Environment variables
.env
.env.local
.env.production

# Logs
*.log
logs/

# Backups
backups/
*.backup

# Temporary files
*.tmp
*.temp
EOF
        success ".gitignore создан"
    fi
    
    # Создание README для Xcode
    if [ ! -f XCODE_README.md ]; then
        cat > XCODE_README.md << 'EOF'
# 🍎 Xcode Project Setup

## Открытие в Xcode

1. Откройте `VoteSecuritySystem.xcodeproj` в Xcode
2. Выберите схему `VoteSecurityApp` для macOS приложения
3. Нажмите `Cmd + R` для запуска

## Настройка GPT

1. `Xcode` → `Preferences` → `Features` → `AI Assistant`
2. Включите "Enable AI Assistant"
3. GPT будет иметь доступ ко всему проекту

## Команды для GPT

- "Проанализируй систему безопасности"
- "Найди потенциальные уязвимости"
- "Оптимизируй производительность"
- "Добавь новые функции"
EOF
        success "XCODE_README.md создан"
    fi
}

# Резолв зависимостей
resolve_dependencies() {
    log "Резолв зависимостей Swift Package Manager..."
    
    if swift package resolve; then
        success "Зависимости разрешены"
    else
        warning "Ошибка резолва зависимостей, но продолжаем..."
    fi
}

# Проверка проекта
validate_project() {
    log "Валидация проекта..."
    
    # Проверка Package.swift
    if [ ! -f Package.swift ]; then
        error "Package.swift не найден"
        exit 1
    fi
    
    # Проверка Xcode проекта
    if [ ! -f VoteSecuritySystem.xcodeproj/project.pbxproj ]; then
        error "Xcode проект не найден"
        exit 1
    fi
    
    success "Проект валиден"
}

# Открытие в Xcode
open_xcode() {
    log "Открытие проекта в Xcode..."
    
    if open VoteSecuritySystem.xcodeproj; then
        success "Проект открыт в Xcode"
        
        echo ""
        info "📋 Следующие шаги в Xcode:"
        echo "1. Выберите схему 'VoteSecurityApp'"
        echo "2. Нажмите Cmd + R для запуска"
        echo "3. Включите GPT Assistant в настройках"
        echo "4. Начните разработку с помощью GPT"
        
    else
        error "Не удалось открыть проект в Xcode"
        exit 1
    fi
}

# Настройка GPT контекста
setup_gpt_context() {
    log "Настройка контекста для GPT..."
    
    # Создание файла с контекстом для GPT
    cat > GPT_CONTEXT.md << 'EOF'
# 🤖 GPT Context for Vote Security System

## Project Overview
This is a comprehensive security and auto-recovery system for a voting project, built with:
- Swift 5.9
- SwiftUI
- macOS Sequoia 15.0
- Xcode 15.0

## Key Components
- SecurityManager: Main security orchestrator
- MonitoringService: Real-time monitoring
- TokenRotationService: Automatic token rotation
- RecoveryService: Auto-recovery system

## Architecture
- MVVM pattern
- Dependency injection
- ObservableObject for reactive UI
- Async/await for concurrency

## GPT Instructions
When helping with this project:
1. Follow Apple's latest guidelines
2. Use modern Swift patterns
3. Ensure security best practices
4. Optimize for performance
5. Maintain clean architecture
EOF
    
    success "GPT контекст настроен"
}

# Создание схем сборки
create_build_schemes() {
    log "Создание схем сборки..."
    
    # Создание скрипта для быстрой сборки
    cat > build.sh << 'EOF'
#!/bin/bash

echo "🔨 Сборка Vote Security System..."

# Сборка через Swift Package Manager
echo "📦 Сборка через SPM..."
swift build

# Сборка через Xcode
echo "🍎 Сборка через Xcode..."
xcodebuild -project VoteSecuritySystem.xcodeproj -scheme VoteSecurityApp -configuration Debug build

echo "✅ Сборка завершена"
EOF
    
    chmod +x build.sh
    success "Схемы сборки созданы"
}

# Основная функция
main() {
    check_xcode
    check_macos
    check_swift
    check_dependencies
    setup_project
    resolve_dependencies
    validate_project
    setup_gpt_context
    create_build_schemes
    open_xcode
    
    echo ""
    echo -e "${GREEN}🎉 ПРОЕКТ ГОТОВ К РАБОТЕ В XCODE!${NC}"
    echo ""
    echo "📚 Документация:"
    echo "• Основной README: README.md"
    echo "• Apple проект: APPLE_PROJECT_README.md"
    echo "• Xcode настройка: XCODE_README.md"
    echo "• GPT контекст: GPT_CONTEXT.md"
    echo ""
    echo "🚀 Команды:"
    echo "• Сборка: ./build.sh"
    echo "• Тесты: swift test"
    echo "• CLI: swift run VoteSecurityCLI"
    echo ""
    echo -e "${PURPLE}🤖 Теперь вы можете использовать GPT в Xcode для разработки!${NC}"
}

# Обработка сигналов
trap 'echo -e "\n${RED}❌ Прервано пользователем${NC}"; exit 1' INT TERM

# Запуск
main "$@"
