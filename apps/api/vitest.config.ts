import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globalSetup: ['./test/global-setup.ts'],
    setupFiles: ['./test/setup.ts'],
    env: { NODE_ENV: 'test', JWT_ACCESS_SECRET: 'test-secret-that-is-long-enough-0123456789' },
    // Files share one MongoDB server but each gets its own database.
    fileParallelism: true,
    testTimeout: 20_000,
    hookTimeout: 60_000,
  },
});
