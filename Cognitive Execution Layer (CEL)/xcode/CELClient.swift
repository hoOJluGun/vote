import Foundation

/**
 * CELClient - Cognitive Execution Layer Client for Xcode
 * Provides communication interface with CEL server
 */
public class CELClient {
    private let baseURL: String
    private let session: URLSession
    
    public init(baseURL: String = "http://localhost:3000") {
        self.baseURL = baseURL
        self.session = URLSession.shared
    }
    
    /**
     * Sends a request to the CEL server for code analysis
     */
    public func analyzeCode(code: String, completion: @escaping (Result<String, Error>) -> Void) {
        guard let url = URL(string: "\(baseURL)/v1/chat/completions") else {
            completion(.failure(CELError.invalidURL))
            return
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let payload = [
            "model": "openrouter/auto",
            "messages": [
                ["role": "system", "content": "You are an expert code analyzer. Provide detailed analysis of the provided code."],
                ["role": "user", "content": "Analyze this code:\n\n\(code)"]
            ],
            "max_tokens": 1024
        ]
        
        do {
            request.httpBody = try JSONSerialization.data(withJSONObject: payload)
        } catch {
            completion(.failure(CELError.serializationError(error)))
            return
        }
        
        let task = session.dataTask(with: request) { data, response, error in
            if let error = error {
                completion(.failure(error))
                return
            }
            
            guard let data = data else {
                completion(.failure(CELError.noData))
                return
            }
            
            do {
                if let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
                   let choices = json["choices"] as? [[String: Any]],
                   let firstChoice = choices.first,
                   let message = firstChoice["message"] as? [String: Any],
                   let content = message["content"] as? String {
                    completion(.success(content))
                } else {
                    completion(.failure(CELError.responseParsingError))
                }
            } catch {
                completion(.failure(CELError.deserializationError(error)))
            }
        }
        
        task.resume()
    }
    
    /**
     * Generates code based on a description
     */
    public func generateCode(description: String, completion: @escaping (Result<String, Error>) -> Void) {
        guard let url = URL(string: "\(baseURL)/v1/code/generate") else {
            completion(.failure(CELError.invalidURL))
            return
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let payload = [
            "description": "Implement the following functionality in Swift:\n\n\(description)",
            "language": "swift"
        ]
        
        do {
            request.httpBody = try JSONSerialization.data(withJSONObject: payload)
        } catch {
            completion(.failure(CELError.serializationError(error)))
            return
        }
        
        let task = session.dataTask(with: request) { data, response, error in
            if let error = error {
                completion(.failure(error))
                return
            }
            
            guard let data = data else {
                completion(.failure(CELError.noData))
                return
            }
            
            do {
                if let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
                   let code = json["code"] as? String {
                    completion(.success(code))
                } else {
                    completion(.failure(CELError.responseParsingError))
                }
            } catch {
                completion(.failure(CELError.deserializationError(error)))
            }
        }
        
        task.resume()
    }
    
    /**
     * Refactors code to improve quality
     */
    public func refactorCode(code: String, targetImprovements: String, completion: @escaping (Result<String, Error>) -> Void) {
        guard let url = URL(string: "\(baseURL)/v1/code/refactor") else {
            completion(.failure(CELError.invalidURL))
            return
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let payload = [
            "code": code,
            "target_improvements": targetImprovements,
            "language": "swift"
        ]
        
        do {
            request.httpBody = try JSONSerialization.data(withJSONObject: payload)
        } catch {
            completion(.failure(CELError.serializationError(error)))
            return
        }
        
        let task = session.dataTask(with: request) { data, response, error in
            if let error = error {
                completion(.failure(error))
                return
            }
            
            guard let data = data else {
                completion(.failure(CELError.noData))
                return
            }
            
            do {
                if let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
                   let refactoredCode = json["refactored_code"] as? String {
                    completion(.success(refactoredCode))
                } else {
                    completion(.failure(CELError.responseParsingError))
                }
            } catch {
                completion(.failure(CELError.deserializationError(error)))
            }
        }
        
        task.resume()
    }
}

/**
 * Custom error types for CELClient
 */
public enum CELError: Error, LocalizedError {
    case invalidURL
    case noData
    case serializationError(Error)
    case deserializationError(Error)
    case responseParsingError
    
    public var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "Invalid URL"
        case .noData:
            return "No data received"
        case .serializationError(let error):
            return "Serialization error: \(error.localizedDescription)"
        case .deserializationError(let error):
            return "Deserialization error: \(error.localizedDescription)"
        case .responseParsingError:
            return "Could not parse response"
        }
    }
}
//
//  CELClient.swift
//  Cognitive Execution Layer Client for Xcode
//
//  This client enables Xcode integration with the CEL (Cognitive Execution Layer) server
//

import Foundation

/// Protocol defining the interface for CEL communication
public protocol CELClientProtocol {
    func sendIntent(_ intent: String, context: [String: Any]) async throws -> String
    func getProjectContext(fileUrl: URL) async throws -> [String: Any]
    func healthCheck() async throws -> Bool
}

/// Main client class for communicating with CEL server
public class CELClient: NSObject, CELClientProtocol {
    
    // MARK: - Properties
    
    private let baseURL: URL
    private let session: URLSession
    private let encoder = JSONEncoder()
    private let decoder = JSONDecoder()
    
    /// Shared instance of the client
    public static let shared = CELClient()
    
    /// Default server URL
    private static let defaultBaseURL = URL(string: "http://localhost:3000")!
    
    // MARK: - Initialization
    
    /// Initialize with a custom base URL
    public init(baseURL: URL = defaultBaseURL) {
        self.baseURL = baseURL
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 60
        config.timeoutIntervalForResource = 300
        self.session = URLSession(configuration: config)
        super.init()
    }
    
    // MARK: - Public Methods
    
    /// Send an intent to the CEL server and receive a response
    /// - Parameters:
    ///   - intent: The user's intent or request
    ///   - context: Additional context information about the project
    /// - Returns: Generated code or response from the server
    public func sendIntent(_ intent: String, context: [String: Any]) async throws -> String {
        guard let url = URL(string: "/v1/chat/completions", relativeTo: baseURL) else {
            throw CELClientError.invalidURL
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let requestBody = ChatCompletionRequest(
            model: "openai/gpt-4o:free",
            messages: [
                ChatMessage(role: "system", content: "You are an expert iOS/macOS developer assistant. Provide clean, efficient Swift/Objective-C code solutions. Consider the project context provided."),
                ChatMessage(role: "user", content: "\(intent)\n\nProject context:\n\(contextDescription(from: context))")
            ],
            temperature: 0.2
        )
        
        request.httpBody = try encoder.encode(requestBody)
        
        let (data, response) = try await session.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse,
              200...299 ~= httpResponse.statusCode else {
            throw CELClientError.serverError(statusCode: (response as? HTTPURLResponse)?.statusCode ?? 0)
        }
        
        let chatResponse = try decoder.decode(ChatCompletionResponse.self, from: data)
        return chatResponse.choices.first?.message.content ?? ""
    }
    
    /// Get project context for a specific file
    /// - Parameter fileUrl: The URL of the file to analyze
    /// - Returns: Context information about the project
    public func getProjectContext(fileUrl: URL) async throws -> [String: Any] {
        let filePathComponent = fileUrl.path.replacingOccurrences(of: "/", with: "%2F")
        guard let url = URL(string: "/v1/project-context/\(filePathComponent)", relativeTo: baseURL) else {
            throw CELClientError.invalidURL
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        
        let (data, response) = try await session.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse,
              200...299 ~= httpResponse.statusCode else {
            throw CELClientError.serverError(statusCode: (response as? HTTPURLResponse)?.statusCode ?? 0)
        }
        
        return try JSONSerialization.jsonObject(with: data) as? [String: Any] ?? [:]
    }
    
    /// Check if the CEL server is available
    /// - Returns: True if the server responds successfully
    public func healthCheck() async throws -> Bool {
        guard let url = URL(string: "/health", relativeTo: baseURL) else {
            throw CELClientError.invalidURL
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        
        let (_, response) = try await session.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse,
              200...299 ~= httpResponse.statusCode else {
            return false
        }
        
        return true
    }
    
    // MARK: - Private Helpers
    
    private func contextDescription(from context: [String: Any]) -> String {
        var description = ""
        
        if let fileName = context["fileName"] as? String {
            description += "Current file: \(fileName)\n"
        }
        
        if let fileType = context["fileType"] as? String {
            description += "File type: \(fileType)\n"
        }
        
        if let projectStructure = context["projectStructure"] as? [String: Any] {
            description += "Project structure: \(projectStructure)\n"
        }
        
        if let nearbyCode = context["nearbyCode"] as? String {
            description += "Nearby code:\n\(nearbyCode)\n"
        }
        
        return description.isEmpty ? "No specific context provided." : description
    }
}

// MARK: - Supporting Types

/// Error types for the CEL client
public enum CELClientError: Error, LocalizedError {
    case invalidURL
    case serverError(statusCode: Int)
    case decodingError(Error)
    
    public var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "Invalid URL"
        case .serverError(let statusCode):
            return "Server error with status code: \(statusCode)"
        case .decodingError(let error):
            return "Decoding error: \(error.localizedDescription)"
        }
    }
}

/// Request model for chat completions
private struct ChatCompletionRequest: Codable {
    let model: String
    let messages: [ChatMessage]
    let temperature: Double
    let stream: Bool?
    
    init(model: String, messages: [ChatMessage], temperature: Double, stream: Bool? = false) {
        self.model = model
        self.messages = messages
        self.temperature = temperature
        self.stream = stream
    }
}

/// Message model for chat
private struct ChatMessage: Codable {
    let role: String
    let content: String
}

/// Response model for chat completions
private struct ChatCompletionResponse: Codable {
    let id: String
    let choices: [Choice]
    
    struct Choice: Codable {
        let index: Int
        let message: ChatMessage
        let finish_reason: String
    }
}

// MARK: - Convenience Extensions

extension CELClient {
    /// Convenience method to send an intent with file context
    /// - Parameters:
    ///   - intent: The user's intent or request
    ///   - fileUrl: The URL of the current file for context
    /// - Returns: Generated code or response from the server
    public func sendIntentWithContext(_ intent: String, fileUrl: URL) async throws -> String {
        do {
            let context = try await getProjectContext(fileUrl: fileUrl)
            return try await sendIntent(intent, context: context)
        } catch {
            // If getting context fails, proceed with just the intent
            return try await sendIntent(intent, context: [:])
        }
    }
}