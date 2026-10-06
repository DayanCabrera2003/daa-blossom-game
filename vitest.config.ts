import { defineConfig } from 'vitest/config';
import { aliases } from './vite.config.ts';

export default defineConfig({
  resolve: { alias: aliases },
  test: {
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    // Fixed fast-check seed by default; FC_SEED / FC_RUNS override it (tests/support/fastCheckSettings.ts).
    setupFiles: ['tests/setup/fastCheck.ts'],
    coverage: {
      provider: 'v8',
      // Only the pure core is held to the coverage bar: it is the mathematical heart of the project.
      include: ['src/core/**/*.ts'],
      exclude: ['src/core/**/*.test.ts', 'src/core/**/types.ts'],
      thresholds: { lines: 95, branches: 95, functions: 95, statements: 95 },
    },
  },
});
