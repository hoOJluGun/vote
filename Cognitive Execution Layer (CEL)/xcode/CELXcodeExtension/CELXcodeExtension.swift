//
//  CELXcodeExtension.swift
//  CELXcodeExtension
//
//  Xcode Source Editor Extension for Cognitive Execution Layer
//

import Foundation
import XcodeKit
import AppKit

/// Xcode Extension for integrating with Cognitive Execution Layer
class CELXcodeExtension: NSObject, XCSourceEditorExtension {
    
    override init() {
        super.init()
        NSLog("CELXcodeExtension initialized")
    }
    
    /// Define the menu items for the extension
    func menuItemsFor(_ invocation: XCSourceEditorCommandInvocation, kind: XCCommandInvokedFrom) -> [XCMenuItem] {
        return [
            XCMenuItem(title: "Send Selection to CEL", action: #selector(handleSendSelectionToCEL)),
            XCMenuItem(title: "Generate Code with CEL", action: #selector(handleGenerateCodeWithCEL)),
            XCMenuItem(title: "Explain Selected Code", action: #selector(handleExplainCode)),
            XCMenuItem(title: "Optimize Selected Code", action: #selector(handleOptimizeCode)),
            XCMenuItem(title: "Add Documentation", action: #selector(handleAddDocumentation)),
            XCMenuItem(title: "Find Issues", action: #selector(handleFindIssues))
        ]
    }
    
    // MARK: - Command Handlers
    
    @objc func handleSendSelectionToCEL() {
        handleCommand(intent: "Analyze and improve the selected code")
    }
    
    @objc func handleGenerateCodeWithCEL() {
        handleCommand(intent: "Generate code based on my comments or requirements")
    }
    
    @objc func handleExplainCode() {
        handleCommand(intent: "Explain what the selected code does in detail")
    }
    
    @objc func handleOptimizeCode() {
        handleCommand(intent: "Optimize the selected code for performance")
    }
    
    @objc func handleAddDocumentation() {
        handleCommand(intent: "Add documentation comments to the selected code")
    }
    
    @objc func handleFindIssues() {
        handleCommand(intent: "Review the selected code and identify potential issues")
    }
    
    // MARK: - Helper Methods
    
    private func handleCommand(intent: String) {
        DispatchQueue.global(qos: .userInitiated).async {
            self.processCommand(intent: intent)
        }
    }
    
    private func processCommand(intent: String) {
        guard let selection = getCurrentSelection() else {
            showNotification(title: "No Selection", message: "Please select some code first")
            return
        }
        
        // Create context for the request
        let context = createContext(selection: selection)
        
        // Call the CEL client
        Task {
            do {
                let client = CELClient.shared
                let response = try await client.sendIntent(intent, context: context)
                
                DispatchQueue.main.async {
                    self.handleResponse(response: response, intent: intent)
                }
            } catch {
                DispatchQueue.main.async {
                    self.showNotification(
                        title: "CEL Error",
                        message: "Failed to communicate with CEL: \(error.localizedDescription)"
                    )
                }
            }
        }
    }
    
    private func getCurrentSelection() -> String? {
        // This is a simplified implementation
        // In a real extension, you would access the actual editor
        guard let sourceEditor = getSourceEditor() else { return nil }
        
        let selection = sourceEditor.selections.firstObject as? XCSourceTextRange
        
        if let selection = selection {
            var selectedText = ""
            
            for lineIndex in selection.start.line...selection.end.line {
                if lineIndex < sourceEditor.lines.count {
                    let line = sourceEditor.lines[lineIndex] as! String
                    
                    if lineIndex == selection.start.line && lineIndex == selection.end.line {
                        // Single line selection
                        let startIndex = line.index(line.startIndex, offsetBy: selection.start.column)
                        let endIndex = line.index(line.startIndex, offsetBy: selection.end.column)
                        selectedText = String(line[startIndex..<endIndex])
                    } else if lineIndex == selection.start.line {
                        // First line of multi-line selection
                        let startIndex = line.index(line.startIndex, offsetBy: selection.start.column)
                        selectedText += String(line[startIndex...]) + "\n"
                    } else if lineIndex == selection.end.line {
                        // Last line of multi-line selection
                        let endIndex = line.index(line.startIndex, offsetBy: selection.end.column)
                        selectedText += String(line[...endIndex])
                    } else {
                        // Middle lines of multi-line selection
                        selectedText += line + "\n"
                    }
                }
            }
            
            return selectedText.isEmpty ? nil : selectedText
        }
        
        // If no explicit selection, return the whole document
        var fullText = ""
        for line in sourceEditor.lines {
            fullText += (line as! String) + "\n"
        }
        
        return fullText.isEmpty ? nil : fullText
    }
    
    private func getSourceEditor() -> XCSourceTextBuffer? {
        // This would typically be accessed through the invocation parameter
        // For this example, we'll return nil since we can't access it without the invocation
        return nil
    }
    
    private func createContext(selection: String) -> [String: Any] {
        var context: [String: Any] = [:]
        
        // Add file context
        context["selectedCode"] = selection
        context["fileType"] = getFileExtension()
        context["fileName"] = getCurrentFileName()
        
        // Add project structure if available
        if let projectStructure = getProjectStructure() {
            context["projectStructure"] = projectStructure
        }
        
        // Add nearby code context
        if let nearbyCode = getNearbyCode(selection: selection) {
            context["nearbyCode"] = nearbyCode
        }
        
        return context
    }
    
    private func getFileExtension() -> String {
        // In a real implementation, you'd get this from the current document
        return "swift"
    }
    
    private func getCurrentFileName() -> String {
        // In a real implementation, you'd get this from the current document
        return "currentFile.swift"
    }
    
    private func getProjectStructure() -> [String: Any]? {
        // In a real implementation, you'd analyze the project structure
        return nil
    }
    
    private func getNearbyCode(selection: String) -> String? {
        // In a real implementation, you'd get the surrounding code
        return nil
    }
    
    private func handleResponse(response: String, intent: String) {
        // Process the response based on the intent
        switch intent {
        case _ where intent.lowercased().contains("explain"):
            showResponseAsAlert(title: "Code Explanation", message: response)
        case _ where intent.lowercased().contains("optimize"):
            applyCodeChanges(response)
        case _ where intent.lowercased().contains("documentation"):
            insertDocumentation(response)
        case _ where intent.lowercased().contains("issue"):
            showIssues(response)
        default:
            showResponseAsAlert(title: "CEL Response", message: response)
        }
    }
    
    private func showResponseAsAlert(title: String, message: String) {
        let alert = NSAlert()
        alert.messageText = title
        alert.informativeText = message
        alert.alertStyle = .informational
        alert.addButton(withTitle: "OK")
        alert.addButton(withTitle: "Copy to Clipboard")
        
        let modalResponse = alert.runModal()
        if modalResponse == .alertSecondButtonReturn {
            NSPasteboard.general.clearContents()
            NSPasteboard.general.setString(message, forType: .string)
        }
    }
    
    private func applyCodeChanges(_ changes: String) {
        // In a real implementation, you'd apply the changes to the source
        showNotification(title: "Code Changes Ready", message: "Implement applying changes: \(changes)")
    }
    
    private func insertDocumentation(_ documentation: String) {
        // In a real implementation, you'd insert documentation at cursor position
        showNotification(title: "Documentation Ready", message: "Implement inserting documentation")
    }
    
    private func showIssues(_ issues: String) {
        // In a real implementation, you'd display issues in a structured way
        showResponseAsAlert(title: "Issues Found", message: issues)
    }
    
    private func showNotification(title: String, message: String) {
        let notification = NSUserNotification()
        notification.title = title
        notification.informativeText = message
        notification.soundName = NSUserNotificationDefaultSoundName
        
        NSUserNotificationCenter.default.deliver(notification)
    }
}

// MARK: - Helper Classes

/// Represents a command that can be executed by the extension
class CELCommand: NSObject {
    let identifier: String
    let title: String
    let handler: () -> Void
    
    init(identifier: String, title: String, handler: @escaping () -> Void) {
        self.identifier = identifier
        self.title = title
        self.handler = handler
    }
}