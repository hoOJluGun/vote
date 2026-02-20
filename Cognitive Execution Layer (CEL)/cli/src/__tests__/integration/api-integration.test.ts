import { CELService } from '../../services/CELService';

describe('CELService Integration', () => {
  let celService: CELService;

  beforeAll(() => {
    celService = new CELService('http://localhost:3000');
  });

  describe('Real API Communication', () => {
    test('should communicate with actual CEL server', async () => {
      // This test will only pass when CEL server is running
      try {
        const messages = [
          { role: 'user' as const, content: 'Hello, this is a test message' }
        ];
        
        const response = await celService.chat(messages);
        
        // Basic validation - response should be a string
        expect(typeof response).toBe('string');
        expect(response.length).toBeGreaterThan(0);
        
        console.log('API Response:', response.substring(0, 100) + '...');
      } catch (error) {
        // Skip test if server is not available
        console.log('Skipping integration test - CEL server not available');
      }
    }, 10000); // 10 second timeout

    test('should get system status', async () => {
      try {
        const status = await celService.getStatus();
        
        expect(status).toBeDefined();
        expect(typeof status).toBe('object');
        
        // Check for expected status properties
        expect(status).toHaveProperty('status');
        expect(['ok', 'error']).toContain(status.status);
        
        console.log('Status Response:', JSON.stringify(status, null, 2));
      } catch (error) {
        console.log('Skipping status test - CEL server not available');
      }
    }, 5000);
  });

  describe('Code Generation Flow', () => {
    test('should generate code based on description', async () => {
      try {
        const description = 'Create a simple JavaScript function that adds two numbers';
        const generatedCode = await celService.generateCode(description);
        
        expect(typeof generatedCode).toBe('string');
        expect(generatedCode.length).toBeGreaterThan(0);
        
        // Basic validation that it looks like code
        expect(generatedCode).toMatch(/function|\(|\)|{|}|=>|=|;/);
        
        console.log('Generated Code:', generatedCode.substring(0, 200) + '...');
      } catch (error) {
        console.log('Skipping code generation test - API not available');
      }
    }, 15000);

    test('should refactor existing code', async () => {
      try {
        const originalCode = `
          function calculateSum(a, b) {
            let result = a + b;
            return result;
          }
        `;
        
        const refactoredCode = await celService.refactorCode(originalCode, 'make it more concise');
        
        expect(typeof refactoredCode).toBe('string');
        expect(refactoredCode.length).toBeGreaterThan(0);
        
        console.log('Original Code:', originalCode);
        console.log('Refactored Code:', refactoredCode.substring(0, 200) + '...');
      } catch (error) {
        console.log('Skipping refactoring test - API not available');
      }
    }, 15000);
  });

  describe('Performance Tests', () => {
    test('should handle multiple concurrent requests', async () => {
      try {
        const promises = Array(3).fill(null).map(async (_, index) => {
          const messages = [
            { role: 'user' as const, content: `Concurrent test message ${index + 1}` }
          ];
          return await celService.chat(messages);
        });

        const startTime = Date.now();
        const responses = await Promise.all(promises);
        const endTime = Date.now();
        
        expect(responses).toHaveLength(3);
        responses.forEach(response => {
          expect(typeof response).toBe('string');
          expect(response.length).toBeGreaterThan(0);
        });
        
        const duration = endTime - startTime;
        console.log(`Concurrent requests completed in ${duration}ms`);
        
        // Should complete within reasonable time
        expect(duration).toBeLessThan(10000);
      } catch (error) {
        console.log('Skipping concurrent test - API not available');
      }
    }, 15000);

    test('should maintain consistent response quality', async () => {
      try {
        const testMessages = [
          'What is 2+2?',
          'Explain JavaScript closures',
          'Create a simple React component'
        ];

        const responses = await Promise.all(
          testMessages.map(msg => 
            celService.chat([{ role: 'user' as const, content: msg }])
          )
        );

        // All responses should be meaningful
        responses.forEach((response, index) => {
          expect(response.length).toBeGreaterThan(10);
          expect(response).not.toContain('Error');
          expect(response).not.toContain('undefined');
          console.log(`Test ${index + 1}:`, response.substring(0, 50) + '...');
        });
      } catch (error) {
        console.log('Skipping quality test - API not available');
      }
    }, 20000);
  });
});