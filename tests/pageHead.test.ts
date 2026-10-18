import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { assetEntry, keysOfKind } from '../src/game/assets/keys';

// What the page brings before its script (plan 09, phase 9): its icon, taken from a CC0 pack the
// credits already name. Checked on the source page and, when there is a build, on the built one,
// where every path must be relative so the game works under the GitHub Pages sub-path.

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PAGE = readFileSync(join(ROOT, 'index.html'), 'utf8');
const DIST = join(ROOT, 'dist');
const BUILT = existsSync(join(DIST, 'index.html'));
const builtPage = (): string => readFileSync(join(DIST, 'index.html'), 'utf8');

/** The `href` of the page's `<link rel="…">`, or null when it has none. */
const linkHref = (page: string, rel: string): string | null =>
  new RegExp(`<link[^>]*\\brel="${rel}"[^>]*\\bhref="([^"]+)"`).exec(page)?.[1] ?? null;

describe('the page icon', () => {
  const icons = keysOfKind('icon');

  it('is one picture of the manifest, from a pack the credits name', () => {
    expect(icons).toEqual(['icon.favicon']);
    expect(assetEntry('icon.favicon')).toMatchObject({ pack: 'ninja', group: 'boot' });
    expect(assetEntry('icon.favicon').path).toMatch(/^assets\/images\/[^/]+\.png$/);
  });

  it('is linked by the page as a PNG', () => {
    expect(linkHref(PAGE, 'icon')).toBe(`/${assetEntry('icon.favicon').path}`);
    expect(PAGE).toMatch(/<link[^>]*rel="icon"[^>]*type="image\/png"/);
  });

  it.skipIf(!BUILT)('is linked by the built page at a relative path it ships', () => {
    const href = linkHref(builtPage(), 'icon');
    expect(href).not.toBeNull();
    expect(href?.startsWith('/')).toBe(false);
    expect(existsSync(join(DIST, href ?? ''))).toBe(true);
  });
});
