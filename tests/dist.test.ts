import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import strings from '../src/content/es/strings.json';
import fallbackJson from '../src/game/assets/fallbacks.json';
import manifestJson from '../src/game/assets/manifest.json';
import { createTranslator } from '../src/services/i18n';
import { escapeHtml } from '../tools/page/pageTexts';

// The built game as GitHub Pages serves it (plan 09, phase 10), read from dist/ when there is a
// build: CI runs this after `npm run build`; without a build it is skipped. Pages serves the game
// under the project's path, so nothing may be linked from the site's root.

const DIST = fileURLToPath(new URL('../dist', import.meta.url));
const BUILT = existsSync(join(DIST, 'index.html'));
const t = createTranslator(strings);
const read = (path: string): string => readFileSync(join(DIST, path), 'utf8');

/** Every built file of a kind the browser reads for links: the pages, the scripts, the styles. */
const linkingFiles = (): string[] => [
  ...readdirSync(DIST).filter((name) => name.endsWith('.html')),
  ...readdirSync(join(DIST, 'assets'))
    .filter((name) => /\.(js|css)$/.test(name))
    .map((name) => `assets/${name}`),
];

describe.skipIf(!BUILT)('the built game', () => {
  it('links nothing from the root of the site: every path is relative', () => {
    const absolute = /["'(=]\/assets\//;
    const offenders = linkingFiles().filter((path) => absolute.test(read(path)));
    expect(offenders).toEqual([]);
  });

  it('ships every file the manifest names, and every audio fallback', () => {
    const paths = [
      ...Object.values(manifestJson.assets).map((entry) => entry.path),
      ...Object.values(fallbackJson.files).map((entry) => entry.path),
    ];
    expect(paths.length).toBeGreaterThan(100);
    expect(paths.filter((path) => !existsSync(join(DIST, path)))).toEqual([]);
  });

  it('has its own 404 page, in the words of the locale', () => {
    expect(existsSync(join(DIST, '404.html'))).toBe(true);
    expect(read('404.html')).toContain(escapeHtml(t('page.notFound.text')));
  });

  it("says the locale's words without script, and wears its title and description", () => {
    const page = read('index.html');
    expect(page).toMatch(
      new RegExp(`<noscript>[\\s\\S]*${escapeHtml(t('page.noscript'))}[\\s\\S]*</noscript>`),
    );
    expect(page).toContain(`<title>${escapeHtml(t('hub.title'))}</title>`);
    expect(page).toContain(`content="${escapeHtml(t('page.description'))}"`);
  });
});
