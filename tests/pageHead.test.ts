import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { assetEntry, keysOfKind } from '../src/game/assets/keys';
import { LOADING_TONES } from '../src/game/picture/loadingBar';
import { PALETTE } from '../src/game/view/palette';
import { PAGE_LOADER_ID } from '../src/ui/pageLoader';

// What the page brings before its script (plan 09, phase 9): its icon, taken from a CC0 pack the
// credits already name; the pixel font, preloaded so it downloads beside the script; and a lantern
// drawn in CSS that beats on the dark page until the canvas draws its loading bar. Checked on the source page and, when there is a build, on the built one,
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

describe('the pixel font', () => {
  const font = assetEntry('font.monogram').path;

  it('is preloaded by the page, so it is on its way before the script asks for it', () => {
    expect(linkHref(PAGE, 'preload')).toBe(`/${font}`);
    const link = /<link[^>]*rel="preload"[^>]*>/.exec(PAGE)?.[0] ?? '';
    // A font is fetched in CORS mode: without `crossorigin` the preload is fetched twice.
    expect(link).toMatch(/\bas="font"/);
    expect(link).toMatch(/\btype="font\/ttf"/);
    expect(link).toMatch(/\bcrossorigin\b/);
  });

  it.skipIf(!BUILT)('is preloaded by the built page at a relative path it ships', () => {
    const href = linkHref(builtPage(), 'preload');
    expect(href).not.toBeNull();
    expect(href?.startsWith('/')).toBe(false);
    expect(existsSync(join(DIST, href ?? ''))).toBe(true);
  });
});

describe("the page's lantern", () => {
  /** A palette colour as CSS writes it. */
  const css = (tone: keyof typeof PALETTE): string =>
    `#${PALETTE[tone].toString(16).padStart(6, '0')}`;
  const style = /<style>([\s\S]*?)<\/style>/.exec(PAGE)?.[1] ?? '';
  const loaderRule = new RegExp(`#${PAGE_LOADER_ID}\\s*\\{([^}]*)\\}`).exec(style)?.[1] ?? '';

  it('is on the page before the script, and says nothing: no text, hidden from screen readers', () => {
    const element = new RegExp(`<div id="${PAGE_LOADER_ID}"([^>]*)>([\\s\\S]*?)</div>`).exec(PAGE);
    expect(element).not.toBeNull();
    expect(element?.[1]).toContain('aria-hidden="true"');
    expect(element?.[2]?.trim()).toBe('');
    expect(style).not.toMatch(/content:\s*['"][^'"]/);
  });

  it('is drawn in the tones the loading bar takes over in, centred where the bar appears', () => {
    expect(loaderRule).toContain(css(LOADING_TONES.fill));
    expect(loaderRule).toContain(css(LOADING_TONES.edge));
    expect(loaderRule).toMatch(/left:\s*50%/);
    expect(loaderRule).toMatch(/top:\s*50%/);
    expect(loaderRule).toMatch(/translate\(-50%,\s*-50%\)/);
    // Its pulse goes from the lantern's light to its pale glow, both of the game's palette.
    expect(style).toContain(css('litGlow'));
  });

  it('beats, and holds still when the system asks for less motion', () => {
    expect(loaderRule).toMatch(/animation:/);
    expect(style).toMatch(
      new RegExp(
        `prefers-reduced-motion:\\s*reduce\\)\\s*\\{\\s*#${PAGE_LOADER_ID}\\s*\\{\\s*animation:\\s*none`,
      ),
    );
  });

  it.skipIf(!BUILT)('is kept on the built page', () => {
    expect(builtPage()).toContain(`<div id="${PAGE_LOADER_ID}" aria-hidden="true"></div>`);
  });
});
