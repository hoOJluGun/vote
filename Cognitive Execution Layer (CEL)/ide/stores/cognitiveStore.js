import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useCognitiveStore = create(
  persist(
    (set, get) => ({
      // Cognitive workspace state
      workspace: {
        nodes: [
          { id: 'concept_1', label: 'User Authentication', type: 'concept', importance: 0.8 },
          { id: 'file_1', label: '/src/auth/login.jsx', type: 'file', importance: 0.7 },
          { id: 'function_1', label: 'handleLogin()', type: 'function', importance: 0.9 },
          { id: 'variable_1', label: 'userToken', type: 'variable', importance: 0.6 },
          { id: 'dependency_1', label: 'jsonwebtoken', type: 'dependency', importance: 0.5 },
          { id: 'concept_2', label: 'Database Connection', type: 'concept', importance: 0.7 },
          { id: 'file_2', label: '/src/database/connection.js', type: 'file', importance: 0.8 },
          { id: 'function_2', label: 'connectDB()', type: 'function', importance: 0.8 }
        ],
        edges: [
          { source: 'concept_1', target: 'file_1', weight: 0.8, type: 'related_to' },
          { source: 'file_1', target: 'function_1', weight: 0.9, type: 'contains' },
          { source: 'function_1', target: 'variable_1', weight: 0.7, type: 'uses' },
          { source: 'file_1', target: 'dependency_1', weight: 0.6, type: 'depends_on' },
          { source: 'concept_2', target: 'file_2', weight: 0.8, type: 'related_to' },
          { source: 'file_2', target: 'function_2', weight: 0.9, type: 'contains' },
          { source: 'concept_1', target: 'concept_2', weight: 0.5, type: 'interacts_with' }
        ],
        activeConnections: 12,
        memoryUsage: 65,
        visualizationEnabled: true,
        recentActivity: [
          { action: 'New connection established', timestamp: '2 minutes ago' },
          { action: 'Node importance updated', timestamp: '5 minutes ago' },
          { action: 'Dependency detected', timestamp: '10 minutes ago' },
          { action: 'Pattern recognized', timestamp: '15 minutes ago' }
        ]
      },
      
      // Neural network state
      neuralState: {
        learningRate: 0.01,
        activationLevel: 0.75,
        patternRecognition: true,
        memoryConsolidation: true
      },
      
      // Initialize cognitive workspace
      initializeCognitiveWorkspace: () => {
        console.log('Initializing cognitive workspace...');
        // Setup neural pathways and connections
      },
      
      // Update workspace data
      updateWorkspace: (updates) => {
        set(state => ({
          workspace: {
            ...state.workspace,
            ...updates
          }
        }));
      },
      
      // Toggle visualization
      toggleVisualization: () => {
        set(state => ({
          workspace: {
            ...state.workspace,
            visualizationEnabled: !state.workspace.visualizationEnabled
          }
        }));
      },
      
      // Refresh workspace data
      refreshWorkspace: async () => {
        try {
          // Simulate refreshing from backend
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Add some new activity
          const activities = [
            'Pattern recognition completed',
            'New dependency mapped',
            'Code structure analyzed',
            'Security vulnerability detected'
          ];
          
          const randomActivity = activities[Math.floor(Math.random() * activities.length)];
          
          set(state => ({
            workspace: {
              ...state.workspace,
              activeConnections: Math.floor(Math.random() * 20) + 10,
              memoryUsage: Math.floor(Math.random() * 30) + 60,
              recentActivity: [
                { action: randomActivity, timestamp: 'Just now' },
                ...state.workspace.recentActivity.slice(0, 3)
              ]
            }
          }));
          
        } catch (error) {
          console.error('Failed to refresh workspace:', error);
        }
      },
      
      // Add new node to knowledge graph
      addNode: (nodeData) => {
        set(state => ({
          workspace: {
            ...state.workspace,
            nodes: [...state.workspace.nodes, {
              id: `node_${Date.now()}`,
              ...nodeData,
              importance: nodeData.importance || 0.5
            }]
          }
        }));
      },
      
      // Add new connection
      addEdge: (sourceId, targetId, weight = 0.5, type = 'related_to') => {
        set(state => ({
          workspace: {
            ...state.workspace,
            edges: [...state.workspace.edges, {
              source: sourceId,
              target: targetId,
              weight,
              type
            }]
          }
        }));
      },
      
      // Update node importance
      updateNodeImportance: (nodeId, importance) => {
        set(state => ({
          workspace: {
            ...state.workspace,
            nodes: state.workspace.nodes.map(node =>
              node.id === nodeId ? { ...node, importance } : node
            )
          }
        }));
      },
      
      // Get related nodes
      getRelatedNodes: (nodeId) => {
        const { workspace } = get();
        const relatedEdges = workspace.edges.filter(
          edge => edge.source === nodeId || edge.target === nodeId
        );
        
        return relatedEdges.map(edge => 
          edge.source === nodeId ? edge.target : edge.source
        );
      },
      
      // Pattern recognition
      recognizePatterns: () => {
        const { workspace } = get();
        const patterns = [];
        
        // Simple pattern detection
        const fileNodes = workspace.nodes.filter(node => node.type === 'file');
        const functionNodes = workspace.nodes.filter(node => node.type === 'function');
        
        if (fileNodes.length > 5 && functionNodes.length > 10) {
          patterns.push({
            type: 'large_project',
            confidence: 0.8,
            description: 'Large scale project detected'
          });
        }
        
        // Dependency cycles
        const dependencies = workspace.edges.filter(edge => edge.type === 'depends_on');
        if (dependencies.length > 3) {
          patterns.push({
            type: 'complex_dependencies',
            confidence: 0.7,
            description: 'Complex dependency structure detected'
          });
        }
        
        return patterns;
      },
      
      // Memory consolidation
      consolidateMemory: () => {
        set(state => {
          // Remove low-importance nodes
          const filteredNodes = state.workspace.nodes.filter(
            node => node.importance > 0.3
          );
          
          // Remove edges to removed nodes
          const validNodeIds = new Set(filteredNodes.map(node => node.id));
          const filteredEdges = state.workspace.edges.filter(
            edge => validNodeIds.has(edge.source) && validNodeIds.has(edge.target)
          );
          
          return {
            workspace: {
              ...state.workspace,
              nodes: filteredNodes,
              edges: filteredEdges,
              memoryUsage: Math.max(30, state.workspace.memoryUsage - 15)
            }
          };
        });
      }
    }),
    {
      name: 'cognitive-storage'
    }
  )
);