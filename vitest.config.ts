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
      // Every module that decides something is held to the bar: the pure core, levels, services
      // and the pure folders of the game. Phaser scenes and views only draw, and are checked by
      // playing (plan 02, phase 8).
      include: [
        'src/core/**/*.ts',
        'src/levels/**/*.ts',
        'src/services/**/*.ts',
        'src/game/{input,systems,animation,scale,picture}/**/*.ts',
      ],
      exclude: ['src/**/*.test.ts', 'src/**/types.ts'],
      thresholds: { lines: 95, branches: 95, functions: 95, statements: 95 },
    },
  },
});
