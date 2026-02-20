import Foundation
import AsyncHTTPClient
import Logging
import Crypto
import NIO
import Collections

// MARK: - Security Manager

@MainActor
public class SecurityManager: ObservableObject {
    // MARK: - Published Properties
    
    @Published public var isRunning = false
    @Published public var systemStatus: SystemStatus = .initializing
    @Published public var lastUpdate: Date = Date()
    @Published public var activeAlerts: [SecurityAlert] = []
    
    // MARK: - Private Properties
    
    private let logger = Logger(label: "SecurityManager")
    private let httpClient: HTTPClient
    private let monitoringService: MonitoringService
    private let tokenRotationService: TokenRotationService
    private let recoveryService: RecoveryService
    private let configuration: SecurityConfiguration
    
    private var monitoringTask: Task<Void, Never>?
    private var tokenRotationTask: Task<Void, Never>?
    private var alertTask: Task<Void, Never>?
    
    // MARK: - Initialization
    
    public init(configuration: SecurityConfiguration = SecurityConfiguration()) {
        self.configuration = configuration
        self.httpClient = HTTPClient(eventLoopGroupProvider: .createNew)
        self.monitoringService = MonitoringService(httpClient: httpClient)
        self.tokenRotationService = TokenRotationService(httpClient: httpClient)
        self.recoveryService = RecoveryService(httpClient: httpClient)
        
        logger.info("🛡️ SecurityManager инициализирован")
    }
    
    deinit {
        Task {
            await shutdown()
        }
    }
    
    // MARK: - Public Methods
    
    public func initialize() async {
        logger.info("🚀 Инициализация системы безопасности")
        
        do {
            // Загрузка конфигурации
            try await loadConfiguration()
            
            // Инициализация сервисов
            await monitoringService.initialize()
            await tokenRotationService.initialize()
            await recoveryService.initialize()
            
            // Запуск мониторинга
            startMonitoring()
            
            // Запуск ротации токенов
            startTokenRotation()
            
            // Запуск обработки алертов
            startAlertProcessing()
            
            isRunning = true
            systemStatus = .running
            lastUpdate = Date()
            
            logger.info("✅ Система безопасности запущена")
            
            // Отправка уведомления о запуске
            await sendAlert(SecurityAlert(
                type: .systemStart,
                message: "Система безопасности запущена и готова к работе",
                severity: .info
            ))
            
        } catch {
            logger.error("❌ Ошибка инициализации: \(error)")
            systemStatus = .error
            await sendAlert(SecurityAlert(
                type: .systemError,
                message: "Ошибка инициализации системы: \(error.localizedDescription)",
                severity: .critical
            ))
        }
    }
    
    public func shutdown() async {
        logger.info("🛑 Остановка системы безопасности")
        
        isRunning = false
        systemStatus = .stopping
        
        // Остановка задач
        monitoringTask?.cancel()
        tokenRotationTask?.cancel()
        alertTask?.cancel()
        
        // Остановка сервисов
        await monitoringService.shutdown()
        await tokenRotationService.shutdown()
        await recoveryService.shutdown()
        
        // Закрытие HTTP клиента
        try? await httpClient.shutdown()
        
        systemStatus = .stopped
        lastUpdate = Date()
        
        logger.info("✅ Система безопасности остановлена")
    }
    
    public func rotateTokens() async {
        logger.info("🔄 Запуск ротации токенов")
        
        do {
            await tokenRotationService.rotateAllTokens()
            await sendAlert(SecurityAlert(
                type: .tokenRotation,
                message: "Ротация токенов завершена успешно",
                severity: .info
            ))
        } catch {
            logger.error("❌ Ошибка ротации токенов: \(error)")
            await sendAlert(SecurityAlert(
                type: .tokenRotationError,
                message: "Ошибка ротации токенов: \(error.localizedDescription)",
                severity: .warning
            ))
        }
    }
    
    public func testRecovery() async {
        logger.info("🧪 Тестирование восстановления")
        
        do {
            let result = await recoveryService.testRecovery()
            await sendAlert(SecurityAlert(
                type: .recoveryTest,
                message: "Тест восстановления завершен: \(result.success ? "успешно" : "с ошибками")",
                severity: result.success ? .info : .warning
            ))
        } catch {
            logger.error("❌ Ошибка тестирования восстановления: \(error)")
            await sendAlert(SecurityAlert(
                type: .recoveryTestError,
                message: "Ошибка тестирования восстановления: \(error.localizedDescription)",
                severity: .warning
            ))
        }
    }
    
    public func emergencyRecovery() async {
        logger.info("🚨 Запуск экстренного восстановления")
        
        await sendAlert(SecurityAlert(
            type: .emergencyRecovery,
            message: "Запуск экстренного восстановления системы",
            severity: .critical
        ))
        
        do {
            let result = await recoveryService.startFullRecovery(reason: "emergency_manual")
            await sendAlert(SecurityAlert(
                type: .recoveryComplete,
                message: "Экстренное восстановление завершено. Новые домены: \(result.newDomains?.joined(separator: ", ") ?? "не созданы")",
                severity: .info
            ))
        } catch {
            logger.error("❌ Ошибка экстренного восстановления: \(error)")
            await sendAlert(SecurityAlert(
                type: .recoveryError,
                message: "Ошибка экстренного восстановления: \(error.localizedDescription)",
                severity: .critical
            ))
        }
    }
    
    // MARK: - Private Methods
    
    private func loadConfiguration() async throws {
        logger.info("📋 Загрузка конфигурации")
        
        // Загрузка конфигурации из файла или переменных окружения
        // Здесь должна быть логика загрузки конфигурации
    }
    
    private func startMonitoring() {
        monitoringTask = Task {
            while !Task.isCancelled {
                do {
                    let status = await monitoringService.checkAllServices()
                    await updateSystemStatus(status)
                    
                    // Проверка на критические сбои
                    if status.hasCriticalFailures {
                        await handleCriticalFailure(status)
                    }
                    
                } catch {
                    logger.error("❌ Ошибка мониторинга: \(error)")
                }
                
                try? await Task.sleep(nanoseconds: UInt64(configuration.monitoringInterval * 1_000_000_000))
            }
        }
    }
    
    private func startTokenRotation() {
        tokenRotationTask = Task {
            while !Task.isCancelled {
                try? await Task.sleep(nanoseconds: UInt64(configuration.tokenRotationInterval * 1_000_000_000))
                
                if !Task.isCancelled {
                    await rotateTokens()
                }
            }
        }
    }
    
    private func startAlertProcessing() {
        alertTask = Task {
            while !Task.isCancelled {
                // Обработка алертов
                await processAlerts()
                try? await Task.sleep(nanoseconds: 5_000_000_000) // 5 секунд
            }
        }
    }
    
    private func updateSystemStatus(_ status: MonitoringStatus) {
        Task { @MainActor in
            lastUpdate = Date()
            
            if status.hasCriticalFailures {
                systemStatus = .critical
            } else if status.hasWarnings {
                systemStatus = .warning
            } else {
                systemStatus = .running
            }
        }
    }
    
    private func handleCriticalFailure(_ status: MonitoringStatus) async {
        logger.warning("🚨 Обнаружены критические сбои")
        
        await sendAlert(SecurityAlert(
            type: .criticalFailure,
            message: "Обнаружены критические сбои в системе. Запуск процедуры восстановления.",
            severity: .critical
        ))
        
        // Автоматическое восстановление при критических сбоях
        if configuration.autoRecoveryEnabled {
            await emergencyRecovery()
        }
    }
    
    private func processAlerts() async {
        // Обработка активных алертов
        for alert in activeAlerts {
            if alert.timestamp.timeIntervalSinceNow < -configuration.alertRetentionTime {
                await MainActor.run {
                    activeAlerts.removeAll { $0.id == alert.id }
                }
            }
        }
    }
    
    private func sendAlert(_ alert: SecurityAlert) async {
        await MainActor.run {
            activeAlerts.append(alert)
        }
        
        // Отправка уведомлений
        await sendTelegramAlert(alert)
        await sendSystemNotification(alert)
        
        logger.info("📢 Алерт отправлен: \(alert.message)")
    }
    
    private func sendTelegramAlert(_ alert: SecurityAlert) async {
        guard let telegramConfig = configuration.telegramConfig else { return }
        
        do {
            let message = formatTelegramMessage(alert)
            try await sendTelegramMessage(
                botToken: telegramConfig.botToken,
                chatId: telegramConfig.chatId,
                message: message
            )
        } catch {
            logger.error("❌ Ошибка отправки Telegram алерта: \(error)")
        }
    }
    
    private func sendSystemNotification(_ alert: SecurityAlert) async {
        // Отправка системного уведомления macOS
        let content = UNMutableNotificationContent()
        content.title = "Vote Security Alert"
        content.body = alert.message
        content.sound = .default
        
        let request = UNNotificationRequest(
            identifier: alert.id.uuidString,
            content: content,
            trigger: nil
        )
        
        try? await UNUserNotificationCenter.current().add(request)
    }
    
    private func formatTelegramMessage(_ alert: SecurityAlert) -> String {
        let emoji = alert.severity.emoji
        let timestamp = DateFormatter.localizedString(from: alert.timestamp, dateStyle: .short, timeStyle: .medium)
        
        return """
        \(emoji) **Vote Security Alert**
        
        **Тип:** \(alert.type.rawValue)
        **Серьезность:** \(alert.severity.rawValue)
        **Время:** \(timestamp)
        
        **Сообщение:**
        \(alert.message)
        
        **ID:** `\(alert.id.uuidString)`
        """
    }
    
    private func sendTelegramMessage(botToken: String, chatId: String, message: String) async throws {
        let url = "https://api.telegram.org/bot\(botToken)/sendMessage"
        
        var request = HTTPClientRequest(url: url)
        request.method = .POST
        request.headers.add(name: "Content-Type", value: "application/json")
        
        let body = [
            "chat_id": chatId,
            "text": message,
            "parse_mode": "Markdown"
        ]
        
        request.body = .data(try JSONSerialization.data(withJSONObject: body))
        
        let response = try await httpClient.execute(request, timeout: .seconds(10))
        
        guard response.status == .ok else {
            throw SecurityError.telegramSendFailed
        }
    }
}

// MARK: - Supporting Types

public enum SystemStatus: String, CaseIterable {
    case initializing = "Инициализация"
    case running = "Работает"
    case warning = "Предупреждение"
    case critical = "Критический"
    case stopping = "Остановка"
    case stopped = "Остановлен"
    case error = "Ошибка"
}

public struct SecurityAlert: Identifiable {
    public let id = UUID()
    public let type: AlertType
    public let message: String
    public let severity: AlertSeverity
    public let timestamp = Date()
    
    public init(type: AlertType, message: String, severity: AlertSeverity) {
        self.type = type
        self.message = message
        self.severity = severity
    }
}

public enum AlertType: String, CaseIterable {
    case systemStart = "Запуск системы"
    case systemError = "Ошибка системы"
    case tokenRotation = "Ротация токенов"
    case tokenRotationError = "Ошибка ротации токенов"
    case recoveryTest = "Тест восстановления"
    case recoveryTestError = "Ошибка теста восстановления"
    case emergencyRecovery = "Экстренное восстановление"
    case recoveryComplete = "Восстановление завершено"
    case recoveryError = "Ошибка восстановления"
    case criticalFailure = "Критический сбой"
    case monitoringAlert = "Алерт мониторинга"
}

public enum AlertSeverity: String, CaseIterable {
    case info = "Информация"
    case warning = "Предупреждение"
    case critical = "Критический"
    
    var emoji: String {
        switch self {
        case .info: return "ℹ️"
        case .warning: return "⚠️"
        case .critical: return "🚨"
        }
    }
}

public struct SecurityConfiguration {
    public let monitoringInterval: TimeInterval = 30 // секунды
    public let tokenRotationInterval: TimeInterval = 24 * 60 * 60 // 24 часа
    public let alertRetentionTime: TimeInterval = 7 * 24 * 60 * 60 // 7 дней
    public let autoRecoveryEnabled: Bool = true
    
    public let telegramConfig: TelegramConfig?
    public let webhookConfig: WebhookConfig?
    
    public init(telegramConfig: TelegramConfig? = nil, webhookConfig: WebhookConfig? = nil) {
        self.telegramConfig = telegramConfig
        self.webhookConfig = webhookConfig
    }
}

public struct TelegramConfig {
    public let botToken: String
    public let chatId: String
    
    public init(botToken: String, chatId: String) {
        self.botToken = botToken
        self.chatId = chatId
    }
}

public struct WebhookConfig {
    public let url: String
    public let token: String?
    
    public init(url: String, token: String? = nil) {
        self.url = url
        self.token = token
    }
}

public enum SecurityError: Error {
    case telegramSendFailed
    case configurationLoadFailed
    case serviceInitializationFailed
}
