import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';

// Components
import { Sidebar } from './components/Sidebar';
import { MainEditor } from './components/MainEditor';
import { CognitiveWorkspace } from './components/CognitiveWorkspace';
import { MultiAgentOrchestrator } from './components/MultiAgentOrchestrator';
import { StatusBar } from './components/StatusBar';
import { CommandPalette } from './components/CommandPalette';

// Stores
import { useProjectStore } from './stores/projectStore';
import { useAgentStore } from './stores/agentStore';
import { useCognitiveStore } from './stores/cognitiveStore';

// Hooks
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useAutoSave } from './hooks/useAutoSave';

// Styles
import '../index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      cacheTime: 1000 * 60 * 10, // 10 minutes
    },
  },
});

function App() {
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const { currentProject, loadProject } = useProjectStore();
  const { initializeAgents } = useAgentStore();
  const { initializeCognitiveWorkspace } = useCognitiveStore();

  // Load project on mount
  useEffect(() => {
    const projectId = localStorage.getItem('lastProjectId');
    if (projectId) {
      loadProject(projectId);
    }
  }, [loadProject]);

  // Initialize systems
  useEffect(() => {
    initializeAgents();
    initializeCognitiveWorkspace();
  }, [initializeAgents, initializeCognitiveWorkspace]);

  // Setup keyboard shortcuts
  useKeyboardShortcuts({
    'mod+p': () => setIsCommandPaletteOpen(true),
    'mod+s': () => {
      // Save current file
      const event = new CustomEvent('save-file');
      window.dispatchEvent(event);
    },
    'mod+shift+f': () => {
      // Find in files
      const event = new CustomEvent('find-in-files');
      window.dispatchEvent(event);
    },
  });

  // Setup auto-save
  useAutoSave();

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className="flex h-screen bg-background text-foreground overflow-hidden">
          {/* Command Palette */}
          <CommandPalette 
            isOpen={isCommandPaletteOpen}
            onClose={() => setIsCommandPaletteOpen(false)}
          />

          {/* Sidebar */}
          <Sidebar />

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col min-w-0">
            <Routes>
              <Route 
                path="/" 
                element={
                  <div className="flex-1 flex">
                    <MainEditor />
                    <CognitiveWorkspace />
                  </div>
                } 
              />
              <Route 
                path="/agents" 
                element={<MultiAgentOrchestrator />} 
              />
              <Route 
                path="/workspace" 
                element={<CognitiveWorkspace />} 
              />
            </Routes>

            {/* Status Bar */}
            <StatusBar />
          </div>

          {/* Toast Notifications */}
          <Toaster 
            position="bottom-right"
            theme="system"
            richColors
            expand
          />
        </div>
      </Router>
    </QueryClientProvider>
  );
}

// Create root and render app
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}