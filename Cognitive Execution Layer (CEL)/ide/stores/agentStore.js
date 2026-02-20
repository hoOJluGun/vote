import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAgentStore = create(
  persist(
    (set, get) => ({
      // Agent state
      agents: [
        {
          id: 'agent_1',
          name: 'Code Architect',
          role: 'System Design',
          status: 'active',
          tasksCompleted: 24,
          specialization: ['architecture', 'design-patterns']
        },
        {
          id: 'agent_2',
          name: 'Code Refactorer',
          role: 'Code Optimization',
          status: 'idle',
          tasksCompleted: 18,
          specialization: ['refactoring', 'optimization']
        },
        {
          id: 'agent_3',
          name: 'Bug Hunter',
          role: 'Quality Assurance',
          status: 'active',
          tasksCompleted: 31,
          specialization: ['testing', 'debugging']
        },
        {
          id: 'agent_4',
          name: 'Documentation Expert',
          role: 'Technical Writing',
          status: 'idle',
          tasksCompleted: 12,
          specialization: ['documentation', 'comments']
        }
      ],
      
      // Task queue
      taskQueue: [],
      activeTasks: [],
      
      // Agent coordination
      initializeAgents: () => {
        // Initialize agent communication protocols
        console.log('Initializing multi-agent system...');
      },
      
      requestAgentHelp: async (taskType, payload) => {
        try {
          // Find suitable agent
          const suitableAgent = get().agents.find(agent => 
            agent.specialization.some(spec => taskType.includes(spec)) && 
            agent.status === 'idle'
          );
          
          if (!suitableAgent) {
            // Queue the task
            const taskId = `task_${Date.now()}`;
            set(state => ({
              taskQueue: [...state.taskQueue, {
                id: taskId,
                type: taskType,
                payload,
                createdAt: new Date().toISOString()
              }]
            }));
            
            return { queued: true, taskId };
          }
          
          // Assign task to agent
          set(state => ({
            agents: state.agents.map(agent => 
              agent.id === suitableAgent.id 
                ? { ...agent, status: 'active' }
                : agent
            ),
            activeTasks: [...state.activeTasks, {
              id: `active_${Date.now()}`,
              agentId: suitableAgent.id,
              taskType,
              payload,
              startedAt: new Date().toISOString()
            }]
          }));
          
          // Simulate agent work
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Return mock results based on task type
          const results = {
            code_completion: {
              suggestion: '\n\n// Added by AI assistant\nconsole.log("AI-powered completion!");'
            },
            refactor: {
              refactoredCode: `// Refactored by ${suitableAgent.name}\n${payload.content}\n\n// Improvements applied`
            },
            explain: {
              explanation: `This code performs the following functions:\n\n1. [Functionality analysis]\n2. [Pattern recognition]\n3. [Best practices evaluation]`
            },
            test_generation: {
              tests: `// Generated tests\nimport { testFunction } from './module';\n\ndescribe('Generated Tests', () => {\n  test('should work correctly', () => {\n    expect(testFunction()).toBe(true);\n  });\n});`
            }
          };
          
          // Mark agent as idle again
          set(state => ({
            agents: state.agents.map(agent => 
              agent.id === suitableAgent.id 
                ? { ...agent, status: 'idle', tasksCompleted: agent.tasksCompleted + 1 }
                : agent
            ),
            activeTasks: state.activeTasks.filter(task => task.agentId !== suitableAgent.id)
          }));
          
          return results[taskType] || { success: true };
          
        } catch (error) {
          console.error('Agent task failed:', error);
          return { error: error.message };
        }
      },
      
      getAgentStatus: () => {
        const { agents, activeTasks, taskQueue } = get();
        
        return {
          totalAgents: agents.length,
          activeAgents: agents.filter(a => a.status === 'active').length,
          idleAgents: agents.filter(a => a.status === 'idle').length,
          busyAgents: agents.filter(a => a.status === 'busy').length,
          activeTasks: activeTasks.length,
          queuedTasks: taskQueue.length,
          totalTasksCompleted: agents.reduce((sum, agent) => sum + agent.tasksCompleted, 0)
        };
      },
      
      assignTaskToAgent: (agentId, task) => {
        set(state => ({
          agents: state.agents.map(agent => 
            agent.id === agentId 
              ? { ...agent, status: 'active' }
              : agent
          ),
          activeTasks: [...state.activeTasks, { ...task, agentId, startedAt: new Date().toISOString() }]
        }));
      },
      
      completeAgentTask: (taskId, result) => {
        const { activeTasks } = get();
        const task = activeTasks.find(t => t.id === taskId);
        
        if (task) {
          set(state => ({
            agents: state.agents.map(agent => 
              agent.id === task.agentId 
                ? { ...agent, status: 'idle', tasksCompleted: agent.tasksCompleted + 1 }
                : agent
            ),
            activeTasks: state.activeTasks.filter(t => t.id !== taskId)
          }));
        }
        
        return result;
      },
      
      addAgent: (agentConfig) => {
        const newAgent = {
          id: `agent_${Date.now()}`,
          name: agentConfig.name,
          role: agentConfig.role,
          status: 'idle',
          tasksCompleted: 0,
          specialization: agentConfig.specialization || [],
          createdAt: new Date().toISOString()
        };
        
        set(state => ({
          agents: [...state.agents, newAgent]
        }));
        
        return newAgent;
      },
      
      removeAgent: (agentId) => {
        set(state => ({
          agents: state.agents.filter(agent => agent.id !== agentId),
          activeTasks: state.activeTasks.filter(task => task.agentId !== agentId)
        }));
      }
    }),
    {
      name: 'agent-storage'
    }
  )
);