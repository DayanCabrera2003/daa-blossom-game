import type { Translate } from '@services/i18n';
import { bookCommand, type BookCommand } from '@ui/model/codexKeys';
import { openOverlay } from '../overlay';
import type { OverlayFrame } from '../shell';
import { button, make } from './bookParts';
import './book.css';

/**
 * The layout every book shares (plan 07, phases 3 and 6), laid out as `ui/model/bookLayout.ts`
 * measures it: the head is the only row besides the page, with over the index the book's name and
 * the arrows that turn its pages and over the page its heading (a main title, and a second one
 * that gives way first) with the way out beside it; under the head, the index on the left with
 * the help of the keys under it, and the page on the right, its tabs over its text on paper. The
 * frame also takes the book's keys, leaving alone those meant for a field of the page; what each
 * one does is the book's.
 */

/** Where the picture of the book's wood is, next to the page (public/assets). */
const WOOD_PANEL = `${import.meta.env.BASE_URL}assets/images/ui/wood/panel.png`;

/** What a book asks of its frame. */
export interface BookFrameOptions {
  /** The book's name, over its index and for a screen reader. */
  readonly title: string;
  /** The class of the book's element, for its own stylesheet. */
  readonly className: string;
  /** The help of the keys, under the index. */
  readonly keys: string;
  /** Called with the arrows of the head: a page back (-1) or forth (1). */
  readonly onTurn: (step: 1 | -1) => void;
  /** Called with each command of the keyboard (`ui/model/codexKeys.ts`). */
  readonly onCommand: (command: BookCommand) => void;
}

/** The parts of an open book its owner fills for the page shown. */
export interface BookFrame {
  readonly book: HTMLElement;
  readonly close: () => void;
  readonly previous: HTMLButtonElement;
  readonly next: HTMLButtonElement;
  /** The heading of the page: the main title, and the second one that gives way first. */
  readonly heading: HTMLElement;
  readonly mainTitle: HTMLElement;
  readonly subTitle: HTMLElement;
  /** The list of the index. */
  readonly list: HTMLOListElement;
  /** The row of the tabs over the text; it takes no room while empty. */
  readonly tabs: HTMLElement;
  /** The text of the page, on paper: it scrolls, and takes the arrows of the keyboard. */
  readonly text: HTMLElement;
  /** A line under the text for what the book tells the reader. */
  readonly notice: HTMLElement;
}

/** Opens a book's frame in the shell's layer with the parts every book has, empty. */
export function openBookFrame(
  frame: OverlayFrame,
  options: BookFrameOptions,
  t: Translate,
): BookFrame {
  const { book, close } = openOverlay(frame, options.title, options.className);
  const page = book.ownerDocument;
  book.style.setProperty('--wood-panel', `url("${WOOD_PANEL}")`);

  const corner = make(page, 'div', 'book-corner');
  const previous = button(page, 'book-button book-turn', 'previous', () => options.onTurn(-1));
  previous.textContent = t('book.previous');
  previous.setAttribute('aria-label', t('book.previousPage'));
  previous.title = t('book.previousPage');
  const next = button(page, 'book-button book-turn', 'next', () => options.onTurn(1));
  next.textContent = t('book.next');
  next.setAttribute('aria-label', t('book.nextPage'));
  next.title = t('book.nextPage');
  corner.append(make(page, 'h1', 'book-title', options.title), previous, next);

  const head = make(page, 'header', 'book-head');
  const heading = make(page, 'h2', 'book-heading');
  const mainTitle = make(page, 'span', 'book-main-title');
  const subTitle = make(page, 'span', 'book-sub-title');
  heading.append(mainTitle, subTitle);
  const closeButton = button(page, 'book-button book-close', 'close', close);
  closeButton.textContent = t('book.close');
  head.append(heading, closeButton);

  const index = make(page, 'nav', 'book-index');
  index.setAttribute('aria-label', t('book.contents'));
  const list = make(page, 'ol', 'book-list');
  index.append(list, make(page, 'p', 'book-keys', options.keys));

  const sheet = make(page, 'article', 'book-page');
  const tabs = make(page, 'div', 'book-tabs');
  tabs.setAttribute('role', 'tablist');
  const text = make(page, 'div', 'book-text');
  text.setAttribute('role', 'tabpanel');
  text.tabIndex = 0;
  text.dataset['focus'] = 'text';
  const notice = make(page, 'p', 'book-notice');
  notice.setAttribute('aria-live', 'polite');
  sheet.append(tabs, text, notice);
  book.append(corner, head, index, sheet);

  book.addEventListener('keydown', (event) => {
    const target = event.target as HTMLElement | null;
    // A key meant for a field of the page (a slider) stays there; so do shortcuts with modifiers.
    if (target !== null && target.closest('input, select, textarea') !== null) return;
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const command = bookCommand(event.key);
    if (command === null) return;
    event.preventDefault();
    options.onCommand(command);
  });
  return { book, close, previous, next, heading, mainTitle, subTitle, list, tabs, text, notice };
}

/** Writes the heading of the page; cut short on its narrow row, it is read whole in its tooltip. */
export function setHeading(parts: BookFrame, main: string, sub: string | null): void {
  parts.mainTitle.textContent = main;
  parts.subTitle.textContent = sub ?? '';
  parts.subTitle.hidden = sub === null;
  parts.heading.title = [main, sub ?? ''].filter(Boolean).join('\n');
}

/** Slides a new page in; the class is set anew so the animation plays again. */
export function turnIn(parts: BookFrame): void {
  parts.text.classList.remove('book-turned');
  void parts.text.offsetWidth;
  parts.text.classList.add('book-turned');
}

/**
 * Gives the focus back to the control that had it (`focused`, its `data-focus`) after the page is
 * drawn anew, or to the text, so the arrows scroll it.
 */
export function focusAgain(parts: BookFrame, focused: string | undefined): void {
  const again =
    focused === undefined
      ? null
      : parts.book.querySelector<HTMLElement>(`[data-focus="${focused}"]`);
  (again !== null && !(again as HTMLButtonElement).disabled ? again : parts.text).focus();
}

/** The `data-focus` of the control that has the keyboard focus in `parts`, if any. */
export const focusedKey = (parts: BookFrame): string | undefined =>
  (parts.book.ownerDocument.activeElement as HTMLElement | null)?.dataset['focus'];
