import React, { useState, useRef, useEffect } from 'react';
import { File, Save, Play, Bug, Zap } from 'lucide-react';
import { File as FileType } from '../stores/ideStore';
import { useIDEStore } from '../stores/ideStore';

interface EditorProps {
  file: FileType;
}

const Editor = ({ file }: EditorProps) => {
  const { updateFileContent, saveFile } = useIDEStore();
  const [content, setContent] = useState(file.content);
  const [cursorPosition, setCursorPosition] = useState({ line: 1, column: 1 });
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isTyping, setIsTyping] = useState(false);

  // Update local state when file changes
  useEffect(() => {
    setContent(file.content);
  }, [file.content]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);
    updateFileContent(file.id, newContent);
    setIsTyping(true);
    
    // Calculate cursor position
    const textarea = e.target;
    const text = textarea.value.substring(0, textarea.selectionStart);
    const lines = text.split('\n');
    const line = lines.length;
    const column = lines[lines.length - 1].length + 1;
    setCursorPosition({ line, column });
    
    // Reset typing indicator
    setTimeout(() => setIsTyping(false), 1000);
  };

  const handleSave = () => {
    saveFile(file.id);
  };

  const handleRun = () => {
    // Simulate running code
    console.log('Running code:', content);
  };

  const handleDebug = () => {
    // Simulate debugging
    console.log('Debugging code:', content);
  };

  return (
    <div className="editor-container">
      {/* Editor Header */}
      <div className="editor-header">
        <div className="editor-title">
          {file.isDirty && (
            <div className="editor-file-status"></div>
          )}
          <File className="editor-file-icon" />
          <span className="editor-file-name">
            {file.name}
            {file.isDirty && <span className="ml-2 text-yellow-400">•</span>}
          </span>
        </div>
        
        <div className="editor-actions">
          <button 
            onClick={handleSave}
            className="editor-action"
            title="Save (Ctrl+S)"
          >
            <Save className="w-4 h-4" />
          </button>
          <button 
            onClick={handleRun}
            className="editor-action"
            title="Run (F5)"
          >
            <Play className="w-4 h-4" />
          </button>
          <button 
            onClick={handleDebug}
            className="editor-action"
            title="Debug (F9)"
          >
            <Bug className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Editor Content */}
      {file.content ? (
        <div className="editor-content">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleChange}
            className="w-full h-full resize-none outline-none font-mono text-sm leading-relaxed bg-transparent text-gray-100 caret-blue-400"
            style={{ 
              fontFamily: 'Fira Code, SF Mono, Monaco, Consolas, monospace',
              fontSize: '14px',
              lineHeight: '1.5'
            }}
            spellCheck={false}
            autoFocus
          />
          
          {/* Typing indicator */}
          {isTyping && (
            <div className="absolute bottom-4 right-4 bg-gray-800/80 px-3 py-1 rounded-lg text-sm text-gray-400 backdrop-blur-sm">
              <div className="flex items-center space-x-2">
                <div className="typing-indicator">
                  <div className="typing-dot"></div>
                  <div className="typing-dot"></div>
                  <div className="typing-dot"></div>
                </div>
                <span>Saving...</span>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="editor-placeholder animate-fade-in">
          <div className="editor-placeholder-icon">
            <File className="w-16 h-16 text-blue-400" />
          </div>
          <h2 className="editor-placeholder-title">Welcome to CEL Web IDE</h2>
          <p className="editor-placeholder-desc">
            A modern AI-powered development environment inspired by VS Code and JetBrains
          </p>
          
          <div className="editor-placeholder-actions">
            <button className="action-button btn-primary">
              <File className="w-4 h-4" />
              New File
            </button>
            <button 
              className="action-button btn-secondary"
              onClick={() => window.dispatchEvent(new Event('chat-open'))}
            >
              <Zap className="w-4 h-4" />
              AI Assistant
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Editor;