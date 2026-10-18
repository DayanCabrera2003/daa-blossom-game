import type { Translate } from '../../src/services/i18n';
import { escapeHtml, PAGES_ROOT } from './pageTexts';

/** The words of the 404 page, from the locale. */
export interface NotFoundWords {
  readonly title: string;
  readonly text: string;
  readonly link: string;
}

/** The 404 page's words in the locale of `t`. */
export const notFoundWords = (t: Translate): NotFoundWords => ({
  title: t('page.notFound.title'),
  text: t('page.notFound.text'),
  link: t('page.notFound.link'),
});

/**
 * The game's own 404 page for GitHub Pages (plan 09, phase 10), written when the game is built
 * (`dist/404.html`): on the game's dark ground (`background` of the palette), in its pixel font at
 * twice its size (`fontPath`, the manifest's path of the font), the locale's words and a link back
 * to the garden. Pages serves it for a missing path at any depth, so its links start at the root
 * the game is published at, not beside the page. It needs no script.
 */
export function notFoundPage(words: NotFoundWords, fontPath: string): string {
  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(words.title)}</title>
    <style>
      @font-face {
        font-family: 'monogram';
        src: url('${PAGES_ROOT}${fontPath}') format('truetype');
      }
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        background: #141b1b;
        color: #f2eaf1;
        font: 32px/26px monogram, monospace;
        text-align: center;
      }
      main {
        padding: 16px;
        max-width: 640px;
      }
      h1 {
        margin: 0 0 16px;
        font: inherit;
        color: #ffe18d;
      }
      a {
        color: #ef914f;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>${escapeHtml(words.title)}</h1>
      <p>${escapeHtml(words.text)}</p>
      <p><a href="${PAGES_ROOT}">${escapeHtml(words.link)}</a></p>
    </main>
  </body>
</html>
`;
}
