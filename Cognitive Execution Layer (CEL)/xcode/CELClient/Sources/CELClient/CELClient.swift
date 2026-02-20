// CELClient.swift
// Cognitive Execution Layer Client for Xcode Integration
// Version: 1.0.0

import Foundation
import Combine

// MARK: - Error Types

/// CEL Client errors
public enum CELError: Error, LocalizedError {
    case invalidURL
    case invalidResponse
    case apiError(String)
    case networkError(Error)
    case decodingError(Error)
    case timeout
    case unauthorized
    case rateLimited(retryAfter: Int?)
    
    public var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "Invalid URL"
        case .invalidResponse:
            return "Invalid response from server"
        case .apiError(let message):
            return message
        case .networkError(let error):
            return "Network error: \(error.localizedDescription)"
        case .decodingError(let error):
            return "Failed to decode response: \(error.localizedDescription)"
        case .timeout:
            return "Request timed out"
        case .unauthorized:
            return "Unauthorized - check API key"
        case .rateLimited(let retryAfter):
            if let seconds = retryAfter {
                return "Rate limited - retry after \(seconds) seconds"
            }
            return "Rate limited - please wait before retrying"
        }
    }
}

// MARK: - Models

/// Message in a conversation
public struct Message: Codable, Equatable {
    public let role: String
    public let content: String
    
    public init(role: String, content: String) {
        self.role = role
        self.content = content
    }
    
    public static func system(_ content: String) -> Message {
        Message(role: "system", content: content)
    }
    
    public static func user(_ content: String) -> Message {
        Message(role: "user", content: content)
    }
    
    public static func assistant(_ content: String) -> Message {
        Message(role: "assistant", content: content)
    }
}

/// Token usage information
public struct Usage: Codable {
    public let promptTokens: Int
    public let completionTokens: Int
    public let totalTokens: Int
    
    enum CodingKeys: String, CodingKey {
        case promptTokens = "prompt_tokens"
        case completionTokens = "completion_tokens"
        case totalTokens = "total_tokens"
    }
}

/// Choice in a completion response
public struct Choice: Codable {
    public let index: Int
    public let message: Message
    public let finishReason: String?
    
    enum CodingKeys: String, CodingKey {
        case index, message
        case finishReason = "finish_reason"
    }
}

/// Completion response
public struct CompletionResponse: Codable {
    public let id: String
    public let model: String
    public let choices: [Choice]
    public let usage: Usage?
    public let latency: Int?
    public let provider: String?
    
    /// Get the content from the first choice
    public var content: String? {
        choices.first?.message.content
    }
}

/// Stream chunk for streaming responses
public struct StreamChunk: Codable {
    public let id: String
    public let model: String?
    public let choices: [StreamChoice]
}

/// Choice in a stream chunk
public struct StreamChoice: Codable {
    public let index: Int
    public let delta: Delta
    public let finishReason: String?
    
    enum CodingKeys: String, CodingKey {
        case index, delta
        case finishReason = "finish_reason"
    }
}

/// Delta content in a stream chunk
public struct Delta: Codable {
    public let role: String?
    public let content: String?
}

/// Model information
public struct ModelInfo: Codable, Identifiable {
    public let id: String
    public let name: String?
    public let ownedBy: String?
    public let contextLength: Int?
    
    enum CodingKeys: String, CodingKey {
        case id, name
        case ownedBy = "owned_by"
        case contextLength = "context_length"
    }
}

/// Health check response
public struct HealthResponse: Codable {
    public let status: String
    public let usage: UsageStats?
    public let activeModels: [String]?
}

/// Usage statistics
public struct UsageStats: Codable {
    public let totalRequests: Int
    public let totalTokensUsed: Int
    public let avgResponseTime: Double?
}

// MARK: - CEL Client

/// CEL API Client for Xcode integration
@MainActor
public class CELClient: ObservableObject {
    
    // MARK: - Properties
    
    private let baseURL: URL
    private let apiKey: String?
    private let session: URLSession
    private let decoder: JSONDecoder
    
    @Published public var isConnected: Bool = false
    @Published public var lastError: Error?
    @Published public var availableModels: [ModelInfo] = []
    
    // MARK: - Initialization
    
    public init(baseURL: URL, apiKey: String? = nil, timeout: TimeInterval = 60) {
        self.baseURL = baseURL
        self.apiKey = apiKey
        
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = timeout
        config.timeoutIntervalForResource = timeout * 5
        config.httpMaximumConnectionsPerHost = 10
        self.session = URLSession(configuration: config)
        
        self.decoder = JSONDecoder()
        
        // Check connection on init
        Task {
            await checkConnection()
        }
    }
    
    /// Create client with default localhost configuration
    public convenience init(port: Int = 3000, apiKey: String? = nil) {
        self.init(
            baseURL: URL(string: "http://127.0.0.1:\(port)")!,
            apiKey: apiKey
        )
    }
    
    // MARK: - Connection
    
    /// Check connection to CEL server
    public func checkConnection() async {
        do {
            let health = try await healthCheck()
            await MainActor.run {
                self.isConnected = health.status == "ok"
            }
        } catch {
            await MainActor.run {
                self.isConnected = false
                self.lastError = error
            }
        }
    }
    
    // MARK: - Chat Completions
    
    /// Execute a completion request
    public func complete(
        messages: [Message],
        model: String? = nil,
        temperature: Double = 0.7,
        maxTokens: Int = 1024
    ) async throws -> CompletionResponse {
        var request = URLRequest(url: baseURL.appendingPathComponent("v1/chat/completions"))
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        if let apiKey = apiKey {
            request.setValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")
        }
        
        let body: [String: Any] = [
            "messages": messages.map { ["role": $0.role, "content": $0.content] },
            "model": model ?? "auto",
            "temperature": temperature,
            "max_tokens": maxTokens,
            "stream": false
        ]
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        
        let (data, response) = try await session.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw CELError.invalidResponse
        }
        
        switch httpResponse.statusCode {
        case 200:
            return try decoder.decode(CompletionResponse.self, from: data)
        case 401:
            throw CELError.unauthorized
        case 429:
            let retryAfter = httpResponse.value(forHTTPHeaderField: "Retry-After")
                .flatMap { Int($0) }
            throw CELError.rateLimited(retryAfter: retryAfter)
        default:
            let errorData = try? JSONDecoder().decode(ErrorResponse.self, from: data)
            throw CELError.apiError(errorData?.error.message ?? "Unknown error (\(httpResponse.statusCode))")
        }
    }
    
    /// Execute a streaming completion request
    public func completeStream(
        messages: [Message],
        model: String? = nil,
        temperature: Double = 0.7,
        maxTokens: Int = 1024
    ) -> AsyncThrowingStream<StreamChunk, Error> {
        AsyncThrowingStream { continuation in
            Task {
                var request = URLRequest(url: baseURL.appendingPathComponent("v1/chat/completions"))
                request.httpMethod = "POST"
                request.setValue("application/json", forHTTPHeaderField: "Content-Type")
                request.setValue("text/event-stream", forHTTPHeaderField: "Accept")
                
                if let apiKey = apiKey {
                    request.setValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")
                }
                
                let body: [String: Any] = [
                    "messages": messages.map { ["role": $0.role, "content": $0.content] },
                    "model": model ?? "auto",
                    "temperature": temperature,
                    "max_tokens": maxTokens,
                    "stream": true
                ]
                request.httpBody = try JSONSerialization.data(withJSONObject: body)
                
                do {
                    let (bytes, response) = try await session.bytes(for: request)
                    
                    guard let httpResponse = response as? HTTPURLResponse,
                          httpResponse.statusCode == 200 else {
                        continuation.finish(throwing: CELError.invalidResponse)
                        return
                    }
                    
                    var buffer = ""
                    for try await byte in bytes {
                        let char = Character(UnicodeScalar(byte))
                        buffer.append(char)
                        
                        if buffer.hasSuffix("\n\n") {
                            let lines = buffer.split(separator: "\n")
                            for line in lines {
                                if line.hasPrefix("data: ") {
                                    let dataStr = String(line.dropFirst(6))
                                    if dataStr == "[DONE]" {
                                        continuation.finish()
                                        return
                                    }
                                    if let data = dataStr.data(using: .utf8),
                                       let chunk = try? JSONDecoder().decode(StreamChunk.self, from: data) {
                                        continuation.yield(chunk)
                                    }
                                }
                            }
                            buffer = ""
                        }
                    }
                    continuation.finish()
                } catch {
                    continuation.finish(throwing: error)
                }
            }
        }
    }
    
    // MARK: - Code Assist
    
    /// Get code assistance
    public func codeAssist(
        file: String,
        selection: String? = nil,
        messages: [Message]? = nil
    ) async throws -> CompletionResponse {
        var request = URLRequest(url: baseURL.appendingPathComponent("v1/code-assist"))
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        var body: [String: Any] = ["file": file]
        if let selection = selection {
            body["selection"] = selection
        }
        if let messages = messages {
            body["messages"] = messages.map { ["role": $0.role, "content": $0.content] }
        }
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        
        let (data, response) = try await session.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 200 else {
            throw CELError.invalidResponse
        }
        
        return try decoder.decode(CompletionResponse.self, from: data)
    }
    
    // MARK: - Models
    
    /// List available models
    public func listModels() async throws -> [ModelInfo] {
        var request = URLRequest(url: baseURL.appendingPathComponent("v1/models"))
        request.httpMethod = "GET"
        
        let (data, _) = try await session.data(for: request)
        
        let response = try decoder.decode(ModelsResponse.self, from: data)
        await MainActor.run {
            self.availableModels = response.data
        }
        return response.data
    }
    
    // MARK: - Health Check
    
    /// Check server health
    public func healthCheck() async throws -> HealthResponse {
        var request = URLRequest(url: baseURL.appendingPathComponent("health"))
        request.httpMethod = "GET"
        
        let (data, _) = try await session.data(for: request)
        return try decoder.decode(HealthResponse.self, from: data)
    }
    
    // MARK: - Project Context
    
    /// Get project context for a file
    public func getProjectContext(filePath: String) async throws -> [String: Any] {
        let encodedPath = filePath.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? filePath
        var request = URLRequest(url: baseURL.appendingPathComponent("v1/project-context/\(encodedPath)"))
        request.httpMethod = "GET"
        
        let (data, _) = try await session.data(for: request)
        
        guard let json = try JSONSerialization.jsonObject(with: data) as? [String: Any] else {
            throw CELError.decodingError(NSError(domain: "CEL", code: -1, userInfo: [NSLocalizedDescriptionKey: "Invalid JSON"]))
        }
        
        return json
    }
}

// MARK: - Helper Types

private struct ModelsResponse: Codable {
    let data: [ModelInfo]
}

private struct ErrorResponse: Codable {
    let error: ErrorDetail
    
    struct ErrorDetail: Codable {
        let message: String
        let type: String?
    }
}

// MARK: - Convenience Extensions

extension CELClient {
    
    /// Explain code selection
    public func explainCode(_ code: String, filePath: String) async throws -> String {
        let response = try await codeAssist(
            file: filePath,
            selection: code,
            messages: [.user("Explain this code in detail:")]
        )
        return response.content ?? "No explanation available"
    }
    
    /// Refactor code selection
    public func refactorCode(_ code: String, filePath: String) async throws -> String {
        let response = try await codeAssist(
            file: filePath,
            selection: code,
            messages: [.user("Refactor this code for better readability and performance:")]
        )
        return response.content ?? code
    }
    
    /// Add documentation to code
    public func documentCode(_ code: String, filePath: String) async throws -> String {
        let response = try await codeAssist(
            file: filePath,
            selection: code,
            messages: [.user("Add documentation comments to this code:")]
        )
        return response.content ?? code
    }
    
    /// Find bugs in code
    public func findBugs(_ code: String, filePath: String) async throws -> String {
        let response = try await codeAssist(
            file: filePath,
            selection: code,
            messages: [.user("Analyze this code for potential bugs and issues:")]
        )
        return response.content ?? "No issues found"
    }
}
