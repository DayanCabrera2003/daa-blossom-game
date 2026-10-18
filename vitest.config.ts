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
      // Every module that decides something is held to the bar: the pure core, levels, services,
      // the pure folders of the game and the pure models of the overlays. Phaser scenes, views and
      // the DOM of the books only draw, and are checked by playing (plan 02, phase 8).
      include: [
        'src/core/**/*.ts',
        'src/levels/**/*.ts',
        'src/services/**/*.ts',
        'src/game/{input,systems,animation,scale,picture,assets}/**/*.ts',
        // The mix is a pure table among the players that sound it (plan 09, phase 8).
        'src/game/audio/mix.ts',
        'src/ui/model/**/*.ts',
      ],
      exclude: ['src/**/*.test.ts', 'src/**/types.ts'],
      thresholds: { lines: 95, branches: 95, functions: 95, statements: 95 },
    },
  },
});
