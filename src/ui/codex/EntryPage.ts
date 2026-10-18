import type { Translate } from '@services/i18n';
import { mountDiagram } from '@ui/diagram/mountDiagram';
import { markdownToHtml } from '@ui/math/markdown';
import { resultTitle } from '@ui/model/codexStructure';

/**
 * Draws one tab of a Codex entry into the page of the book: its Markdown as HTML, formulas in
 * KaTeX (`ui/math/markdown.ts`). A link to another entry (`#C8`, `#C8-T8.1`) is handed to the book,
 * which turns to it if it is open or says it is still closed; a link outside the book opens in a
 * new window, so the game stays where it was. Each hole a diagram block leaves is filled with its
 * small garden (`ui/diagram/`); the holes of the tables of the glossary stay empty until their
 * phase fills them (plan 07, phase 10).
 */

/** What the page does with a link to an entry or one of its results. */
export type FollowLink = (entry: string, result: string | null) => void;

/** Fills `page` with the HTML of `markdown`, wiring its links and drawing its diagrams. */
export function renderTab(
  page: HTMLElement,
  markdown: string,
  follow: FollowLink,
  t: Translate,
): void {
  page.innerHTML = markdownToHtml(markdown);
  for (const link of page.querySelectorAll<HTMLAnchorElement>('a[href]')) {
    const entry = link.dataset['codexEntry'];
    if (entry === undefined) {
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      continue;
    }
    link.addEventListener('click', (event) => {
      event.preventDefault();
      follow(entry, link.dataset['codexResult'] ?? null);
    });
  }
  for (const hole of page.querySelectorAll<HTMLElement>('.codex-diagram')) mountDiagram(hole, t);
  page.scrollTop = 0;
}

/** Scrolls the page to the result a link named (`T8.1`), when the page states it. */
export function scrollToResult(page: HTMLElement, result: string): void {
  const title = resultTitle(result);
  if (title === null) return;
  // "Teorema 8.1" opens its heading, and no digit follows it ("Teorema 8.10" is another one).
  const heading = [...page.querySelectorAll('strong')].find((strong) => {
    const text = strong.textContent ?? '';
    return text.startsWith(title) && !/^\d/.test(text.slice(title.length));
  });
  heading?.scrollIntoView({ block: 'start' });
}
