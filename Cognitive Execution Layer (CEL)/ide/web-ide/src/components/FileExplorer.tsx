import React from 'react';
import { Folder, FileText, ChevronRight, ChevronDown, Plus, Search } from 'lucide-react';
import { useIDEStore } from '../stores/ideStore';

const FileExplorer = () => {
  const { files, openFiles, activeFile, openFile, setActiveFile, createFile } = useIDEStore();
  const [expandedFolders, setExpandedFolders] = React.useState<Record<string, boolean>>({
    'root': true,
    'src': true,
  });

  const toggleFolder = (folderPath: string) => {
    setExpandedFolders(prev => ({
      ...prev,
      [folderPath]: !prev[folderPath]
    }));
  };

  const handleFileClick = (fileId: string) => {
    const file = files.find(f => f.id === fileId);
    if (file) {
      openFile(fileId);
      setActiveFile(fileId);
    }
  };

  const handleCreateFile = () => {
    const fileName = prompt('Enter file name:');
    if (fileName) {
      createFile(fileName, '// New file content', 'javascript');
    }
  };

  // Mock file structure for demo
  const mockFiles = [
    { id: '1', name: 'index.js', path: '/src/index.js', language: 'javascript' },
    { id: '2', name: 'App.jsx', path: '/src/App.jsx', language: 'jsx' },
    { id: '3', name: 'styles.css', path: '/src/styles.css', language: 'css' },
    { id: '4', name: 'utils.js', path: '/src/utils/utils.js', language: 'javascript' },
    { id: '5', name: 'api.js', path: '/src/services/api.js', language: 'javascript' },
  ];

  return (
    <div className="flex-1 flex flex-col">
      {/* Project Header */}
      <div className="p-3 border-b border-border-dark">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-gray-200">PROJECT</h3>
            <p className="text-xs text-gray-500 mt-1">cel-web-ide</p>
          </div>
          <div className="flex space-x-1">
            <button 
              onClick={handleCreateFile}
              className="p-1 rounded hover:bg-hover-dark text-gray-400 hover:text-gray-200"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button className="p-1 rounded hover:bg-hover-dark text-gray-400 hover:text-gray-200">
              <Search className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* File Tree */}
      <div className="flex-1 overflow-y-auto py-2">
        {/* Root folder */}
        <div className="sidebar-item" onClick={() => toggleFolder('root')}>
          {expandedFolders['root'] ? 
            <ChevronDown className="w-4 h-4" /> : 
            <ChevronRight className="w-4 h-4" />
          }
          <Folder className="w-4 h-4 text-blue-400" />
          <span className="font-medium">cel-web-ide</span>
        </div>

        {expandedFolders['root'] && (
          <div className="ml-4">
            {/* SRC folder */}
            <div className="sidebar-item" onClick={() => toggleFolder('src')}>
              {expandedFolders['src'] ? 
                <ChevronDown className="w-4 h-4" /> : 
                <ChevronRight className="w-4 h-4" />
              }
              <Folder className="w-4 h-4 text-yellow-400" />
              <span>src</span>
            </div>

            {expandedFolders['src'] && (
              <div className="ml-4 space-y-1">
                {mockFiles.map((file) => {
                  const isOpen = openFiles.some(f => f.id === file.id);
                  const isActive = activeFile?.id === file.id;
                  
                  return (
                    <div
                      key={file.id}
                      className={`sidebar-item ${isOpen ? 'text-blue-400' : ''} ${isActive ? 'active' : ''}`}
                      onClick={() => handleFileClick(file.id)}
                    >
                      <FileText className="w-4 h-4" />
                      <span className="truncate">{file.name}</span>
                      {isOpen && (
                        <div className="w-2 h-2 bg-blue-400 rounded-full ml-auto"></div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Other folders */}
            <div className="sidebar-item">
              <Folder className="w-4 h-4 text-green-400" />
              <span>public</span>
            </div>
            <div className="sidebar-item">
              <Folder className="w-4 h-4 text-purple-400" />
              <span>tests</span>
            </div>
            <div className="sidebar-item">
              <Folder className="w-4 h-4 text-red-400" />
              <span>node_modules</span>
            </div>
            
            {/* Config files */}
            <div className="mt-2">
              <div className="sidebar-item">
                <FileText className="w-4 h-4" />
                <span>package.json</span>
              </div>
              <div className="sidebar-item">
                <FileText className="w-4 h-4" />
                <span>vite.config.js</span>
              </div>
              <div className="sidebar-item">
                <FileText className="w-4 h-4" />
                <span>tailwind.config.js</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="p-3 border-t border-border-dark">
        <div className="text-xs text-gray-500 mb-2">QUICK ACTIONS</div>
        <div className="space-y-1">
          <button className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-hover-dark text-gray-300">
            Find in Files
          </button>
          <button className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-hover-dark text-gray-300">
            Replace in Files
          </button>
          <button className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-hover-dark text-gray-300">
            Toggle Terminal
          </button>
        </div>
      </div>
    </div>
  );
};

export default FileExplorer;