// ESLint flat config. Beyond style, it enforces the project's hard rules:
// one responsibility per file (max 1000 lines) and the layer dependency rules of the architecture.
import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/** Import patterns that point at a given layer, whether through its alias or a relative path. */
const layer = (name) => [`@${name}`, `@${name}/**`, `**/${name}`, `**/${name}/**`];

/** Builds a no-restricted-imports rule that forbids the given layers (and optionally Phaser). */
const forbidLayers = (layers, message, { phaser = true } = {}) => [
  'error',
  {
    patterns: [
      ...(phaser ? [{ group: ['phaser', 'phaser/**'], message }] : []),
      ...layers.map((name) => ({ group: layer(name), message })),
    ],
  },
];

export default tseslint.config(
  { ignores: ['dist/', 'coverage/', 'node_modules/', 'tests/fixtures/'] },
  js.configs.recommended,
  ...tseslint.configs.strict,
  {
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    rules: {
      // Hard rule 3: a file that reaches 1000 lines is mixing responsibilities and must be split.
      'max-lines': ['error', { max: 1000 }],
    },
  },
  {
    // The core is pure: no engine, no other layer, no hidden sources of non-determinism or I/O.
    files: ['src/core/**/*.ts'],
    rules: {
      'no-restricted-imports': forbidLayers(
        ['levels', 'game', 'ui', 'services', 'content'],
        'core/ is pure: it may not depend on Phaser or on any other layer.',
      ),
      'no-restricted-globals': [
        'error',
        { name: 'Date', message: 'core/ must be deterministic; pass time in explicitly.' },
        { name: 'console', message: 'core/ must not perform I/O; return values or trace events.' },
        { name: 'window', message: 'core/ must not touch browser APIs.' },
        { name: 'document', message: 'core/ must not touch browser APIs.' },
        { name: 'localStorage', message: 'core/ must not touch browser APIs.' },
      ],
      'no-restricted-properties': [
        'error',
        {
          object: 'Math',
          property: 'random',
          message: 'core/ must use the seeded RNG in core/shared/rng.ts.',
        },
      ],
    },
  },
  {
    // Levels are data plus loaders on top of the core.
    files: ['src/levels/**/*.ts'],
    rules: {
      'no-restricted-imports': forbidLayers(
        ['game', 'ui', 'services', 'content'],
        'levels/ may only depend on core/.',
      ),
    },
  },
  {
    // The Phaser game and the DOM overlays talk through a typed event bus, never by direct import.
    files: ['src/game/**/*.ts'],
    rules: {
      'no-restricted-imports': forbidLayers(
        ['ui'],
        'game/ must not import ui/; use the event bus.',
        {
          phaser: false,
        },
      ),
    },
  },
  {
    files: ['src/ui/**/*.ts'],
    rules: {
      'no-restricted-imports': forbidLayers(
        ['game'],
        'ui/ must not import game/; use the event bus.',
      ),
    },
  },
  // Must be last: turns off stylistic rules that Prettier owns.
  prettier,
);
