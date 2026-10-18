import type { Translate } from '@services/i18n';

/**
 * The small DOM parts both books are built from (plan 07, phases 3 and 6): an element with its
 * class and text, a wooden button that can be found again after its page is drawn anew, and the
 * "new" seal, written in full or as a dot beside a tab.
 */

/** A new element of `tag` in `page`, with a class and maybe a text. */
export function make<K extends keyof HTMLElementTagNameMap>(
  page: Document,
  tag: K,
  className: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const element = page.createElement(tag);
  element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

/** A button of a book, with the key that finds it again after the page is drawn anew. */
export function button(
  page: Document,
  className: string,
  focus: string,
  onPress: () => void,
): HTMLButtonElement {
  const made = make(page, 'button', className);
  made.type = 'button';
  made.dataset['focus'] = focus;
  made.addEventListener('click', onPress);
  return made;
}

/** The "new" seal, after a title in the index. */
export const seal = (page: Document, t: Translate): HTMLElement =>
  make(page, 'span', 'book-seal', t('codex.new'));

/** The "new" seal of a tab: a small dot beside its name, so the tab keeps to one line. */
export function dot(page: Document, t: Translate): HTMLElement {
  const made = make(page, 'span', 'book-dot');
  made.setAttribute('role', 'img');
  made.setAttribute('aria-label', t('codex.new'));
  return made;
}
