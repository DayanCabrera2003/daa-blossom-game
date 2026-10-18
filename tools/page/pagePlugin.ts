import type { Plugin } from 'vite';
import { createTranslator } from '../../src/services/i18n';
import { notFoundPage, notFoundWords } from './notFound';
import { pageWords, writePageTexts } from './pageTexts';

/**
 * The page's words from the locale (plan 09, phase 10): written into `index.html` when it is
 * served or built (its title, description and words without script), and the game's own 404 page
 * written beside it in the build (`dist/404.html`), for GitHub Pages. `fontPath` is the manifest's
 * path of the pixel font, which the 404 page wears.
 */
export function pagePlugin(strings: Readonly<Record<string, string>>, fontPath: string): Plugin {
  const t = createTranslator(strings);
  return {
    name: 'florecer-page',
    transformIndexHtml: {
      order: 'pre',
      handler: (html) => writePageTexts(html, pageWords(t)),
    },
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: '404.html',
        source: notFoundPage(notFoundWords(t), fontPath),
      });
    },
  };
}
