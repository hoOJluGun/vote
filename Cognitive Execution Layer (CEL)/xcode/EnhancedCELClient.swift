/**
 * Enhanced Xcode Integration with Advanced Features
 * Provides seamless integration between CEL and Xcode with enhanced capabilities
 */

import Foundation
import Combine
import SwiftUI

/// Enhanced CEL Client with advanced features
public class EnhancedCELClient: NSObject, ObservableObject {
    
    // MARK: - Properties
    
    private let baseURL: URL
    private let session: URLSession
    private let encoder = JSONEncoder()
    private let decoder = JSONDecoder()
    
    /// Shared instance
    public static let shared = EnhancedCELClient()
    
    /// Default server URL
    private static let defaultBaseURL = URL(string: "http://localhost:3000")!
    
    /// Published properties for SwiftUI integration
    @Published public var isConnected = false
    @Published public var serverStatus: ServerStatus?
    @Published public var availableModels: [AIModel] = []
    @Published public var recentProjects: [Project] = []
    
    /// Advanced features
    private var webSocketTask: URLSessionWebSocketTask?
    private var cancellables = Set<AnyCancellable>()
    private var requestCache: [String: CachedResponse] = [:]
    private var performanceMetrics: [String: PerformanceMetric] = [:]
    
    // MARK: - Initialization
    
    public init(baseURL: URL = defaultBaseURL) {
        self.baseURL = baseURL
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 60
        config.timeoutIntervalForResource = 300
        config.waitsForConnectivity = true
        
        self.session = URLSession(configuration: config)
        super.init()
        
        setupWebSocketConnection()
        startPeriodicHealthCheck()
    }
    
    // MARK: - Enhanced Connection Management
    
    /// Establish WebSocket connection for real-time updates
    private func setupWebSocketConnection() {
        let wsURL = baseURL.appending(path: "/ws")
        webSocketTask = session.webSocketTask(with: wsURL)
        webSocketTask?.resume()
        
        receiveWebSocketMessage()
    }
    
    /// Receive WebSocket messages
    private func receiveWebSocketMessage() {
        webSocketTask?.receive { [weak self] result in
            switch result {
            case .success(let message):
                self?.handleWebSocketMessage(message)
                self?.receiveWebSocketMessage() // Continue receiving
            case .failure(let error):
                print("WebSocket receive error: \(error)")
                DispatchQueue.main.asyncAfter(deadline: .now() + 5) {
                    self?.receiveWebSocketMessage()
                }
            }
        }
    }
    
    /// Handle WebSocket messages
    private func handleWebSocketMessage(_ message: URLSessionWebSocketTask.Message) {
        switch message {
        case .string(let text):
            if let data = text.data(using: .utf8),
               let event = try? JSONDecoder().decode(ServerEvent.self, from: data) {
                handleServerEvent(event)
            }
        case .data(let data):
            // Handle binary data if needed
            break
        @unknown default:
            break
        }
    }
    
    /// Handle server events
    private func handleServerEvent(_ event: ServerEvent) {
        DispatchQueue.main.async {
            switch event.type {
            case "status_update":
                if let statusData = event.data,
                   let status = try? JSONDecoder().decode(ServerStatus.self, from: statusData) {
                    self.serverStatus = status
                }
            case "model_update":
                if let modelsData = event.data,
                   let models = try? JSONDecoder().decode([AIModel].self, from: modelsData) {
                    self.availableModels = models
                }
            default:
                break
            }
        }
    }
    
    /// Start periodic health checks
    private func startPeriodicHealthCheck() {
        Timer.publish(every: 30, on: .main, in: .common)
            .autoconnect()
            .sink { [weak self] _ in
                self?.checkServerHealth()
            }
            .store(in: &cancellables)
    }
    
    /// Check server health
    public func checkServerHealth() async -> Bool {
        do {
            let response = try await performRequest(
                endpoint: "/health",
                method: "GET"
            )
            
            if let status = try? JSONDecoder().decode(ServerStatus.self, from: response) {
                DispatchQueue.main.async {
                    self.serverStatus = status
                    self.isConnected = status.status == "healthy"
                }
                return status.status == "healthy"
            }
        } catch {
            DispatchQueue.main.async {
                self.isConnected = false
                self.serverStatus = nil
            }
        }
        
        return false
    }
    
    // MARK: - Enhanced AI Interactions
    
    /// Send intent with advanced context and streaming
    public func sendIntent(
        _ intent: String,
        context: [String: Any],
        streaming: Bool = false,
        model: String? = nil
    ) async throws -> AIResponse {
        
        let cacheKey = generateCacheKey(intent: intent, context: context)
        
        // Check cache first
        if let cached = requestCache[cacheKey],
           !cached.isExpired {
            return cached.response
        }
        
        let requestBody = EnhancedChatCompletionRequest(
            model: model ?? "auto",
            messages: buildMessages(intent: intent, context: context),
            temperature: 0.2,
            stream: streaming,
            maxTokens: 4096,
            context: context
        )
        
        let startTime = Date()
        
        if streaming {
            return try await handleStreamingResponse(requestBody, startTime: startTime)
        } else {
            let response = try await performChatCompletion(requestBody)
            
            // Cache the response
            let cachedResponse = CachedResponse(
                response: response,
                timestamp: Date(),
                ttl: 3600 // 1 hour
            )
            requestCache[cacheKey] = cachedResponse
            
            // Record performance metrics
            let duration = Date().timeIntervalSince(startTime)
            recordPerformanceMetric(for: intent, duration: duration)
            
            return response
        }
    }
    
    /// Handle streaming response
    private func handleStreamingResponse(
        _ request: EnhancedChatCompletionRequest,
        startTime: Date
    ) async throws -> AIResponse {
        
        guard let url = URL(string: "/v1/chat/completions", relativeTo: baseURL) else {
            throw CELClientError.invalidURL
        }
        
        var urlRequest = URLRequest(url: url)
        urlRequest.httpMethod = "POST"
        urlRequest.setValue("application/json", forHTTPHeaderField: "Content-Type")
        urlRequest.httpBody = try encoder.encode(request)
        
        let (asyncBytes, response) = try await session.bytes(for: urlRequest)
        
        guard let httpResponse = response as? HTTPURLResponse,
              200...299 ~= httpResponse.statusCode else {
            throw CELClientError.serverError(statusCode: (response as? HTTPURLResponse)?.statusCode ?? 0)
        }
        
        var accumulatedContent = ""
        var metadata: [String: Any] = [:]
        
        for try await line in asyncBytes.lines {
            if line.hasPrefix("data: ") {
                let jsonString = String(line.dropFirst(6))
                
                if jsonString == "[DONE]" {
                    break
                }
                
                if let data = jsonString.data(using: .utf8),
                   let chunk = try? JSONDecoder().decode(StreamingChunk.self, from: data) {
                    
                    accumulatedContent += chunk.choices.first?.delta.content ?? ""
                    
                    // Update metadata
                    if let model = chunk.model {
                        metadata["model"] = model
                    }
                    if let usage = chunk.usage {
                        metadata["usage"] = usage
                    }
                }
            }
        }
        
        let duration = Date().timeIntervalSince(startTime)
        recordPerformanceMetric(for: "streaming_request", duration: duration)
        
        return AIResponse(
            content: accumulatedContent,
            metadata: metadata,
            timestamp: Date(),
            streaming: true
        )
    }
    
    /// Perform chat completion
    private func performChatCompletion(_ request: EnhancedChatCompletionRequest) async throws -> AIResponse {
        guard let url = URL(string: "/v1/chat/completions", relativeTo: baseURL) else {
            throw CELClientError.invalidURL
        }
        
        var urlRequest = URLRequest(url: url)
        urlRequest.httpMethod = "POST"
        urlRequest.setValue("application/json", forHTTPHeaderField: "Content-Type")
        urlRequest.httpBody = try encoder.encode(request)
        
        let (data, response) = try await session.data(for: urlRequest)
        
        guard let httpResponse = response as? HTTPURLResponse,
              200...299 ~= httpResponse.statusCode else {
            throw CELClientError.serverError(statusCode: httpResponse.statusCode)
        }
        
        let chatResponse = try decoder.decode(ChatCompletionResponse.self, from: data)
        let choice = chatResponse.choices.first
        
        return AIResponse(
            content: choice?.message.content ?? "",
            metadata: [
                "model": chatResponse.model,
                "usage": chatResponse.usage as Any,
                "finishReason": choice?.finishReason as Any
            ],
            timestamp: Date(),
            streaming: false
        )
    }
    
    // MARK: - Advanced Project Analysis
    
    /// Analyze project with comprehensive context
    public func analyzeProject(at url: URL) async throws -> ProjectAnalysis {
        let startTime = Date()
        
        let analysis = try await performRequest(
            endpoint: "/v1/analyze-project",
            method: "POST",
            body: [
                "projectPath": url.path,
                "includeDependencies": true,
                "includeMetrics": true,
                "deepAnalysis": true
            ]
        )
        
        let projectAnalysis = try decoder.decode(ProjectAnalysis.self, from: analysis)
        
        // Cache project info
        let project = Project(
            name: projectAnalysis.name,
            path: url.path,
            lastAnalyzed: Date(),
            metrics: projectAnalysis.metrics
        )
        
        DispatchQueue.main.async {
            if let index = self.recentProjects.firstIndex(where: { $0.path == url.path }) {
                self.recentProjects[index] = project
            } else {
                self.recentProjects.append(project)
            }
        }
        
        return projectAnalysis
    }
    
    /// Generate code with advanced templates
    public func generateCode(
        requirement: String,
        language: String,
        template: String? = nil,
        context: [String: Any] = [:]
    ) async throws -> CodeGenerationResult {
        
        let requestBody = [
            "requirement": requirement,
            "language": language,
            "template": template as Any,
            "context": context,
            "includeTests": true,
            "includeDocumentation": true
        ] as [String: Any]
        
        let response = try await performRequest(
            endpoint: "/v1/generate-code",
            method: "POST",
            body: requestBody
        )
        
        return try decoder.decode(CodeGenerationResult.self, from: response)
    }
    
    /// Refactor code with AI assistance
    public func refactorCode(
        at url: URL,
        improvements: [String],
        dryRun: Bool = false
    ) async throws -> RefactoringResult {
        
        let content = try String(contentsOf: url)
        
        let requestBody = [
            "code": content,
            "filePath": url.path,
            "improvements": improvements,
            "dryRun": dryRun,
            "generateTests": true
        ] as [String: Any]
        
        let response = try await performRequest(
            endpoint: "/v1/refactor-code",
            method: "POST",
            body: requestBody
        )
        
        return try decoder.decode(RefactoringResult.self, from: response)
    }
    
    // MARK: - Performance Monitoring
    
    /// Record performance metric
    private func recordPerformanceMetric(for operation: String, duration: TimeInterval) {
        let metric = PerformanceMetric(
            operation: operation,
            duration: duration,
            timestamp: Date()
        )
        
        performanceMetrics[operation] = metric
        
        // Keep only last 100 metrics
        if performanceMetrics.count > 100 {
            let oldestKey = performanceMetrics.min { $0.value.timestamp < $1.value.timestamp }?.key
            if let key = oldestKey {
                performanceMetrics.removeValue(forKey: key)
            }
        }
    }
    
    /// Get performance metrics
    public func getPerformanceMetrics() -> [PerformanceMetric] {
        return Array(performanceMetrics.values).sorted { $0.timestamp > $1.timestamp }
    }
    
    // MARK: - Utility Methods
    
    /// Build messages for chat completion
    private func buildMessages(intent: String, context: [String: Any]) -> [ChatMessage] {
        var messages: [ChatMessage] = []
        
        // System message
        messages.append(ChatMessage(
            role: "system",
            content: """
            You are an expert iOS/macOS development assistant integrated with Xcode.
            Provide clean, efficient Swift/Objective-C code solutions.
            Consider the project context provided and follow best practices.
            """
        ))
        
        // Context messages if available
        if let projectContext = context["projectContext"] as? [String: Any] {
            messages.append(ChatMessage(
                role: "system",
                content: "Project Context: \(projectContext)"
            ))
        }
        
        // User message
        messages.append(ChatMessage(
            role: "user",
            content: """
            \(intent)
            
            Additional Context:
            \(contextDescription(from: context))
            """
        ))
        
        return messages
    }
    
    /// Generate context description
    private func contextDescription(from context: [String: Any]) -> String {
        var description = ""
        
        if let fileName = context["fileName"] as? String {
            description += "Current file: \(fileName)\n"
        }
        
        if let fileType = context["fileType"] as? String {
            description += "File type: \(fileType)\n"
        }
        
        if let projectStructure = context["projectStructure"] as? [String: Any] {
            description += "Project structure available\n"
        }
        
        if let nearbyCode = context["nearbyCode"] as? String {
            description += "Nearby code context provided\n"
        }
        
        if let selectedText = context["selectedText"] as? String {
            description += "Selected text: \(selectedText)\n"
        }
        
        return description.isEmpty ? "No additional context provided." : description
    }
    
    /// Generate cache key
    private func generateCacheKey(intent: String, context: [String: Any]) -> String {
        let contextHash = String(describing: context).hash
        return "\(intent.hash)_\(contextHash)"
    }
    
    /// Perform generic request
    private func performRequest(
        endpoint: String,
        method: String,
        body: [String: Any]? = nil
    ) async throws -> Data {
        
        guard let url = URL(string: endpoint, relativeTo: baseURL) else {
            throw CELClientError.invalidURL
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        if let body = body {
            request.httpBody = try JSONSerialization.data(withJSONObject: body)
        }
        
        let (data, response) = try await session.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse,
              200...299 ~= httpResponse.statusCode else {
                throw CELClientError.serverError(statusCode: httpResponse.statusCode)
        }
        
        return data
    }
}

// MARK: - Supporting Types

/// Enhanced chat completion request
private struct EnhancedChatCompletionRequest: Codable {
    let model: String
    let messages: [ChatMessage]
    let temperature: Double
    let stream: Bool
    let maxTokens: Int
    let context: [String: Any]
    
    enum CodingKeys: String, CodingKey {
        case model, messages, temperature, stream, maxTokens
        case context = "context"
    }
    
    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(model, forKey: .model)
        try container.encode(messages, forKey: .messages)
        try container.encode(temperature, forKey: .temperature)
        try container.encode(stream, forKey: .stream)
        try container.encode(maxTokens, forKey: .maxTokens)
        
        // Encode context separately
        let contextData = try JSONSerialization.data(withJSONObject: context)
        let contextString = String(data: contextData, encoding: .utf8) ?? ""
        try container.encode(contextString, forKey: .context)
    }
}

/// AI Response
public struct AIResponse: Codable {
    public let content: String
    public let metadata: [String: Any]
    public let timestamp: Date
    public let streaming: Bool
    
    enum CodingKeys: String, CodingKey {
        case content, timestamp, streaming
        case metadata = "metadata"
    }
    
    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        content = try container.decode(String.self, forKey: .content)
        timestamp = try container.decode(Date.self, forKey: .timestamp)
        streaming = try container.decode(Bool.self, forKey: .streaming)
        
        // Decode metadata
        let metadataString = try container.decode(String.self, forKey: .metadata)
        if let data = metadataString.data(using: .utf8),
           let dict = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
            metadata = dict
        } else {
            metadata = [:]
        }
    }
    
    public init(content: String, metadata: [String: Any], timestamp: Date, streaming: Bool) {
        self.content = content
        self.metadata = metadata
        self.timestamp = timestamp
        self.streaming = streaming
    }
}

/// Server status
public struct ServerStatus: Codable {
    public let status: String
    public let version: String
    public let uptime: TimeInterval
    public let memory: MemoryUsage
    public let components: [String: String]
}

/// Memory usage
public struct MemoryUsage: Codable {
    public let heapUsed: Int64
    public let heapTotal: Int64
    public let external: Int64
    public let rss: Int64
}

/// AI Model
public struct AIModel: Codable, Identifiable {
    public let id: String
    public let name: String
    public let provider: String
    public let capabilities: [String]
    public let pricing: ModelPricing?
}

/// Model pricing
public struct ModelPricing: Codable {
    public let inputTokens: Double
    public let outputTokens: Double
    public let currency: String
}

/// Project
public struct Project: Codable, Identifiable {
    public let id = UUID()
    public let name: String
    public let path: String
    public let lastAnalyzed: Date
    public let metrics: ProjectMetrics
}

/// Project metrics
public struct ProjectMetrics: Codable {
    public let totalFiles: Int
    public let totalLines: Int
    public let languages: [String]
    public let dependencies: [String]
    public let complexity: Double
}

/// Project analysis
public struct ProjectAnalysis: Codable {
    public let name: String
    public let structure: ProjectStructure
    public let dependencies: [Dependency]
    public let metrics: ProjectMetrics
    public let recommendations: [Recommendation]
}

/// Project structure
public struct ProjectStructure: Codable {
    public let directories: [Directory]
    public let files: [FileInfo]
}

/// Directory info
public struct Directory: Codable {
    public let name: String
    public let path: String
    public let fileCount: Int
}

/// File info
public struct FileInfo: Codable {
    public let name: String
    public let path: String
    public let size: Int64
    public let language: String
    public let lines: Int
}

/// Dependency
public struct Dependency: Codable {
    public let name: String
    public let version: String
    public let type: String
}

/// Recommendation
public struct Recommendation: Codable {
    public let type: String
    public let description: String
    public let priority: String
    public let impact: String
}

/// Code generation result
public struct CodeGenerationResult: Codable {
    public let code: String
    public let tests: String?
    public let documentation: String?
    public let explanation: String
    public let language: String
    public let confidence: Double
}

/// Refactoring result
public struct RefactoringResult: Codable {
    public let originalCode: String
    public let refactoredCode: String
    public let changes: [CodeChange]
    public let improvements: [String]
    public let tests: String?
    public let dryRun: Bool
}

/// Code change
public struct CodeChange: Codable {
    public let type: String
    public let description: String
    public let line: Int?
    public let impact: String
}

/// Performance metric
public struct PerformanceMetric: Codable {
    public let operation: String
    public let duration: TimeInterval
    public let timestamp: Date
}

/// Cached response
private struct CachedResponse {
    let response: AIResponse
    let timestamp: Date
    let ttl: TimeInterval
    
    var isExpired: Bool {
        Date().timeIntervalSince(timestamp) > ttl
    }
}

/// Server event
private struct ServerEvent: Codable {
    let type: String
    let data: Data?
    let timestamp: Date
}

/// Streaming chunk
private struct StreamingChunk: Codable {
    let id: String
    let object: String
    let created: Int
    let model: String
    let choices: [StreamingChoice]
    let usage: Usage?
}

/// Streaming choice
private struct StreamingChoice: Codable {
    let index: Int
    let delta: StreamingDelta
    let finishReason: String?
}

/// Streaming delta
private struct StreamingDelta: Codable {
    let role: String?
    let content: String
}

/// Usage
private struct Usage: Codable {
    let promptTokens: Int
    let completionTokens: Int
    let totalTokens: Int
}

/// Enhanced error types
public enum EnhancedCELClientError: Error, LocalizedError {
    case invalidURL
    case serverError(statusCode: Int)
    case decodingError(Error)
    case networkError(Error)
    case timeout
    case invalidResponse
    
    public var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "Invalid URL"
        case .serverError(let statusCode):
            return "Server error with status code: \(statusCode)"
        case .decodingError(let error):
            return "Decoding error: \(error.localizedDescription)"
        case .networkError(let error):
            return "Network error: \(error.localizedDescription)"
        case .timeout:
            return "Request timed out"
        case .invalidResponse:
            return "Invalid server response"
        }
    }
}

// MARK: - SwiftUI Integration

/// SwiftUI view for CEL integration
public struct CELIntegrationView: View {
    @StateObject private var celClient = EnhancedCELClient.shared
    @State private var userInput = ""
    @State private var aiResponse = ""
    @State private var isProcessing = false
    
    public var body: some View {
        VStack(spacing: 20) {
            // Header
            HStack {
                Image(systemName: "brain.head.profile")
                    .foregroundColor(.blue)
                Text("CEL Integration")
                    .font(.headline)
                Spacer()
                StatusIndicator(isConnected: celClient.isConnected)
            }
            
            // Connection status
            if let status = celClient.serverStatus {
                ConnectionStatusView(status: status)
            }
            
            // Input area
            VStack(alignment: .leading) {
                Text("Ask CEL Assistant:")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                
                TextEditor(text: $userInput)
                    .frame(minHeight: 100)
                    .padding(8)
                    .background(Color(.systemGray6))
                    .cornerRadius(8)
            }
            
            // Process button
            Button(action: processRequest) {
                HStack {
                    if isProcessing {
                        ProgressView()
                            .scaleEffect(0.8)
                    }
                    Text(isProcessing ? "Processing..." : "Send to CEL")
                }
            }
            .disabled(userInput.isEmpty || isProcessing)
            .buttonStyle(.borderedProminent)
            
            // Response area
            if !aiResponse.isEmpty {
                VStack(alignment: .leading) {
                    Text("CEL Response:")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                    
                    ScrollView {
                        Text(aiResponse)
                            .padding(8)
                            .background(Color(.systemGray6))
                            .cornerRadius(8)
                    }
                    .frame(maxHeight: 200)
                }
            }
            
            Spacer()
        }
        .padding()
    }
    
    private func processRequest() {
        isProcessing = true
        
        Task {
            do {
                let response = try await celClient.sendIntent(
                    userInput,
                    context: [:]
                )
                
                await MainActor.run {
                    aiResponse = response.content
                    isProcessing = false
                }
            } catch {
                await MainActor.run {
                    aiResponse = "Error: \(error.localizedDescription)"
                    isProcessing = false
                }
            }
        }
    }
}

/// Status indicator view
private struct StatusIndicator: View {
    let isConnected: Bool
    
    var body: some View {
        Circle()
            .fill(isConnected ? Color.green : Color.red)
            .frame(width: 10, height: 10)
            .overlay(
                Circle()
                    .stroke(Color.white, lineWidth: 2)
            )
    }
}

/// Connection status view
private struct ConnectionStatusView: View {
    let status: ServerStatus
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text("Server Status:")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                Text(status.status.capitalized)
                    .font(.subheadline)
                    .foregroundColor(status.status == "healthy" ? .green : .red)
            }
            
            Text("Version: \(status.version)")
                .font(.caption)
                .foregroundColor(.secondary)
            
            Text("Uptime: \(formatDuration(status.uptime))")
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(8)
    }
    
    private func formatDuration(_ duration: TimeInterval) -> String {
        let formatter = DateComponentsFormatter()
        formatter.allowedUnits = [.hour, .minute, .second]
        formatter.unitsStyle = .abbreviated
        return formatter.string(from: duration) ?? ""
    }
}
