import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import config from '../vite.config';
import { BROWSER_TARGETS, PROMISED_BROWSERS } from '../tools/page/browsers';

// The browsers the game promises (plan 09, phase 10; open question 5: Vite's "widely available"
// of its version), written out so the build is compiled for them and the README names them.

/** The first version of each browser with what the game's script needs at the top level. */
const NEEDS = {
  // `await` at the top of main.ts, and ES2022 (`lib` of tsconfig.json): class fields, `at()`.
  chrome: 94,
  edge: 94,
  firefox: 93,
  safari: 15.4,
  ios: 15.4,
} as const;

describe('the browsers the game is built for', () => {
  it('are the build target, with the language the code is written in', () => {
    expect(config.build?.target).toEqual(BROWSER_TARGETS);
    expect(BROWSER_TARGETS[0]).toBe('es2022');
  });

  it('each run what the script needs at its top level', () => {
    for (const { engine, version } of PROMISED_BROWSERS) {
      expect(version).toBeGreaterThanOrEqual(NEEDS[engine]);
    }
  });

  it('are the promised list, one target per browser', () => {
    expect(BROWSER_TARGETS.slice(1)).toEqual(
      PROMISED_BROWSERS.map(({ engine, version }) => `${engine}${version}`),
    );
  });
});

describe('the README', () => {
  it('names each promised browser and its version', () => {
    const readme = readFileSync(new URL('../README.md', import.meta.url), 'utf8');
    const names = {
      chrome: 'Chrome',
      edge: 'Edge',
      firefox: 'Firefox',
      safari: 'Safari',
      ios: 'iPhone',
    };
    for (const { engine, version } of PROMISED_BROWSERS) {
      expect(readme).toContain(names[engine]);
      expect(readme).toContain(`${version}+`);
    }
  });
});
