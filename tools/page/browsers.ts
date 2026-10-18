/** A browser engine the game names, as esbuild names its targets. */
export type Engine = 'chrome' | 'edge' | 'firefox' | 'safari' | 'ios';

/**
 * The browsers the game promises (plan 09, phase 10; open question 5): Vite's "widely available"
 * baseline of its version 8, written out instead of left to Vite's default, so a Vite upgrade never
 * changes them unnoticed. Desktop Chrome, Edge, Firefox and Safari from early 2023, and Safari on
 * iPhone and iPad from iOS 16.4; the README names them, and a test checks each runs what the script
 * needs (its top-level `await`, ES2022).
 */
export const PROMISED_BROWSERS: readonly { readonly engine: Engine; readonly version: number }[] = [
  { engine: 'chrome', version: 111 },
  { engine: 'edge', version: 111 },
  { engine: 'firefox', version: 114 },
  { engine: 'safari', version: 16.4 },
  { engine: 'ios', version: 16.4 },
];

/** The build's target: the language the code is written in, then each promised browser. */
export const BROWSER_TARGETS: readonly string[] = [
  'es2022',
  ...PROMISED_BROWSERS.map(({ engine, version }) => `${engine}${version}`),
];
