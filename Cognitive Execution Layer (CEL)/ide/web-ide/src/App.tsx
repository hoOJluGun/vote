import React, { useState } from 'react';
import { Activity, Code, FileText, Folder, Search, Settings, MessageSquare, Terminal, Play, Bug, Sparkles, Zap, Cpu } from 'lucide-react';
import Sidebar from './components/Sidebar';
import Editor from './components/Editor';
import StatusBar from './components/StatusBar';
import ChatPanel from './components/ChatPanel';
import FileExplorer from './components/FileExplorer';
import { useIDEStore } from './stores/ideStore';

function App() {
  const { activeFile, openFiles, setActiveFile, closeFile } = useIDEStore();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <div className="ide-container">
      {/* Top Menu Bar */}
      <div className="ide-header">
        <div className="menu-bar">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-editor-bg"></div>
              </div>
              <span className="font-bold text-lg bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                CEL Web IDE
              </span>
            </div>
            
            <nav className="flex space-x-1">
              <button className="menu-item">File</button>
              <button className="menu-item">Edit</button>
              <button className="menu-item">View</button>
              <button className="menu-item">Run</button>
              <button className="menu-item">Terminal</button>
              <button className="menu-item">AI</button>
            </nav>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button 
            onClick={() => setChatOpen(!chatOpen)}
            className={`btn-icon transition-all duration-200 ${
              chatOpen ? 'text-white bg-gradient-primary scale-105' : 'text-gray-400 hover:text-gray-200'
            }`}
            title="AI Assistant"
          >
            <MessageSquare className="w-5 h-5" />
          </button>
          <button className="btn-icon text-gray-400 hover:text-gray-200" title="Settings">
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="main-content">
        {/* Left Sidebar - File Explorer */}
        {sidebarOpen && (
          <div className="sidebar">
            <div className="sidebar-header">
              <div className="sidebar-title flex items-center">
                <Folder className="w-4 h-4 mr-2 text-blue-400" />
                <span>EXPLORER</span>
              </div>
              <div className="sidebar-actions">
                <button className="btn-icon text-gray-400 hover:text-gray-200">
                  <Folder className="w-4 h-4" />
                </button>
                <button className="btn-icon text-gray-400 hover:text-gray-200">
                  <Search className="w-4 h-4" />
                </button>
              </div>
            </div>
            <FileExplorer />
          </div>
        )}

        {/* Center Editor Area */}
        <div className="flex-1 flex flex-col">
          {/* Tab Bar */}
          {openFiles.length > 0 && (
            <div className="tab-bar">
              {openFiles.map((file) => (
                <div
                  key={file.id}
                  onClick={() => setActiveFile(file.id)}
                  className={`tab ${
                    activeFile?.id === file.id ? 'active' : ''
                  }`}
                >
                  <FileText className="w-4 h-4 mr-2 sidebar-item-icon" />
                  <span className="truncate text-sm">{file.name}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      closeFile(file.id);
                    }}
                    className="tab-close"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Editor */}
          <div className="flex-1">
            {activeFile ? (
              <Editor file={activeFile} />
            ) : (
              <div className="flex items-center justify-center h-full bg-editor-bg">
                <div className="text-center animate-fade-in">
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <Code className="w-10 h-10 text-blue-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-100 mb-2">Welcome to CEL Web IDE</h3>
                  <p className="text-gray-400 max-w-md mb-6">
                    A modern AI-powered development environment inspired by VS Code and JetBrains
                  </p>
                  
                  <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
                    <button 
                      className="quick-action"
                      onClick={() => {
                        // In real app: create new file
                      }}
                    >
                      <FileText className="quick-action-icon text-blue-400" />
                      <div className="quick-action-title">New File</div>
                      <div className="quick-action-desc">Create a new source file</div>
                    </button>
                    
                    <button 
                      className="quick-action"
                      onClick={() => setChatOpen(true)}
                    >
                      <Sparkles className="quick-action-icon text-purple-400" />
                      <div className="quick-action-title">AI Assistant</div>
                      <div className="quick-action-desc">Ask for code help</div>
                    </button>
                    
                    <button className="quick-action">
                      <Zap className="quick-action-icon text-yellow-400" />
                      <div className="quick-action-title">Refactor</div>
                      <div className="quick-action-desc">Optimize your code</div>
                    </button>
                    
                    <button className="quick-action">
                      <Cpu className="quick-action-icon text-green-400" />
                      <div className="quick-action-title">Test</div>
                      <div className="quick-action-desc">Run tests</div>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Chat Panel */}
        {chatOpen && (
          <div className="chat-panel">
            <ChatPanel onClose={() => setChatOpen(false)} />
          </div>
        )}
      </div>

      {/* Status Bar */}
      <StatusBar />
    </div>
  );
}

export default App;