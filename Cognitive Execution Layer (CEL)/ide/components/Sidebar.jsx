import React, { useState } from 'react';
import { 
  FileText, 
  Folder, 
  Search, 
  Settings, 
  Bot, 
  Brain, 
  Network,
  ChevronRight,
  ChevronDown,
  Plus,
  MoreHorizontal
} from 'lucide-react';
import { useProjectStore } from '../stores/projectStore';
import { cn } from '../lib/utils';

export function Sidebar() {
  const { 
    currentProject, 
    fileTree, 
    expandedFolders,
    toggleFolder,
    selectFile,
    selectedFile
  } = useProjectStore();
  
  const [activeTab, setActiveTab] = useState('files');

  const tabs = [
    { id: 'files', label: 'Explorer', icon: Folder },
    { id: 'search', label: 'Search', icon: Search },
    { id: 'agents', label: 'Agents', icon: Bot },
    { id: 'cognitive', label: 'Cognitive', icon: Brain },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  return (
    <div className="flex h-full bg-card border-r border-border w-80 flex-shrink-0">
      {/* Tab Headers */}
      <div className="flex flex-col w-12 bg-muted border-r border-border">
        {tabs.map(({ id, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={cn(
              "p-3 flex items-center justify-center hover:bg-accent transition-colors",
              activeTab === id && "bg-primary/10 text-primary border-r-2 border-primary"
            )}
          >
            <Icon className="w-5 h-5" />
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 flex flex-col">
        {/* Tab Header */}
        <div className="p-4 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">
            {tabs.find(t => t.id === activeTab)?.label}
          </h2>
          {currentProject && (
            <p className="text-xs text-muted-foreground mt-1 truncate">
              {currentProject.name}
            </p>
          )}
        </div>

        {/* Tab Panels */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'files' && <FileExplorer />}
          {activeTab === 'search' && <SearchPanel />}
          {activeTab === 'agents' && <AgentPanel />}
          {activeTab === 'cognitive' && <CognitivePanel />}
          {activeTab === 'settings' && <SettingsPanel />}
        </div>
      </div>
    </div>
  );
}

function FileExplorer() {
  const { 
    fileTree, 
    expandedFolders,
    toggleFolder,
    selectFile,
    selectedFile,
    createNewFile
  } = useProjectStore();

  const renderFileNode = (node, depth = 0) => {
    if (node.type === 'folder') {
      const isExpanded = expandedFolders.has(node.path);
      
      return (
        <div key={node.path}>
          <div 
            className={cn(
              "flex items-center py-1 px-2 hover:bg-accent cursor-pointer group",
              depth > 0 && "pl-" + (depth * 4 + 2)
            )}
            onClick={() => toggleFolder(node.path)}
          >
            <div className="flex items-center flex-1 min-w-0">
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 mr-1 text-muted-foreground" />
              ) : (
                <ChevronRight className="w-4 h-4 mr-1 text-muted-foreground" />
              )}
              <Folder className="w-4 h-4 mr-2 text-yellow-500" />
              <span className="text-sm truncate flex-1">{node.name}</span>
            </div>
            <button 
              className="opacity-0 group-hover:opacity-100 p-1 hover:bg-muted rounded"
              onClick={(e) => {
                e.stopPropagation();
                createNewFile(node.path);
              }}
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
          
          {isExpanded && node.children && (
            <div className="ml-4">
              {node.children.map(child => renderFileNode(child, depth + 1))}
            </div>
          )}
        </div>
      );
    } else {
      const isSelected = selectedFile?.path === node.path;
      
      return (
        <div
          key={node.path}
          className={cn(
            "flex items-center py-1 px-2 hover:bg-accent cursor-pointer group",
            isSelected && "bg-primary/10 text-primary",
            depth > 0 && "pl-" + (depth * 4 + 2)
          )}
          onClick={() => selectFile(node)}
        >
          <FileText className="w-4 h-4 mr-2 text-blue-500" />
          <span className="text-sm truncate flex-1">{node.name}</span>
          <button className="opacity-0 group-hover:opacity-100 p-1 hover:bg-muted rounded">
            <MoreHorizontal className="w-3 h-3" />
          </button>
        </div>
      );
    }
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-2">
        {fileTree.map(node => renderFileNode(node))}
      </div>
    </div>
  );
}

function SearchPanel() {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async (term) => {
    if (!term.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      // Simulate search API call
      await new Promise(resolve => setTimeout(resolve, 500));
      setSearchResults([
        { path: '/src/components/Button.jsx', line: 15, content: 'function Button({ children, variant = "primary" }) {' },
        { path: '/src/utils/helpers.js', line: 23, content: 'export const formatDate = (date) => {' },
        { path: '/tests/unit/button.test.js', line: 8, content: 'describe("Button component", () => {' }
      ]);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-border">
        <input
          type="text"
          placeholder="Search files..."
          className="w-full px-3 py-2 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            handleSearch(e.target.value);
          }}
        />
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {isSearching ? (
          <div className="p-4 text-center text-muted-foreground">Searching...</div>
        ) : searchResults.length > 0 ? (
          <div className="divide-y divide-border">
            {searchResults.map((result, index) => (
              <div key={index} className="p-3 hover:bg-accent cursor-pointer">
                <div className="text-sm font-medium text-foreground truncate">
                  {result.path}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Line {result.line}
                </div>
                <div className="text-xs text-muted-foreground font-mono mt-2 bg-muted p-2 rounded">
                  {result.content}
                </div>
              </div>
            ))}
          </div>
        ) : searchTerm ? (
          <div className="p-4 text-center text-muted-foreground">
            No results found
          </div>
        ) : (
          <div className="p-4 text-center text-muted-foreground">
            Enter a search term to begin
          </div>
        )}
      </div>
    </div>
  );
}

function AgentPanel() {
  const { agents } = useAgentStore();
  
  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4">
        <div className="space-y-3">
          {agents.map(agent => (
            <div 
              key={agent.id}
              className="p-3 bg-card border border-border rounded-lg hover:bg-accent transition-colors cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Bot className="w-4 h-4 mr-2 text-purple-500" />
                  <span className="text-sm font-medium">{agent.name}</span>
                </div>
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  agent.status === 'active' ? 'bg-green-500' : 
                  agent.status === 'idle' ? 'bg-yellow-500' : 'bg-red-500'
                )} />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {agent.role} • {agent.tasksCompleted} tasks completed
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CognitivePanel() {
  const { workspace } = useCognitiveStore();
  
  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4 space-y-4">
        <div className="bg-gradient-cel p-4 rounded-lg text-white">
          <div className="flex items-center">
            <Brain className="w-5 h-5 mr-2" />
            <h3 className="font-semibold">Cognitive Workspace</h3>
          </div>
          <p className="text-sm opacity-90 mt-2">
            Active neural pathways: {workspace.activeConnections}
          </p>
        </div>
        
        <div className="space-y-3">
          <div className="p-3 bg-card border border-border rounded-lg">
            <h4 className="text-sm font-medium mb-2">Knowledge Graph</h4>
            <div className="text-xs text-muted-foreground">
              {workspace.nodes} nodes, {workspace.edges} connections
            </div>
          </div>
          
          <div className="p-3 bg-card border border-border rounded-lg">
            <h4 className="text-sm font-medium mb-2">Memory Usage</h4>
            <div className="w-full bg-muted rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full" 
                style={{ width: `${workspace.memoryUsage}%` }}
              />
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {workspace.memoryUsage}% used
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingsPanel() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4 space-y-6">
        <div>
          <h3 className="text-sm font-medium mb-3">General</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Auto-save</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" defaultChecked />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm">Line numbers</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" defaultChecked />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>
          </div>
        </div>
        
        <div>
          <h3 className="text-sm font-medium mb-3">AI Models</h3>
          <select className="w-full px-3 py-2 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring">
            <option>upstage/solar-pro-3:free</option>
            <option>z-ai/glm-4.5-air:free</option>
            <option>qwen/qwen3-coder:free</option>
          </select>
        </div>
      </div>
    </div>
  );
}