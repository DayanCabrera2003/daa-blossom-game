import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';

/** Resolves a project-relative folder to an absolute path for aliasing. */
const dir = (path: string): string => fileURLToPath(new URL(path, import.meta.url));

// Path aliases mirror tsconfig.json so imports stay layer-explicit (e.g. `@core/graph`).
export const aliases = {
  '@core': dir('./src/core'),
  '@levels': dir('./src/levels'),
  '@game': dir('./src/game'),
  '@ui': dir('./src/ui'),
  '@services': dir('./src/services'),
  '@content': dir('./src/content'),
};

export default defineConfig({
  // Relative base so the build works under the GitHub Pages sub-path.
  base: './',
  resolve: { alias: aliases },
});
