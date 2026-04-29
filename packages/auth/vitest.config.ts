import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: '@ketopath/auth',
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
