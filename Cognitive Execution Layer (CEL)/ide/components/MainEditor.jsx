import React, { useState, useRef, useEffect } from 'react';
import { 
  Play, 
  Save, 
  Undo, 
  Redo, 
  Copy, 
  Cut, 
  Paste,
  Zap,
  Sparkles,
  Brain,
  Bot
} from 'lucide-react';
import { useProjectStore } from '../stores/projectStore';
import { useAgentStore } from '../stores/agentStore';
import { cn } from '../lib/utils';

export function MainEditor() {
  const { selectedFile, saveFile, updateFileContent } = useProjectStore();
  const { requestAgentHelp } = useAgentStore();
  
  const [content, setContent] = useState('');
  const [isModified, setIsModified] = useState(false);
  const [cursorPosition, setCursorPosition] = useState({ line: 1, column: 1 });
  const [suggestions, setSuggestions] = useState([]);
  const textareaRef = useRef(null);

  // Load file content when selection changes
  useEffect(() => {
    if (selectedFile) {
      setContent(selectedFile.content || '');
      setIsModified(false);
    }
  }, [selectedFile]);

  // Auto-save functionality
  useEffect(() => {
    if (isModified && selectedFile) {
      const timer = setTimeout(() => {
        saveFile(selectedFile.path, content);
        setIsModified(false);
      }, 2000); // Auto-save after 2 seconds of inactivity
      
      return () => clearTimeout(timer);
    }
  }, [content, isModified, selectedFile, saveFile]);

  const handleContentChange = (e) => {
    setContent(e.target.value);
    setIsModified(true);
    
    // Update cursor position
    const textarea = e.target;
    const line = textarea.value.substr(0, textarea.selectionStart).split('\n').length;
    const column = textarea.selectionStart - textarea.value.lastIndexOf('\n', textarea.selectionStart - 1);
    setCursorPosition({ line, column });
    
    // Request AI suggestions
    requestSuggestions(e.target.value, textarea.selectionStart);
  };

  const requestSuggestions = async (content, cursorPos) => {
    // Simulate AI suggestion request
    if (content.length > 10 && Math.random() > 0.7) {
      setSuggestions([
        { text: 'Consider adding error handling here', type: 'warning' },
        { text: 'This could be extracted into a helper function', type: 'info' },
        { text: 'Potential performance optimization opportunity', type: 'success' }
      ]);
    }
  };

  const handleSave = () => {
    if (selectedFile) {
      saveFile(selectedFile.path, content);
      setIsModified(false);
    }
  };

  const handleAIAssist = async () => {
    if (!selectedFile) return;
    
    const selection = window.getSelection().toString();
    const prompt = selection 
      ? `Improve this selected code: ${selection}`
      : `Complete this code: ${content}`;
    
    const result = await requestAgentHelp('code_completion', {
      file: selectedFile.path,
      content: content,
      prompt: prompt
    });
    
    if (result && result.suggestion) {
      setContent(prev => prev + result.suggestion);
    }
  };

  const handleRefactor = async () => {
    if (!selectedFile) return;
    
    const result = await requestAgentHelp('refactor', {
      file: selectedFile.path,
      content: content
    });
    
    if (result && result.refactoredCode) {
      setContent(result.refactoredCode);
    }
  };

  const handleExplain = async () => {
    if (!selectedFile) return;
    
    const result = await requestAgentHelp('explain', {
      file: selectedFile.path,
      content: content
    });
    
    // Show explanation in a modal or side panel
    alert(result.explanation || 'Explanation would appear here');
  };

  if (!selectedFile) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="text-center">
          <FileText className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold text-foreground mb-2">No file selected</h3>
          <p className="text-muted-foreground">Select a file from the explorer to begin editing</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-background">
      {/* Editor Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-foreground truncate max-w-xs">
            {selectedFile.path}
          </span>
          {isModified && (
            <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <button 
            onClick={handleSave}
            className="p-2 hover:bg-accent rounded-md transition-colors"
            title="Save (Ctrl+S)"
          >
            <Save className="w-4 h-4" />
          </button>
          
          <div className="w-px h-6 bg-border mx-2"></div>
          
          <button 
            className="p-2 hover:bg-accent rounded-md transition-colors"
            title="Undo (Ctrl+Z)"
          >
            <Undo className="w-4 h-4" />
          </button>
          <button 
            className="p-2 hover:bg-accent rounded-md transition-colors"
            title="Redo (Ctrl+Shift+Z)"
          >
            <Redo className="w-4 h-4" />
          </button>
          
          <div className="w-px h-6 bg-border mx-2"></div>
          
          <button 
            className="p-2 hover:bg-accent rounded-md transition-colors"
            title="Copy (Ctrl+C)"
          >
            <Copy className="w-4 h-4" />
          </button>
          <button 
            className="p-2 hover:bg-accent rounded-md transition-colors"
            title="Cut (Ctrl+X)"
          >
            <Cut className="w-4 h-4" />
          </button>
          <button 
            className="p-2 hover:bg-accent rounded-md transition-colors"
            title="Paste (Ctrl+V)"
          >
            <Paste className="w-4 h-4" />
          </button>
          
          <div className="w-px h-6 bg-border mx-2"></div>
          
          <button 
            onClick={handleAIAssist}
            className="p-2 hover:bg-accent rounded-md transition-colors text-purple-500"
            title="AI Assist (Ctrl+.)"
          >
            <Sparkles className="w-4 h-4" />
          </button>
          <button 
            onClick={handleRefactor}
            className="p-2 hover:bg-accent rounded-md transition-colors text-blue-500"
            title="Refactor Code"
          >
            <Zap className="w-4 h-4" />
          </button>
          <button 
            onClick={handleExplain}
            className="p-2 hover:bg-accent rounded-md transition-colors text-green-500"
            title="Explain Code"
          >
            <Brain className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Editor Content */}
      <div className="flex-1 flex">
        {/* Line Numbers */}
        <div className="bg-muted border-r border-border p-4 text-right text-sm text-muted-foreground select-none">
          {content.split('\n').map((_, index) => (
            <div key={index} className="leading-6">
              {index + 1}
            </div>
          ))}
        </div>

        {/* Code Editor */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleContentChange}
            className="w-full h-full p-4 font-mono text-sm resize-none bg-background text-foreground focus:outline-none leading-6"
            spellCheck={false}
            style={{
              tabSize: 2
            }}
          />
          
          {/* AI Suggestions Overlay */}
          {suggestions.length > 0 && (
            <div className="absolute bottom-4 left-4 bg-popover border border-border rounded-lg shadow-lg p-3 max-w-md z-10">
              <h4 className="text-sm font-medium mb-2 flex items-center">
                <Bot className="w-4 h-4 mr-2 text-purple-500" />
                AI Suggestions
              </h4>
              <div className="space-y-2">
                {suggestions.map((suggestion, index) => (
                  <div 
                    key={index}
                    className={cn(
                      "text-xs p-2 rounded cursor-pointer hover:bg-accent",
                      suggestion.type === 'warning' && 'bg-yellow-500/10 border border-yellow-500/20',
                      suggestion.type === 'info' && 'bg-blue-500/10 border border-blue-500/20',
                      suggestion.type === 'success' && 'bg-green-500/10 border border-green-500/20'
                    )}
                  >
                    {suggestion.text}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between px-4 py-1 bg-muted border-t border-border text-xs text-muted-foreground">
        <div className="flex items-center space-x-4">
          <span>Ln {cursorPosition.line}, Col {cursorPosition.column}</span>
          <span>{selectedFile.language?.toUpperCase() || 'TEXT'}</span>
          <span>{Math.round(content.length / 1024 * 100) / 100}KB</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="flex items-center">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
            <span>AI Ready</span>
          </div>
        </div>
      </div>
    </div>
  );
}