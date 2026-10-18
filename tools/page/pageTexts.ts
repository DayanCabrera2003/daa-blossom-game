import type { Translate } from '../../src/services/i18n';

/**
 * Where GitHub Pages serves the published game: the project's own path on the author's site. The
 * game's files are linked relatively (`base: './'` in vite.config.ts), but the 404 page is served
 * for any missing path, at any depth, so it links the game and its font from here.
 */
export const PAGES_ROOT = '/daa-blossom-game/';

/** The words of the page itself, from the locale. */
export interface PageWords {
  readonly title: string;
  readonly description: string;
  /** What the page says to a browser without JavaScript. */
  readonly noscript: string;
}

/** The page's words in the locale of `t`. */
export const pageWords = (t: Translate): PageWords => ({
  title: t('hub.title'),
  description: t('page.description'),
  noscript: t('page.noscript'),
});

/** `text` safe inside HTML, as text or as an attribute's value. */
export const escapeHtml = (text: string): string =>
  text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

/** How the words without script look: the game's paper on its dark ground, in its pixel font. */
const NOSCRIPT_STYLE =
  'margin:0;padding:32px 16px;text-align:center;color:#f2eaf1;font:32px/26px monogram,monospace';

/**
 * The source page `html` with its words written in (plan 09, phase 10): the title, a description
 * after it, and the words without script first in the body. The source leaves its title empty and
 * has neither of the others, so every visible word of the page comes from the locale.
 */
export function writePageTexts(html: string, words: PageWords): string {
  const title = /<title>[^<]*<\/title>/;
  if (!title.test(html) || !html.includes('<body>')) {
    throw new Error('the page has no <title> or no <body> to write its words into');
  }
  const head = [
    `<title>${escapeHtml(words.title)}</title>`,
    `<meta name="description" content="${escapeHtml(words.description)}" />`,
  ].join('\n    ');
  const noscript = `<noscript><p style="${NOSCRIPT_STYLE}">${escapeHtml(words.noscript)}</p></noscript>`;
  return html.replace(title, head).replace('<body>', `<body>\n    ${noscript}`);
}
