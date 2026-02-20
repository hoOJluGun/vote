import React, { useState, useEffect } from 'react';
import { 
  Brain, 
  Network, 
  Zap, 
  Eye,
  EyeOff,
  RefreshCw,
  Play,
  Pause,
  Settings
} from 'lucide-react';
import { ForceGraph2D } from 'react-force-graph';
import { useCognitiveStore } from '../stores/cognitiveStore';
import { cn } from '../lib/utils';

export function CognitiveWorkspace() {
  const { 
    workspace, 
    updateWorkspace,
    toggleVisualization,
    refreshWorkspace 
  } = useCognitiveStore();
  
  const [selectedNode, setSelectedNode] = useState(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const fgRef = React.useRef();

  const graphData = {
    nodes: workspace.nodes.map(node => ({
      id: node.id,
      name: node.label,
      val: node.importance * 20,
      color: getNodeColor(node.type),
      type: node.type
    })),
    links: workspace.edges.map(edge => ({
      source: edge.source,
      target: edge.target,
      value: edge.weight
    }))
  };

  function getNodeColor(type) {
    const colors = {
      concept: '#3b82f6',
      file: '#10b981',
      function: '#8b5cf6',
      variable: '#f59e0b',
      dependency: '#ef4444'
    };
    return colors[type] || '#6b7280';
  }

  const handleNodeClick = (node) => {
    setSelectedNode(node);
    // Center the clicked node
    fgRef.current.centerAt(node.x, node.y, 1000);
    fgRef.current.zoom(2, 2000);
  };

  const handleRefresh = async () => {
    await refreshWorkspace();
  };

  return (
    <div className="w-96 bg-card border-l border-border flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Brain className="w-5 h-5 mr-2 text-purple-500" />
            <h2 className="text-lg font-semibold">Cognitive Workspace</h2>
          </div>
          <div className="flex items-center space-x-2">
            <button 
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-1.5 hover:bg-accent rounded-md transition-colors"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>
            <button 
              onClick={handleRefresh}
              className="p-1.5 hover:bg-accent rounded-md transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button className="p-1.5 hover:bg-accent rounded-md transition-colors">
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        {/* Stats */}
        <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
          <div className="bg-muted p-2 rounded text-center">
            <div className="font-medium">{workspace.nodes.length}</div>
            <div className="text-muted-foreground">Nodes</div>
          </div>
          <div className="bg-muted p-2 rounded text-center">
            <div className="font-medium">{workspace.edges.length}</div>
            <div className="text-muted-foreground">Edges</div>
          </div>
          <div className="bg-muted p-2 rounded text-center">
            <div className="font-medium">{workspace.activeConnections}</div>
            <div className="text-muted-foreground">Active</div>
          </div>
        </div>
      </div>

      {/* Visualization Controls */}
      <div className="p-3 border-b border-border bg-muted/50">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Neural Visualization</span>
          <button 
            onClick={toggleVisualization}
            className={cn(
              "px-2 py-1 rounded text-xs transition-colors",
              workspace.visualizationEnabled 
                ? "bg-primary text-primary-foreground" 
                : "bg-muted hover:bg-accent"
            )}
          >
            {workspace.visualizationEnabled ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* Graph Visualization */}
      <div className="flex-1 relative">
        {workspace.visualizationEnabled ? (
          <ForceGraph2D
            ref={fgRef}
            graphData={graphData}
            nodeId="id"
            nodeLabel="name"
            nodeVal="val"
            nodeColor="color"
            linkWidth={link => link.value * 2}
            linkColor={() => '#4b5563'}
            linkDirectionalArrowLength={6}
            linkDirectionalArrowRelPos={1}
            onNodeClick={handleNodeClick}
            onNodeDragEnd={node => {
              node.fx = node.x;
              node.fy = node.y;
            }}
            cooldownTicks={isPlaying ? Infinity : 0}
            d3VelocityDecay={0.3}
            backgroundColor="transparent"
            width={384}
            height={400}
          />
        ) : (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <Network className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">Visualization paused</p>
              <p className="text-xs mt-1">Click the eye icon to resume</p>
            </div>
          </div>
        )}

        {/* Node Details Panel */}
        {selectedNode && (
          <div className="absolute bottom-4 left-4 right-4 bg-popover border border-border rounded-lg p-3 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium text-sm">{selectedNode.name}</h3>
              <button 
                onClick={() => setSelectedNode(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                ×
              </button>
            </div>
            <div className="text-xs space-y-1">
              <div>ID: {selectedNode.id}</div>
              <div>Type: <span className="capitalize">{selectedNode.type}</span></div>
              <div>Importance: {(selectedNode.val / 20).toFixed(2)}</div>
            </div>
          </div>
        )}
      </div>

      {/* Activity Feed */}
      <div className="border-t border-border">
        <div className="p-3">
          <h3 className="text-sm font-medium mb-2 flex items-center">
            <Zap className="w-4 h-4 mr-2 text-yellow-500" />
            Recent Activity
          </h3>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {workspace.recentActivity.slice(0, 5).map((activity, index) => (
              <div key={index} className="text-xs p-2 bg-muted rounded">
                <div className="font-medium">{activity.action}</div>
                <div className="text-muted-foreground">{activity.timestamp}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}