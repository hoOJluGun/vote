'use strict';

/**
 * Unit tests for Project Knowledge Graph
 */

import { ProjectKnowledgeGraph } from '../../src/engines/project-knowledge-graph.js';

describe('ProjectKnowledgeGraph', () => {
  let graph;

  beforeEach(() => {
    graph = new ProjectKnowledgeGraph();
  });

  afterEach(async () => {
    if (graph) {
      await graph.shutdown();
    }
  });

  describe('constructor', () => {
    test('should create instance with default properties', () => {
      expect(graph.nodes).toBeInstanceOf(Map);
      expect(graph.edges).toBeInstanceOf(Map);
      expect(graph.metadata).toBeDefined();
      expect(graph.initialized).toBe(false);
    });

    test('should have proper metadata structure', () => {
      expect(graph.metadata.createdAt).toBeDefined();
      expect(graph.metadata.version).toBe('1.0.0');
      expect(graph.metadata.updatedAt).toBeNull();
    });
  });

  describe('initialize', () => {
    test('should initialize the graph', async () => {
      await graph.initialize();

      expect(graph.initialized).toBe(true);
    });

    test('should set updated timestamp', async () => {
      await graph.initialize();

      expect(graph.metadata.updatedAt).toBeDefined();
    });
  });

  describe('graph operations', () => {
    test('should build graph from project structure', async () => {
      const projectPath = './test-project';
      const graphData = await graph.buildGraph(projectPath);

      expect(graphData).toBeDefined();
      expect(graphData.nodes).toEqual([]);
      expect(graphData.edges).toEqual([]);
      expect(graphData.metadata.path).toBe(projectPath);
      expect(graphData.metadata.builtAt).toBeDefined();
    });

    test('should query non-existent node', () => {
      const node = graph.queryNode('non-existent');
      expect(node).toBeNull();
    });

    test('should update edge between nodes', () => {
      const edge = graph.updateEdge('node1', 'node2', { type: 'depends' });

      expect(edge.source).toBe('node1');
      expect(edge.target).toBe('node2');
      expect(edge.type).toBe('depends');
      expect(edge.updatedAt).toBeDefined();

      // Check that edge is stored
      const edges = graph.edges.get('node1');
      expect(edges).toBeDefined();
      expect(edges).toHaveLength(1);
      expect(edges[0]).toEqual(edge);
    });

    test('should update existing edge', () => {
      // First update
      graph.updateEdge('node1', 'node2', { type: 'depends' });

      // Second update should replace the existing edge
      const updatedEdge = graph.updateEdge('node1', 'node2', { type: 'imports', weight: 0.8 });

      const edges = graph.edges.get('node1');
      expect(edges).toHaveLength(1);
      expect(edges[0].type).toBe('imports');
      expect(edges[0].weight).toBe(0.8);
    });
  });

  describe('project analysis', () => {
    test('should analyze project structure', async () => {
      const projectPath = './my-project';
      const analysis = await graph.analyzeProjectStructure(projectPath);

      expect(analysis.path).toBe(projectPath);
      expect(analysis.structure).toEqual({});
      expect(analysis.dependencies).toEqual([]);
      expect(analysis.entryPoints).toEqual([]);
      expect(analysis.analyzedAt).toBeDefined();
    });

    test('should get project context', async () => {
      await graph.initialize();

      const context = await graph.getProjectContext();

      expect(context.nodes).toBe(0);
      expect(context.edges).toBe(0);
      expect(context.metadata).toBeDefined();
    });

    test('should create optimized representation', async () => {
      const taskType = 'code_generation';
      const targetFiles = ['src/index.js', 'src/utils.js'];
      const context = { priority: 'high' };

      const representation = await graph.createOptimizedRepresentation(taskType, targetFiles, context);

      expect(representation.taskType).toBe(taskType);
      expect(representation.targetFiles).toEqual(targetFiles);
      expect(representation.context).toEqual(context);
      expect(representation.stabilityScore).toBe(0.85);
      expect(representation.createdAt).toBeDefined();
    });
  });

  describe('utility methods', () => {
    test('should return correct status when not initialized', () => {
      expect(graph.getStatus()).toBe('not_initialized');
    });

    test('should return correct status when initialized', async () => {
      await graph.initialize();
      expect(graph.getStatus()).toBe('operational');
    });

    test('should shutdown and clear data', async () => {
      // Add some data
      graph.nodes.set('test-node', { id: 'test-node' });
      graph.edges.set('test-source', [{ target: 'test-target' }]);
      await graph.initialize();

      await graph.shutdown();

      expect(graph.nodes.size).toBe(0);
      expect(graph.edges.size).toBe(0);
      expect(graph.initialized).toBe(false);
    });
  });

  describe('edge cases', () => {
    test('should handle empty edge updates', () => {
      const edge = graph.updateEdge('', '', {});
      expect(edge.source).toBe('');
      expect(edge.target).toBe('');
    });

    test('should handle complex edge data', () => {
      const complexData = {
        type: 'dependency',
        weight: 0.75,
        metadata: {
          version: '1.0.0',
          optional: false,
        },
      };

      const edge = graph.updateEdge('source', 'target', complexData);
      expect(edge.weight).toBe(0.75);
      expect(edge.metadata.version).toBe('1.0.0');
    });
  });
});