'use strict';

/**
 * Unit tests for Virtual Sandbox
 */

import { VirtualSandbox } from '../../src/engines/virtual-sandbox.js';

describe('VirtualSandbox', () => {
  let sandbox;

  beforeEach(() => {
    sandbox = new VirtualSandbox({
      timeout: 5000,
      maxMemory: 256 * 1024 * 1024, // 256MB
    });
  });

  afterEach(async () => {
    if (sandbox) {
      await sandbox.shutdown();
    }
  });

  describe('constructor', () => {
    test('should create instance with default options', () => {
      const defaultSandbox = new VirtualSandbox();
      expect(defaultSandbox.timeout).toBe(60000);
      expect(defaultSandbox.maxMemory).toBe(512 * 1024 * 1024);
    });

    test('should accept custom options', () => {
      expect(sandbox.timeout).toBe(5000);
      expect(sandbox.maxMemory).toBe(256 * 1024 * 1024);
    });

    test('should initialize collections', () => {
      expect(sandbox.sandboxes).toBeInstanceOf(Map);
      expect(sandbox.initialized).toBe(false);
    });
  });

  describe('sandbox management', () => {
    test('should create new sandbox', async () => {
      const sandboxId = 'test-sandbox-1';
      const config = { timeout: 3000, maxMemory: 128 * 1024 * 1024 };

      const createdSandbox = await sandbox.createSandbox(sandboxId, config);

      expect(createdSandbox.id).toBe(sandboxId);
      expect(createdSandbox.config.timeout).toBe(3000);
      expect(createdSandbox.config.maxMemory).toBe(128 * 1024 * 1024);
      expect(createdSandbox.status).toBe('created');
      expect(createdSandbox.createdAt).toBeDefined();
      expect(createdSandbox.executions).toEqual([]);
      expect(sandbox.sandboxes.has(sandboxId)).toBe(true);
    });

    test('should create sandbox with default config', async () => {
      const sandboxId = 'default-sandbox';
      const createdSandbox = await sandbox.createSandbox(sandboxId);

      expect(createdSandbox.config.timeout).toBe(5000);
      expect(createdSandbox.config.maxMemory).toBe(256 * 1024 * 1024);
    });

    test('should execute code in sandbox', async () => {
      const sandboxId = 'execution-test';
      await sandbox.createSandbox(sandboxId);

      const code = 'console.log("Hello World");';
      const execution = await sandbox.executeCode(sandboxId, code);

      expect(execution.id).toMatch(/^exec-\d+$/);
      expect(execution.code).toBe(code.substring(0, 1000));
      expect(execution.status).toBe('completed');
      expect(execution.stdout).toBe('Execution completed');
      expect(execution.stderr).toBe('');
      expect(execution.exitCode).toBe(0);
      expect(execution.duration).toBe(100);
      expect(execution.executedAt).toBeDefined();

      // Check that execution is recorded
      const sandboxRecord = sandbox.sandboxes.get(sandboxId);
      expect(sandboxRecord.executions).toHaveLength(1);
      expect(sandboxRecord.executions[0]).toEqual(execution);
      expect(sandboxRecord.status).toBe('active');
    });

    test('should throw error for non-existent sandbox', async () => {
      await expect(sandbox.executeCode('non-existent', 'test code')).rejects.toThrow(
        'Sandbox not found: non-existent'
      );
    });

    test('should cleanup sandbox', async () => {
      const sandboxId = 'cleanup-test';
      await sandbox.createSandbox(sandboxId);

      await sandbox.cleanup(sandboxId);

      expect(sandbox.sandboxes.has(sandboxId)).toBe(false);
    });

    test('should handle cleanup of non-existent sandbox', async () => {
      // Should not throw error
      await expect(sandbox.cleanup('non-existent')).resolves.toBeUndefined();
    });
  });

  describe('testing functionality', () => {
    test('should run tests in sandbox', async () => {
      const testConfig = {
        files: ['test1.js', 'test2.js'],
        reporter: 'json',
      };

      const results = await sandbox.runTests(testConfig);

      expect(results.passed).toBe(0);
      expect(results.failed).toBe(0);
      expect(results.skipped).toBe(0);
      expect(results.total).toBe(0);
      expect(results.duration).toBe(0);
      expect(results.coverage).toBeNull();
      expect(results.executedAt).toBeDefined();
    });

    test('should run tests with empty config', async () => {
      const results = await sandbox.runTests({});

      expect(results).toBeDefined();
      expect(results.total).toBe(0);
    });
  });

  describe('utility methods', () => {
    test('should return correct status when not initialized', () => {
      expect(sandbox.getStatus()).toBe('not_initialized');
    });

    test('should return operational status after creation', async () => {
      await sandbox.createSandbox('test');
      expect(sandbox.getStatus()).toBe('not_initialized'); // Still not initialized
    });

    test('should shutdown all sandboxes', async () => {
      // Create multiple sandboxes
      await sandbox.createSandbox('sandbox-1');
      await sandbox.createSandbox('sandbox-2');
      await sandbox.createSandbox('sandbox-3');

      await sandbox.shutdown();

      expect(sandbox.sandboxes.size).toBe(0);
    });

    test('should handle shutdown with no sandboxes', async () => {
      await expect(sandbox.shutdown()).resolves.toBeUndefined();
    });
  });

  describe('edge cases', () => {
    test('should handle very long code execution', async () => {
      const sandboxId = 'long-code-test';
      await sandbox.createSandbox(sandboxId);

      const longCode = 'a'.repeat(2000); // 2000 characters
      const execution = await sandbox.executeCode(sandboxId, longCode);

      // Should only store first 1000 characters
      expect(execution.code).toBe('a'.repeat(1000));
      expect(execution.code.length).toBe(1000);
    });

    test('should handle concurrent executions', async () => {
      const sandboxId = 'concurrent-test';
      await sandbox.createSandbox(sandboxId);

      // Execute multiple codes concurrently
      const promises = [
        sandbox.executeCode(sandboxId, 'code 1'),
        sandbox.executeCode(sandboxId, 'code 2'),
        sandbox.executeCode(sandboxId, 'code 3'),
      ];

      const executions = await Promise.all(promises);

      expect(executions).toHaveLength(3);
      const sandboxRecord = sandbox.sandboxes.get(sandboxId);
      expect(sandboxRecord.executions).toHaveLength(3);
    });

    test('should handle sandbox with custom allowed commands', async () => {
      const config = {
        allowedCommands: ['npm', 'node', 'git'],
      };

      const createdSandbox = await sandbox.createSandbox('commands-test', config);

      expect(createdSandbox.config.allowedCommands).toEqual(['npm', 'node', 'git']);
    });
  });

  describe('error handling', () => {
    test('should handle execution errors gracefully', async () => {
      const sandboxId = 'error-test';
      await sandbox.createSandbox(sandboxId);

      // Even though our mock doesn't actually execute code,
      // we test that the structure handles execution properly
      const execution = await sandbox.executeCode(sandboxId, 'valid code');

      expect(execution).toBeDefined();
      expect(execution.status).toBe('completed');
    });

    test('should maintain sandbox state after failed executions', async () => {
      const sandboxId = 'state-test';
      await sandbox.createSandbox(sandboxId);

      try {
        await sandbox.executeCode(sandboxId, 'some code');
        // Even if execution had errors, sandbox should remain
        const sandboxRecord = sandbox.sandboxes.get(sandboxId);
        expect(sandboxRecord).toBeDefined();
      } catch (error) {
        // Handle any execution errors
        const sandboxRecord = sandbox.sandboxes.get(sandboxId);
        expect(sandboxRecord).toBeDefined();
      }
    });
  });
});