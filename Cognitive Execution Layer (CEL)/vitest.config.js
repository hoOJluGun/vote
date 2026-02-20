import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 10000,
    include: [
      '**/__tests__/**/*.test.{js,ts}',
      '**/__tests__/**/*.spec.{js,ts}',
      '**/*.{test,spec}.{js,ts}',
    ],
    exclude: ['**/node_modules/**', '**/dist/**', '**/build/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      reportsDirectory: './coverage',
      include: ['src/**', 'lib/**', 'security/**'],
      exclude: ['**/node_modules/**', '**/__tests__/**'],
    },
  },
});
