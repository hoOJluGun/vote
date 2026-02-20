import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export interface File {
  id: string;
  name: string;
  content: string;
  language: string;
  path: string;
  isDirty: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  context?: {
    files?: string[];
    code?: string;
    projectStructure?: string;
  };
}

export interface IDEState {
  // File management
  files: File[];
  openFiles: File[];
  activeFile: File | null;
  
  // Chat functionality
  chatMessages: ChatMessage[];
  isChatLoading: boolean;
  chatModel: string;
  chatTemperature: number;
  chatMaxTokens: number;
  
  // IDE settings
  theme: 'dark' | 'light';
  fontSize: number;
  showLineNumbers: boolean;
  wordWrap: boolean;
  
  // Actions
  createFile: (name: string, content?: string, language?: string) => void;
  openFile: (fileId: string) => void;
  closeFile: (fileId: string) => void;
  setActiveFile: (fileId: string) => void;
  updateFileContent: (fileId: string, content: string) => void;
  saveFile: (fileId: string) => void;
  
  // Chat actions
  sendMessage: (content: string, context?: any) => Promise<void>;
  clearChat: () => void;
  setChatModel: (model: string) => void;
  setChatTemperature: (temperature: number) => void;
  setChatMaxTokens: (tokens: number) => void;
  
  // Settings actions
  setTheme: (theme: 'dark' | 'light') => void;
  setFontSize: (size: number) => void;
  setShowLineNumbers: (show: boolean) => void;
  setWordWrap: (wrap: boolean) => void;
}

export const useIDEStore = create<IDEState>()(
  devtools(
    (set, get) => ({
      // Initial state
      files: [],
      openFiles: [],
      activeFile: null,
      chatMessages: [],
      isChatLoading: false,
      chatModel: 'gpt-4',
      chatTemperature: 0.7,
      chatMaxTokens: 2000,
      theme: 'dark',
      fontSize: 14,
      showLineNumbers: true,
      wordWrap: false,

      // File actions
      createFile: (name, content = '', language = 'javascript') => {
        const newFile: File = {
          id: Math.random().toString(36).substr(2, 9),
          name,
          content,
          language,
          path: `/${name}`,
          isDirty: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        
        set((state) => ({
          files: [...state.files, newFile],
          openFiles: [...state.openFiles, newFile],
          activeFile: newFile,
        }));
      },

      openFile: (fileId) => {
        const file = get().files.find(f => f.id === fileId);
        if (file && !get().openFiles.some(f => f.id === fileId)) {
          set((state) => ({
            openFiles: [...state.openFiles, file],
            activeFile: file,
          }));
        }
      },

      closeFile: (fileId) => {
        set((state) => {
          const newOpenFiles = state.openFiles.filter(f => f.id !== fileId);
          let newActiveFile = state.activeFile;
          
          if (state.activeFile?.id === fileId) {
            newActiveFile = newOpenFiles[newOpenFiles.length - 1] || null;
          }
          
          return {
            openFiles: newOpenFiles,
            activeFile: newActiveFile,
          };
        });
      },

      setActiveFile: (fileId) => {
        const file = get().files.find(f => f.id === fileId) || 
                     get().openFiles.find(f => f.id === fileId);
        if (file) {
          set({ activeFile: file });
        }
      },

      updateFileContent: (fileId, content) => {
        set((state) => ({
          files: state.files.map(file =>
            file.id === fileId 
              ? { ...file, content, isDirty: true, updatedAt: new Date() }
              : file
          ),
          activeFile: state.activeFile?.id === fileId 
            ? { ...state.activeFile, content, isDirty: true, updatedAt: new Date() }
            : state.activeFile,
        }));
      },

      saveFile: (fileId) => {
        set((state) => ({
          files: state.files.map(file =>
            file.id === fileId ? { ...file, isDirty: false } : file
          ),
          activeFile: state.activeFile?.id === fileId 
            ? { ...state.activeFile, isDirty: false }
            : state.activeFile,
        }));
      },

      // Chat actions
      sendMessage: async (content, context) => {
        const userMessage: ChatMessage = {
          id: Math.random().toString(36).substr(2, 9),
          role: 'user',
          content,
          timestamp: new Date(),
          context,
        };

        set((state) => ({
          chatMessages: [...state.chatMessages, userMessage],
          isChatLoading: true,
        }));

        // Simulate AI response with typing effect
        setTimeout(() => {
          const assistantMessage: ChatMessage = {
            id: Math.random().toString(36).substr(2, 9),
            role: 'assistant',
            content: `I understand you want help with: "${content}". Let me analyze your code and provide assistance.`,
            timestamp: new Date(),
          };

          set((state) => ({
            chatMessages: [...state.chatMessages, assistantMessage],
            isChatLoading: false,
          }));
        }, 1500);
      },

      clearChat: () => {
        set({ chatMessages: [] });
      },

      setChatModel: (model) => {
        set({ chatModel: model });
      },

      setChatTemperature: (temperature) => {
        set({ chatTemperature: temperature });
      },

      setChatMaxTokens: (tokens) => {
        set({ chatMaxTokens: tokens });
      },

      // Settings actions
      setTheme: (theme) => {
        set({ theme });
      },

      setFontSize: (size) => {
        set({ fontSize: size });
      },

      setShowLineNumbers: (show) => {
        set({ showLineNumbers: show });
      },

      setWordWrap: (wrap) => {
        set({ wordWrap: wrap });
      },
    }),
    {
      name: 'ide-storage',
    }
  )
);