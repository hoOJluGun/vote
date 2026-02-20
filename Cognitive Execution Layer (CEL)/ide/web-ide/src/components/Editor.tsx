import React, { useState, useRef, useEffect } from 'react';
import { useIDEStore, File as FileType } from '../stores/ideStore';
import { Sparkles, RotateCcw, Save, Zap, Bug, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface EditorProps {
  file: FileType;
}

const Editor = ({ file }: EditorProps) => {
  const { updateFileContent, saveFile } = useIDEStore();
  const [localContent, setLocalContent] = useState(file.content);
  const [showAIOptions, setShowAIOptions] = useState(false);
  const [aiAction, setAiAction] = useState<'explain' | 'refactor' | 'fix' | 'doc' | null>(null);
  const [aiResponse, setAiResponse] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    setLocalContent(file.content);
  }, [file]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setLocalContent(newContent);
    updateFileContent(file.id, newContent);
  };

  const handleAIAction = async () => {
    if (!aiAction) return;
    
    setIsProcessing(true);
    
    // In a real implementation, this would call the CEL API
    // For now, we'll simulate the response
    setTimeout(() => {
      let response = '';
      
      switch (aiAction) {
        case 'explain':
          response = `This ${file.language} file contains:\n- Variable declarations\n- Function definitions\n- Control structures\n- Comments and documentation`;
          break;
        case 'refactor':
          response = `// Refactored version of ${file.name}\n${localContent}`;
          break;
        case 'fix':
          response = `// Potential fixes for ${file.name}\n${localContent}`;
          break;
        case 'doc':
          response = `// Added documentation to ${file.name}\n${localContent}`;
          break;
      }
      
      setAiResponse(response);
      setIsProcessing(false);
    }, 1500);
  };

  useEffect(() => {
    if (aiAction) {
      handleAIAction();
    }
  }, [aiAction]);

  const handleSave = () => {
    saveFile(file.id);
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

      <div className="flex-1 relative">
        <textarea
          value={localContent}
          onChange={handleChange}
          className="w-full h-full font-mono text-sm bg-editor-bg text-gray-200 p-4 focus:outline-none resize-none"
          spellCheck="false"
        />
        
        <AnimatePresence>
          {aiResponse && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="absolute top-4 right-4 w-2/5 bg-panel-bg border border-panel-border rounded-lg shadow-lg p-3 max-h-40 overflow-y-auto"
            >
              <div className="flex justify-between items-start mb-2">
                <h4 className="text-sm font-medium text-gray-300">AI Response</h4>
                <button 
                  onClick={() => {
                    setAiResponse('');
                    setAiAction(null);
                  }}
                  className="text-gray-400 hover:text-gray-200 text-sm"
                >
                  ×
                </button>
              </div>
              <div className="text-xs text-gray-400 whitespace-pre-wrap max-h-24 overflow-y-auto">
                {aiResponse}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {isProcessing && (
          <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
            <div className="bg-panel-bg p-4 rounded-lg border border-panel-border flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-accent mr-2"></div>
              <span className="text-sm text-gray-300">Processing with AI...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Editor;