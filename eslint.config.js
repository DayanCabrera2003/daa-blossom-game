// ESLint flat config. Beyond style, it enforces the project's hard rules:
// one responsibility per file (max 1000 lines) and the layer dependency rules of the architecture.
import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/** Import patterns that point at a given layer, whether through its alias or a relative path. */
const layer = (name) => [`@${name}`, `@${name}/**`, `**/${name}`, `**/${name}/**`];

/** The libraries that render the Códex: heavy, so only ui/math (in the deferred chunk) uses them. */
const MATH_LIBRARIES = {
  group: ['katex', 'katex/**', 'marked', 'marked/**'],
  message: 'only src/ui/math may import katex and marked; they load with the books, never before.',
};

/**
 * The import patterns that forbid the given layers, Phaser (unless `phaser` is false) and the math
 * libraries (unless `math` is false).
 */
const layerPatterns = (layers, message, { phaser = true, math = true } = {}) => [
  ...(phaser ? [{ group: ['phaser', 'phaser/**'], message }] : []),
  ...(math ? [MATH_LIBRARIES] : []),
  ...layers.map((name) => ({ group: layer(name), message })),
];

/** Builds a no-restricted-imports rule from `layerPatterns`. */
const forbidLayers = (layers, message, options) => [
  'error',
  { patterns: layerPatterns(layers, message, options) },
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
    // Pure game logic: decisions live here and are unit tested; only scenes and views may draw.
    // A later block replaces the earlier no-restricted-imports options, so ui/ is forbidden again.
    files: ['src/game/{input,systems,animation,scale,picture,assets}/**/*.ts'],
    rules: {
      'no-restricted-imports': forbidLayers(
        ['ui'],
        'pure game logic may not use Phaser nor import ui/; only scenes and views draw.',
      ),
    },
  },
  {
    // The view never changes the logic: views and audio may name the types of the controller, the
    // reducer and the level flow, but never call them. A separate rule, so ui/ stays forbidden.
    files: ['src/game/{view,audio}/**/*.ts'],
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@game/systems', '@game/systems/**', '**/systems', '**/systems/**'],
              allowTypeImports: true,
              message: 'views and audio only read the logic: import its types, never its values.',
            },
            {
              group: ['@core/rules', '@core/rules/**', '**/core/rules', '**/core/rules/**'],
              allowTypeImports: true,
              message: 'views and audio only read the logic: import its types, never its values.',
            },
            {
              group: ['@levels/flow*', '**/levels/flow*'],
              allowTypeImports: true,
              message: 'views and audio only read the logic: import its types, never its values.',
            },
          ],
        },
      ],
    },
  },
  {
    // Services are shared by the game and the overlays; they never render the Códex.
    files: ['src/services/**/*.ts'],
    rules: {
      'no-restricted-imports': forbidLayers([], 'services/ never render the Códex.', {
        phaser: false,
      }),
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
  {
    // Pure overlay models: what the books show is decided here without the DOM, and unit tested.
    files: ['src/ui/model/**/*.ts'],
    rules: {
      'no-restricted-globals': [
        'error',
        { name: 'window', message: 'ui/model is pure: pass what it needs from the DOM parts.' },
        { name: 'document', message: 'ui/model is pure: pass what it needs from the DOM parts.' },
        {
          name: 'localStorage',
          message: 'ui/model is pure: the save comes from the shared store.',
        },
      ],
    },
  },
  {
    // The only home of KaTeX and marked; it loads with the books, in the deferred chunk.
    files: ['src/ui/math/**/*.ts'],
    rules: {
      'no-restricted-imports': forbidLayers(
        ['game'],
        'ui/ must not import game/; use the event bus.',
        { math: false },
      ),
    },
  },
  {
    // The shell is part of the initial script: it reaches the heavy books only through import(),
    // so KaTeX, marked and the entries stay in the deferred chunk. ESLint only sees static imports.
    files: ['src/ui/shell.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            ...layerPatterns(['game'], 'ui/ must not import game/; use the event bus.'),
            {
              group: [
                'codex',
                'math',
                'notebook',
                'teacher',
                'epilogue',
                'diagram',
                'books',
              ].flatMap((name) => [`./${name}`, `./${name}/**`, `@ui/${name}`, `@ui/${name}/**`]),
              message: 'the shell loads the books with import() the first time one opens.',
            },
          ],
        },
      ],
    },
  },
  // Must be last: turns off stylistic rules that Prettier owns.
  prettier,
);
