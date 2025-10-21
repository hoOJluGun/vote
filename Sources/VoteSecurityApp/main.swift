#!/usr/bin/env swift

import Foundation
import SwiftUI
import VoteSecurityCore
import VoteSecurityUI
import Logging

// MARK: - Main Application Entry Point

@main
struct VoteSecurityApp: App {
    @StateObject private var securityManager = SecurityManager()
    @StateObject private var monitoringService = MonitoringService()
    @StateObject private var tokenRotationService = TokenRotationService()
    @StateObject private var recoveryService = RecoveryService()
    
    private let logger = Logger(label: "VoteSecurityApp")
    
    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(securityManager)
                .environmentObject(monitoringService)
                .environmentObject(tokenRotationService)
                .environmentObject(recoveryService)
                .onAppear {
                    setupApplication()
                }
        }
        .windowStyle(.automatic)
        .windowResizability(.contentSize)
        .commands {
            CommandGroup(replacing: .newItem) {
                Button("Новый мониторинг") {
                    createNewMonitoring()
                }
                .keyboardShortcut("n", modifiers: [.command])
            }
            
            CommandGroup(after: .toolbar) {
                Button("Настройки безопасности") {
                    openSecuritySettings()
                }
                .keyboardShortcut(",", modifiers: [.command])
            }
        }
        
        // Меню приложения
        MenuBarExtra("Vote Security", systemImage: "shield.lefthalf.filled") {
            MenuBarView()
        }
        .menuBarExtraStyle(.window)
    }
    
    // MARK: - Application Setup
    
    private func setupApplication() {
        logger.info("🚀 Запуск системы безопасности Vote Security")
        
        // Инициализация сервисов
        Task {
            await securityManager.initialize()
            await monitoringService.start()
            await tokenRotationService.start()
            await recoveryService.initialize()
            
            logger.info("✅ Все сервисы инициализированы")
        }
        
        // Настройка обработки сигналов
        setupSignalHandling()
        
        // Настройка уведомлений
        setupNotifications()
    }
    
    private func setupSignalHandling() {
        signal(SIGINT) { _ in
            logger.info("🛑 Получен сигнал остановки")
            Task {
                await securityManager.shutdown()
                exit(0)
            }
        }
        
        signal(SIGTERM) { _ in
            logger.info("🛑 Получен сигнал завершения")
            Task {
                await securityManager.shutdown()
                exit(0)
            }
        }
    }
    
    private func setupNotifications() {
        // Настройка уведомлений системы
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) { granted, error in
            if granted {
                logger.info("✅ Разрешение на уведомления получено")
            } else {
                logger.warning("⚠️ Разрешение на уведомления отклонено: \(error?.localizedDescription ?? "неизвестная ошибка")")
            }
        }
    }
    
    // MARK: - Actions
    
    private func createNewMonitoring() {
        logger.info("📊 Создание нового мониторинга")
        Task {
            await monitoringService.createNewMonitoring()
        }
    }
    
    private func openSecuritySettings() {
        logger.info("⚙️ Открытие настроек безопасности")
        // Открытие окна настроек
    }
}

// MARK: - Menu Bar View

struct MenuBarView: View {
    @EnvironmentObject var securityManager: SecurityManager
    @EnvironmentObject var monitoringService: MonitoringService
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            // Статус системы
            HStack {
                Image(systemName: securityManager.isRunning ? "checkmark.circle.fill" : "xmark.circle.fill")
                    .foregroundColor(securityManager.isRunning ? .green : .red)
                Text("Система безопасности")
                    .font(.headline)
                Spacer()
            }
            
            Divider()
            
            // Быстрые действия
            Button("📊 Статус мониторинга") {
                showMonitoringStatus()
            }
            
            Button("🔄 Ротация токенов") {
                rotateTokens()
            }
            
            Button("🚨 Тест восстановления") {
                testRecovery()
            }
            
            Divider()
            
            Button("⚙️ Настройки") {
                openSettings()
            }
            
            Button("❌ Выход") {
                NSApplication.shared.terminate(nil)
            }
        }
        .padding()
        .frame(width: 250)
    }
    
    private func showMonitoringStatus() {
        // Показать статус мониторинга
    }
    
    private func rotateTokens() {
        Task {
            await securityManager.rotateTokens()
        }
    }
    
    private func testRecovery() {
        Task {
            await securityManager.testRecovery()
        }
    }
    
    private func openSettings() {
        // Открыть настройки
    }
}

// MARK: - Content View

struct ContentView: View {
    @EnvironmentObject var securityManager: SecurityManager
    @EnvironmentObject var monitoringService: MonitoringService
    @EnvironmentObject var tokenRotationService: TokenRotationService
    @EnvironmentObject var recoveryService: RecoveryService
    
    @State private var selectedTab = 0
    
    var body: some View {
        NavigationSplitView {
            // Боковая панель
            SidebarView(selectedTab: $selectedTab)
                .navigationSplitViewColumnWidth(min: 200, ideal: 250, max: 300)
        } detail: {
            // Основной контент
            TabView(selection: $selectedTab) {
                MonitoringView()
                    .tabItem {
                        Label("Мониторинг", systemImage: "chart.line.uptrend.xyaxis")
                    }
                    .tag(0)
                
                TokenRotationView()
                    .tabItem {
                        Label("Токены", systemImage: "key.rotational")
                    }
                    .tag(1)
                
                RecoveryView()
                    .tabItem {
                        Label("Восстановление", systemImage: "arrow.clockwise")
                    }
                    .tag(2)
                
                SettingsView()
                    .tabItem {
                        Label("Настройки", systemImage: "gear")
                    }
                    .tag(3)
            }
        }
        .navigationTitle("Vote Security System")
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Button(action: {
                    Task {
                        await securityManager.emergencyRecovery()
                    }
                }) {
                    Image(systemName: "exclamationmark.triangle.fill")
                        .foregroundColor(.red)
                }
                .help("Экстренное восстановление")
            }
        }
    }
}

// MARK: - Sidebar View

struct SidebarView: View {
    @Binding var selectedTab: Int
    
    var body: some View {
        List(selection: $selectedTab) {
            Section("Основные") {
                Label("Мониторинг", systemImage: "chart.line.uptrend.xyaxis")
                    .tag(0)
                
                Label("Токены", systemImage: "key.rotational")
                    .tag(1)
                
                Label("Восстановление", systemImage: "arrow.clockwise")
                    .tag(2)
            }
            
            Section("Управление") {
                Label("Настройки", systemImage: "gear")
                    .tag(3)
                
                Label("Логи", systemImage: "doc.text")
                    .tag(4)
                
                Label("Отчеты", systemImage: "chart.bar.doc.horizontal")
                    .tag(5)
            }
        }
        .listStyle(SidebarListStyle())
    }
}

// MARK: - Monitoring View

struct MonitoringView: View {
    @EnvironmentObject var monitoringService: MonitoringService
    
    var body: some View {
        VStack {
            Text("Мониторинг системы")
                .font(.largeTitle)
                .padding()
            
            // Статус сервисов
            LazyVGrid(columns: Array(repeating: GridItem(.flexible()), count: 2)) {
                ForEach(monitoringService.services, id: \.name) { service in
                    ServiceStatusCard(service: service)
                }
            }
            .padding()
            
            Spacer()
        }
    }
}

// MARK: - Token Rotation View

struct TokenRotationView: View {
    @EnvironmentObject var tokenRotationService: TokenRotationService
    
    var body: some View {
        VStack {
            Text("Ротация токенов")
                .font(.largeTitle)
                .padding()
            
            // Список токенов
            List(tokenRotationService.tokens, id: \.name) { token in
                TokenRow(token: token)
            }
            
            Spacer()
        }
    }
}

// MARK: - Recovery View

struct RecoveryView: View {
    @EnvironmentObject var recoveryService: RecoveryService
    
    var body: some View {
        VStack {
            Text("Восстановление")
                .font(.largeTitle)
                .padding()
            
            // История восстановлений
            List(recoveryService.recoveryHistory, id: \.id) { recovery in
                RecoveryRow(recovery: recovery)
            }
            
            Spacer()
        }
    }
}

// MARK: - Settings View

struct SettingsView: View {
    @EnvironmentObject var securityManager: SecurityManager
    
    var body: some View {
        VStack {
            Text("Настройки")
                .font(.largeTitle)
                .padding()
            
            Form {
                Section("Telegram") {
                    TextField("Bot Token", text: .constant(""))
                    TextField("Chat ID", text: .constant(""))
                }
                
                Section("Провайдеры") {
                    TextField("Vercel API Key", text: .constant(""))
                    TextField("AWS Access Key", text: .constant(""))
                }
            }
            .padding()
            
            Spacer()
        }
    }
}

// MARK: - Supporting Views

struct ServiceStatusCard: View {
    let service: MonitoringService.Service
    
    var body: some View {
        VStack(alignment: .leading) {
            HStack {
                Image(systemName: service.isHealthy ? "checkmark.circle.fill" : "xmark.circle.fill")
                    .foregroundColor(service.isHealthy ? .green : .red)
                Text(service.name)
                    .font(.headline)
                Spacer()
            }
            
            Text(service.status)
                .font(.caption)
                .foregroundColor(.secondary)
            
            Text("Последняя проверка: \(service.lastCheck, style: .relative)")
                .font(.caption2)
                .foregroundColor(.secondary)
        }
        .padding()
        .background(Color(NSColor.controlBackgroundColor))
        .cornerRadius(8)
    }
}

struct TokenRow: View {
    let token: TokenRotationService.Token
    
    var body: some View {
        HStack {
            VStack(alignment: .leading) {
                Text(token.name)
                    .font(.headline)
                Text("Обновлен: \(token.lastUpdated, style: .relative)")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            
            Spacer()
            
            Button("Обновить") {
                // Обновить токен
            }
            .buttonStyle(.bordered)
        }
    }
}

struct RecoveryRow: View {
    let recovery: RecoveryService.Recovery
    
    var body: some View {
        VStack(alignment: .leading) {
            HStack {
                Text("Восстановление #\(recovery.id)")
                    .font(.headline)
                Spacer()
                Text(recovery.timestamp, style: .relative)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            
            Text(recovery.reason)
                .font(.body)
            
            if let newDomains = recovery.newDomains {
                Text("Новые домены: \(newDomains.joined(separator: ", "))")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
    }
}
