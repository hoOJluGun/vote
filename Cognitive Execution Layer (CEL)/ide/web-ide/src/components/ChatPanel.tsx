import React, { useState, useRef, useEffect } from 'react';
import { Send, Settings, X, Paperclip, Sparkles, Zap, Code, FileText, Cpu, Loader2 } from 'lucide-react';
import { ChatMessage } from '../stores/ideStore';
import { useIDEStore } from '../stores/ideStore';

interface ChatPanelProps {
  onClose: () => void;
}

const ChatPanel = ({ onClose }: ChatPanelProps) => {
  const { 
    chatMessages, 
    isChatLoading, 
    chatModel, 
    chatTemperature, 
    chatMaxTokens,
    sendMessage,
    clearChat,
    setChatModel,
    setChatTemperature,
    setChatMaxTokens
  } = useIDEStore();
  
  const [inputValue, setInputValue] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [attachedContext, setAttachedContext] = useState<string[]>([]);
  const [serverUrl, setServerUrl] = useState('http://localhost:3000');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages, isChatLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const context = attachedContext.length > 0 ? {
      files: attachedContext,
      projectStructure: 'Mock project structure',
    } : undefined;

    await sendMessage(inputValue, context);
    setInputValue('');
    setAttachedContext([]);
  };

  const quickActions = [
    {
      icon: <Code className="w-5 h-5 text-blue-400" />,
      title: 'Explain Code',
      desc: 'How does this work?',
      prompt: 'Explain how this code works step by step.'
    },
    {
      icon: <Zap className="w-5 h-5 text-yellow-400" />,
      title: 'Refactor',
      desc: 'Improve performance',
      prompt: 'Refactor this code to improve performance and readability.'
    },
    {
      icon: <Cpu className="w-5 h-5 text-green-400" />,
      title: 'Find Issues',
      desc: 'Detect bugs',
      prompt: 'Analyze this code and identify potential bugs or issues.'
    },
    {
      icon: <FileText className="w-5 h-5 text-purple-400" />,
      title: 'Add Docs',
      desc: 'Generate documentation',
      prompt: 'Generate documentation comments for this code.'
    }
  ];

  const attachCurrentFile = () => {
    // In a real app, this would attach the currently opened file
    alert('Feature to attach current file would be implemented here');
  };

  const TypingIndicator = () => (
    <div className="chat-message chat-assistant">
      <div className="flex items-center space-x-2">
        <Sparkles className="w-4 h-4 text-purple-400" />
        <div className="typing-indicator">
          <div className="typing-dot"></div>
          <div className="typing-dot"></div>
          <div className="typing-dot"></div>
        </div>
        <span className="text-sm text-gray-400">Thinking...</span>
      </div>
    </div>
  );

  const WaveText = ({ text }: { text: string }) => (
    <div className="text-sm">
      {text.split('').map((char, index) => (
        <span 
          key={index} 
          className="wave-text inline-block"
          style={{ animationDelay: `${index * 0.05}s` }}
        >
          {char === ' ' ? '\u00A0' : char}
        </span>
      ))}
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-panel-border">
        <div className="flex items-center">
          <Sparkles className="w-5 h-5 text-purple-400 mr-2" />
          <h3 className="font-semibold text-gray-200">AI Assistant</h3>
        </div>
        <div className="flex space-x-2">
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className="p-1.5 rounded-md text-gray-400 hover:bg-hover-bg hover:text-gray-200 transition-colors"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-md text-gray-400 hover:bg-hover-bg hover:text-gray-200 transition-colors"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="p-4 bg-sidebar-dark border-b border-border-dark space-y-4 animate-fade-in">
          <h4 className="font-medium text-gray-200 mb-3">Model Settings</h4>
          
          <div>
            <label className="block text-sm text-gray-400 mb-2">Model</label>
            <select 
              value={chatModel}
              onChange={(e) => setChatModel(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-gray-200 text-sm"
            >
              <option value="gpt-4">GPT-4</option>
              <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
              <option value="claude-3">Claude 3</option>
              <option value="llama-2">Llama 2</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">
              Temperature: {chatTemperature}
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={chatTemperature}
              onChange={(e) => setChatTemperature(parseFloat(e.target.value))}
              className="w-full"
            />
            <p className="text-xs text-gray-500 mt-1">
              {chatTemperature < 0.3 ? 'More focused' : 
               chatTemperature > 0.7 ? 'More creative' : 'Balanced'}
            </p>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">
              Max Tokens: {chatMaxTokens}
            </label>
            <input
              type="range"
              min="500"
              max="4000"
              step="100"
              value={chatMaxTokens}
              onChange={(e) => setChatMaxTokens(parseInt(e.target.value))}
              className="w-full"
            />
          </div>

          <button 
            onClick={clearChat}
            className="w-full btn-secondary text-sm"
          >
            Clear Conversation
          </button>
        </div>
      )}

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {chatMessages.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-8 h-8 text-purple-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-300 mb-2">How can I help you today?</h3>
            <p className="text-gray-500 text-sm max-w-xs mx-auto">
              Ask me to explain code, refactor functions, write tests, or help with any development task.
            </p>
            
            {/* Quick Actions */}
            {!showSettings && chatMessages.length === 0 && (
              <div className="p-4 border-b border-panel-border bg-sidebar-bg">
                <h4 className="text-sm font-medium text-gray-300 mb-3">Quick Actions</h4>
                <div className="grid grid-cols-2 gap-2">
                  {quickActions.map((action, index) => (
                    <button
                      key={index}
                      onClick={() => setInputValue(action.prompt)}
                      className="flex flex-col items-center p-3 rounded-lg border border-panel-border hover:bg-hover-bg transition-colors text-left"
                    >
                      <div className="mb-2">{action.icon}</div>
                      <div className="text-xs font-medium text-gray-200">{action.title}</div>
                      <div className="text-xs text-gray-400 mt-1">{action.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            {chatMessages.map((message) => (
              <div 
                key={message.id} 
                className={`chat-message ${
                  message.role === 'user' ? 'chat-user' : 'chat-assistant'
                }`}
              >
                {message.role === 'assistant' && (
                  <div className="flex items-center space-x-2 mb-2">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    <span className="text-xs text-gray-500">AI Assistant</span>
                  </div>
                )}
                
                {message.role === 'user' ? (
                  <div className="text-sm">{message.content}</div>
                ) : (
                  <div className="text-sm">{message.content}</div>
                )}
                
                {message.context && (
                  <div className="mt-2 pt-2 border-t border-border-dark">
                    <div className="text-xs text-gray-500">
                      Context: {message.context.files?.join(', ') || 'Project structure'}
                    </div>
                  </div>
                )}
              </div>
            ))}
            
            {isChatLoading && (
              <div className="p-3 rounded-lg bg-assistant-message-bg mr-4">
                <div className="flex items-center">
                  <div className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center mr-2">
                    <Sparkles className="w-3 h-3 text-white" />
                  </div>
                  <div className="flex items-center text-gray-200">
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    <span>Thinking...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Context Attachment */}
      {attachedContext.length > 0 && (
        <div className="px-4 py-2 bg-blue-500/10 border-t border-blue-500/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Paperclip className="w-4 h-4 text-blue-400" />
              <span className="text-sm text-blue-300">
                Attached: {attachedContext.join(', ')}
              </span>
            </div>
            <button 
              onClick={() => setAttachedContext([])}
              className="text-blue-400 hover:text-blue-200 text-sm"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="p-4 border-t border-border-dark">
        <form onSubmit={handleSubmit} className="flex space-x-2">
          <div className="flex-1 relative">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask about your code or request help..."
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isChatLoading}
            />
            
            {/* Context Buttons */}
            <div className="absolute right-2 top-2 flex space-x-1">
              <button
                type="button"
                onClick={attachCurrentFile}
                className="p-1.5 rounded hover:bg-gray-700 text-gray-400 hover:text-gray-200"
                title="Attach current file"
              >
                <FileText className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={attachProjectStructure}
                className="p-1.5 rounded hover:bg-gray-700 text-gray-400 hover:text-gray-200"
                title="Attach project structure"
              >
                <Cpu className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          <button
            type="submit"
            disabled={!inputValue.trim() || isChatLoading}
            className="btn-primary flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
            <span>Send</span>
          </button>
        </form>
        
        <div className="mt-2 text-xs text-gray-500 flex justify-between">
          <span>Press Enter to send, Shift+Enter for new line</span>
          <span>{chatMessages.length} messages</span>
        </div>
      </div>
    </div>
  );
};

export default ChatPanel;