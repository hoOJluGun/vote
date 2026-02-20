import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useProjectStore = create(
  persist(
    (set, get) => ({
      // Current project state
      currentProject: null,
      projects: [],
      
      // File system state
      fileTree: [],
      selectedFile: null,
      expandedFolders: new Set(['/src']),
      
      // File operations
      loadProject: async (projectId) => {
        try {
          // Simulate API call
          const project = {
            id: projectId,
            name: 'Sample Project',
            path: '/projects/sample',
            language: 'javascript'
          };
          
          // Load file tree
          const fileTree = [
            {
              name: 'src',
              path: '/src',
              type: 'folder',
              children: [
                {
                  name: 'components',
                  path: '/src/components',
                  type: 'folder',
                  children: [
                    { name: 'Button.jsx', path: '/src/components/Button.jsx', type: 'file' },
                    { name: 'Header.jsx', path: '/src/components/Header.jsx', type: 'file' }
                  ]
                },
                { name: 'App.jsx', path: '/src/App.jsx', type: 'file' },
                { name: 'index.js', path: '/src/index.js', type: 'file' }
              ]
            },
            {
              name: 'public',
              path: '/public',
              type: 'folder',
              children: [
                { name: 'index.html', path: '/public/index.html', type: 'file' }
              ]
            },
            { name: 'package.json', path: '/package.json', type: 'file' }
          ];
          
          set({ 
            currentProject: project,
            fileTree,
            expandedFolders: new Set(['/src'])
          });
        } catch (error) {
          console.error('Failed to load project:', error);
        }
      },
      
      selectFile: async (fileNode) => {
        if (fileNode.type === 'file') {
          try {
            // Simulate file content loading
            const content = `// Content of ${fileNode.name}\nconsole.log('Hello from ${fileNode.name}');\n`;
            
            set({ 
              selectedFile: { 
                ...fileNode, 
                content,
                language: fileNode.name.split('.').pop()
              } 
            });
          } catch (error) {
            console.error('Failed to load file:', error);
          }
        }
      },
      
      saveFile: async (filePath, content) => {
        try {
          // Simulate save operation
          const { selectedFile } = get();
          if (selectedFile && selectedFile.path === filePath) {
            set({
              selectedFile: { ...selectedFile, content }
            });
          }
          
          // Update file tree if needed
          // This would typically sync with backend
        } catch (error) {
          console.error('Failed to save file:', error);
        }
      },
      
      updateFileContent: (content) => {
        const { selectedFile } = get();
        if (selectedFile) {
          set({
            selectedFile: { ...selectedFile, content }
          });
        }
      },
      
      toggleFolder: (folderPath) => {
        const { expandedFolders } = get();
        const newExpanded = new Set(expandedFolders);
        
        if (newExpanded.has(folderPath)) {
          newExpanded.delete(folderPath);
        } else {
          newExpanded.add(folderPath);
        }
        
        set({ expandedFolders: newExpanded });
      },
      
      createNewFile: async (parentPath) => {
        try {
          const fileName = `new-file-${Date.now()}.js`;
          const filePath = `${parentPath}/${fileName}`;
          
          // Add to file tree
          const { fileTree } = get();
          const newFile = {
            name: fileName,
            path: filePath,
            type: 'file',
            content: '// New file content\n'
          };
          
          // This would need to traverse and update the tree structure
          // Simplified for demo purposes
          
          console.log('Created new file:', filePath);
        } catch (error) {
          console.error('Failed to create file:', error);
        }
      },
      
      createNewProject: async (projectName, template = 'empty') => {
        try {
          const newProject = {
            id: `proj_${Date.now()}`,
            name: projectName,
            createdAt: new Date().toISOString(),
            template
          };
          
          set(state => ({
            projects: [...state.projects, newProject],
            currentProject: newProject
          }));
          
          return newProject;
        } catch (error) {
          console.error('Failed to create project:', error);
        }
      }
    }),
    {
      name: 'project-storage',
      partialize: (state) => ({ 
        projects: state.projects,
        currentProject: state.currentProject 
      })
    }
  )
);