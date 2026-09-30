import { defineConfig } from 'vitest/config';
import { aliases } from './vite.config';

export default defineConfig({
  resolve: { alias: aliases },
  test: {
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      // Only the pure core is held to the coverage bar: it is the mathematical heart of the project.
      include: ['src/core/**/*.ts'],
      exclude: ['src/core/**/*.test.ts', 'src/core/**/types.ts'],
      thresholds: { lines: 95, branches: 95, functions: 95, statements: 95 },
    },
  },
});
