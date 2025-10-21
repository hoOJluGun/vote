// swift-tools-version: 5.9
// The swift-tools-version declares the minimum version of Swift required to build this package.

import PackageDescription

let package = Package(
    name: "VoteSecuritySystem",
    platforms: [
        .macOS(.v14), // macOS Sequoia 14.0+
        .iOS(.v17),   // iOS 17.0+
        .watchOS(.v10), // watchOS 10.0+
        .tvOS(.v17)   // tvOS 17.0+
    ],
    products: [
        // Основное приложение для macOS
        .executable(
            name: "VoteSecurityApp",
            targets: ["VoteSecurityApp"]
        ),
        // Библиотека для интеграции в другие приложения
        .library(
            name: "VoteSecurityCore",
            targets: ["VoteSecurityCore"]
        ),
        // CLI инструмент для управления
        .executable(
            name: "VoteSecurityCLI",
            targets: ["VoteSecurityCLI"]
        ),
        // iOS приложение для мониторинга
        .library(
            name: "VoteSecurityiOS",
            targets: ["VoteSecurityiOS"]
        )
    ],
    dependencies: [
        // HTTP клиент для API запросов
        .package(url: "https://github.com/swift-server/async-http-client.git", from: "1.19.0"),
        // JSON обработка
        .package(url: "https://github.com/apple/swift-log.git", from: "1.5.0"),
        // Криптография
        .package(url: "https://github.com/apple/swift-crypto.git", from: "3.0.0"),
        // WebSocket для real-time уведомлений
        .package(url: "https://github.com/vapor/websocket-kit.git", from: "2.6.0"),
        // SQLite для локального хранения
        .package(url: "https://github.com/stephencelis/SQLite.swift.git", from: "0.14.0"),
        // Network framework для мониторинга
        .package(url: "https://github.com/apple/swift-nio.git", from: "2.60.0"),
        // Combine для реактивного программирования
        .package(url: "https://github.com/apple/swift-collections.git", from: "1.0.0")
    ],
    targets: [
        // Основное приложение для macOS
        .executableTarget(
            name: "VoteSecurityApp",
            dependencies: [
                "VoteSecurityCore",
                "VoteSecurityUI",
                .product(name: "AsyncHTTPClient", package: "async-http-client"),
                .product(name: "Logging", package: "swift-log"),
                .product(name: "Crypto", package: "swift-crypto")
            ],
            path: "Sources/VoteSecurityApp",
            resources: [
                .process("Resources")
            ]
        ),
        
        // CLI инструмент
        .executableTarget(
            name: "VoteSecurityCLI",
            dependencies: [
                "VoteSecurityCore",
                .product(name: "AsyncHTTPClient", package: "async-http-client"),
                .product(name: "Logging", package: "swift-log")
            ],
            path: "Sources/VoteSecurityCLI"
        ),
        
        // Основная библиотека
        .target(
            name: "VoteSecurityCore",
            dependencies: [
                .product(name: "AsyncHTTPClient", package: "async-http-client"),
                .product(name: "Logging", package: "swift-log"),
                .product(name: "Crypto", package: "swift-crypto"),
                .product(name: "WebSocketKit", package: "websocket-kit"),
                .product(name: "SQLite", package: "SQLite.swift"),
                .product(name: "NIO", package: "swift-nio"),
                .product(name: "Collections", package: "swift-collections")
            ],
            path: "Sources/VoteSecurityCore",
            resources: [
                .process("Resources")
            ]
        ),
        
        // UI компоненты для macOS
        .target(
            name: "VoteSecurityUI",
            dependencies: [
                "VoteSecurityCore"
            ],
            path: "Sources/VoteSecurityUI",
            resources: [
                .process("Resources")
            ]
        ),
        
        // iOS библиотека
        .target(
            name: "VoteSecurityiOS",
            dependencies: [
                "VoteSecurityCore"
            ],
            path: "Sources/VoteSecurityiOS",
            resources: [
                .process("Resources")
            ]
        ),
        
        // Тесты
        .testTarget(
            name: "VoteSecurityTests",
            dependencies: [
                "VoteSecurityCore",
                "VoteSecurityApp",
                .product(name: "AsyncHTTPClient", package: "async-http-client")
            ],
            path: "Tests/VoteSecurityTests"
        )
    ]
)
