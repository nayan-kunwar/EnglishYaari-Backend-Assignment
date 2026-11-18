import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    env: {
      NODE_ENV: 'test',
    },
    include: ['tests/**/*.test.ts'],
    testTimeout: 30_000,
    hookTimeout: 600_000,
    pool: 'forks',
    fileParallelism: false,
  },
});
