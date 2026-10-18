import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import manifest from '../src/game/assets/manifest.json';
import strings from '../src/content/es/strings.json';
import { PALETTE } from '../src/game/view/palette';
import { createTranslator } from '../src/services/i18n';
import { notFoundPage, notFoundWords } from '../tools/page/notFound';
import { escapeHtml, pageWords, PAGES_ROOT, writePageTexts } from '../tools/page/pageTexts';

// The words of the page itself (plan 09, phase 10): its title, its description and what it says
// without JavaScript, and its own 404 page for GitHub Pages, all taken from strings.json when the
// game is built, never written in the HTML by hand.

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PAGE = readFileSync(join(ROOT, 'index.html'), 'utf8');
const t = createTranslator(strings);
const hex = (colour: number): string => `#${colour.toString(16).padStart(6, '0')}`;

describe("the page's words", () => {
  it('are not written in the source page by hand', () => {
    expect(PAGE).toMatch(/<title><\/title>/);
    expect(PAGE).not.toMatch(/<noscript/);
    expect(PAGE).not.toMatch(/name="description"/);
    expect(PAGE).not.toContain(t('page.noscript'));
  });

  it('are written into it from the locale: the title, the description and the words without script', () => {
    const page = writePageTexts(PAGE, pageWords(t));
    expect(page).toContain(`<title>${t('hub.title')}</title>`);
    expect(page).toContain(
      `<meta name="description" content="${escapeHtml(t('page.description'))}" />`,
    );
    expect(page).toMatch(
      new RegExp(`<noscript>[\\s\\S]*${t('page.noscript')}[\\s\\S]*</noscript>`),
    );
    // The words without script come first in the body, before the lantern that waits for it.
    expect(page.indexOf('<noscript>')).toBeLessThan(page.indexOf('id="page-loader"'));
  });

  it('are escaped, so no word of the locale can break the page', () => {
    expect(escapeHtml(`"<a & b>'`)).toBe('&quot;&lt;a &amp; b&gt;&#39;');
    const page = writePageTexts(PAGE, { title: 'a<b', description: 'say "hi"', noscript: 'x & y' });
    expect(page).toContain('<title>a&lt;b</title>');
    expect(page).toContain('content="say &quot;hi&quot;"');
    expect(page).toContain('x &amp; y');
  });

  it('cannot be written into a page without a title or a body', () => {
    expect(() => writePageTexts('<html></html>', pageWords(t))).toThrow();
  });
});

describe('the 404 page', () => {
  const font = manifest.assets['font.monogram'].path;
  const page = notFoundPage(notFoundWords(t), font);

  it("says the locale's words and leads back to the garden at the root of the published game", () => {
    expect(page).toContain(`<title>${escapeHtml(t('page.notFound.title'))}</title>`);
    expect(page).toContain(escapeHtml(t('page.notFound.text')));
    expect(page).toContain(`<a href="${PAGES_ROOT}">${escapeHtml(t('page.notFound.link'))}</a>`);
    expect(page).toMatch(/^<!doctype html>/);
    expect(page).toContain('<html lang="es">');
  });

  it("wears the game's dark ground and pixel font, from the root whatever path was asked", () => {
    expect(page).toContain(hex(PALETTE.background));
    expect(page).toContain(`url('${PAGES_ROOT}${font}')`);
  });

  it('is published at the root GitHub Pages serves the game from: the project, named as its package', () => {
    const { name } = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')) as {
      name: string;
    };
    expect(PAGES_ROOT).toBe(`/${name}/`);
  });
});
