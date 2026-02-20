import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['__tests__/**/*.test.js', '__tests__/**/*.test.ts', 'cli/src/__tests__/**/*.test.ts'],
    exclude: ['node_modules', 'dist', 'coverage'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules', '__tests__', 'cli/src/__tests__']
    },
    testTimeout: 30000,
    hookTimeout: 30000
  }
});
