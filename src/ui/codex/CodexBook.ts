import { CODEX_TABS, type OpenTabs } from '@levels/codex';
import type { BookRequest } from '@services/busEvents';
import { pageOf } from '@services/codexPage';
import { markRead, unreadPages } from '@services/codexProgress';
import type { Translate } from '@services/i18n';
import {
  canTurn,
  chooseTab,
  endPage,
  followLink,
  moveTo,
  openBook,
  turnPage,
  type BookPlace,
  type BookState,
} from '@ui/model/codexBook';
import { codexIndex } from '@ui/model/codexIndex';
import { bookCommand } from '@ui/model/codexKeys';
import { openOverlay } from '../overlay';
import type { OverlayFrame } from '../shell';
import { codexEntries } from './entries';
import { renderTab, scrollToResult } from './EntryPage';
import './codex.css';

/**
 * The Codex as a book (GDD §5.6; plan 07, phase 3): the index on the left (closed entries as closed
 * pages, the new ones sealed), the page on the right with the tabs open of its entry, and below the
 * ways to turn the pages. Pointer and keyboard both work: the arrows and PageUp/PageDown turn the
 * pages, Home and End go to the ends, 1 2 3 choose a tab, Escape closes. What is open, where the
 * book opens and where each key leads are decided in `ui/model/`; this module only builds the DOM
 * and marks each page read in the shared save as soon as it is shown.
 */

/** Where the picture of the book's wood is, next to the page (public/assets). */
const WOOD_PANEL = `${import.meta.env.BASE_URL}assets/images/ui/wood/panel.png`;

/** A new element of `tag` in `page`, with a class and maybe a text. */
function make<K extends keyof HTMLElementTagNameMap>(
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

/** A button of the book, with the key that finds it again after the page is drawn anew. */
function button(page: Document, className: string, focus: string, onPress: () => void) {
  const made = make(page, 'button', className);
  made.type = 'button';
  made.dataset['focus'] = focus;
  made.addEventListener('click', onPress);
  return made;
}

/** The "new" seal, after a title or on a tab. */
const seal = (page: Document, t: Translate): HTMLElement =>
  make(page, 'span', 'codex-seal', t('codex.new'));

/** The "new" seal of a tab: a small dot beside its name, so the tab keeps to one line. */
function dot(page: Document, t: Translate): HTMLElement {
  const made = make(page, 'span', 'codex-dot');
  made.setAttribute('role', 'img');
  made.setAttribute('aria-label', t('codex.new'));
  return made;
}

/**
 * Opens the Codex in the shell's layer at the entry `request` asks for, when it is open, or at the
 * first page not read yet. With nothing open (it never shows then) the layer closes at once.
 */
export function showCodex(frame: OverlayFrame, request: BookRequest, t: Translate): void {
  const entries = codexEntries();
  const save = frame.saves.get();
  const open: OpenTabs = frame.codexOpen(save);
  const first = openBook(open, unreadPages(open, save), request.entry);
  if (first === null) {
    frame.close();
    return;
  }
  let state: BookState = first;
  const { book, close } = openOverlay(frame, t('codex.title'), 'codex-book');
  const page = book.ownerDocument;
  book.style.setProperty('--wood-panel', `url("${WOOD_PANEL}")`);

  // The parts of the book, built once; `draw` fills them for the page shown. The head is one row:
  // the book's name over the index, and over the page its heading with the way out beside it.
  const title = make(page, 'h1', 'codex-title', t('codex.title'));
  const head = make(page, 'header', 'codex-head');
  const heading = make(page, 'h2', 'codex-heading');
  const gardenTitle = make(page, 'span', 'codex-garden-title');
  const formalTitle = make(page, 'span', 'codex-formal-title');
  heading.append(gardenTitle, formalTitle);
  const closeButton = button(page, 'codex-button codex-close', 'close', close);
  closeButton.textContent = t('codex.close');
  head.append(heading, closeButton);
  const index = make(page, 'nav', 'codex-index');
  index.setAttribute('aria-label', t('codex.contents'));
  const list = make(page, 'ol', 'codex-list');
  index.append(list);
  const sheet = make(page, 'article', 'codex-page');
  const tabs = make(page, 'div', 'codex-tabs');
  tabs.setAttribute('role', 'tablist');
  const text = make(page, 'div', 'codex-text');
  text.setAttribute('role', 'tabpanel');
  text.tabIndex = 0;
  text.dataset['focus'] = 'text';
  // The page its diagrams fit their gardens to (ui/diagram/fitToPage.ts).
  text.dataset['diagramPage'] = '';
  const notice = make(page, 'p', 'codex-notice');
  notice.setAttribute('aria-live', 'polite');
  sheet.append(tabs, text, notice);
  const foot = make(page, 'footer', 'codex-foot');
  const previous = button(page, 'codex-button', 'previous', () => turn(-1));
  previous.textContent = t('codex.previous');
  const next = button(page, 'codex-button', 'next', () => turn(1));
  next.textContent = t('codex.next');
  foot.append(previous, make(page, 'span', 'codex-keys', t('codex.keys')), next);
  book.append(title, head, index, sheet, foot);

  /** Fills the book for the page shown, keeping the keyboard focus on the same control. */
  const draw = (current: BookState): void => {
    const focused = (page.activeElement as HTMLElement | null)?.dataset['focus'];
    const { entry, tab } = current.place;
    const shownRows: HTMLElement[] = [];
    list.replaceChildren(
      ...codexIndex(open, current.sealed, entries).map((row) => {
        const item = make(page, 'li', `codex-row codex-${row.kind}`);
        if (row.kind === 'closed') {
          item.textContent = t('codex.closedPage', { number: row.number });
          return item;
        }
        const go = button(page, 'codex-entry', `entry-${row.entry}`, () =>
          goTo(followLink(open, current, row.entry, null)),
        );
        if (row.entry === entry) {
          go.setAttribute('aria-current', 'page');
          shownRows.push(go);
        }
        go.append(make(page, 'span', 'codex-number', `${row.number}`));
        go.append(make(page, 'span', 'codex-name', row.gardenTitle));
        if (row.isNew) go.append(seal(page, t));
        if (row.formalTitle !== null) go.append(make(page, 'span', 'codex-sub', row.formalTitle));
        // A title cut short by the narrow index is read whole in the row's tooltip.
        go.title = [row.gardenTitle, row.formalTitle ?? ''].filter(Boolean).join('\n');
        item.append(go);
        return item;
      }),
    );
    const shown = entries.get(entry);
    gardenTitle.textContent = shown?.gardenTitle ?? '';
    const formalOpen = open.get(entry)?.has('formal') === true;
    formalTitle.textContent = formalOpen ? (shown?.formalTitle ?? '') : '';
    formalTitle.hidden = !formalOpen;
    // Cut short on the narrow row, the heading is read whole in its tooltip.
    heading.title = [gardenTitle.textContent, formalTitle.textContent].filter(Boolean).join('\n');
    tabs.replaceChildren(
      ...CODEX_TABS.filter((name) => open.get(entry)?.has(name) === true).map((name) => {
        const choose = button(page, 'codex-tab', `tab-${name}`, () =>
          goTo(chooseTab(open, current, name)),
        );
        choose.setAttribute('role', 'tab');
        choose.setAttribute('aria-selected', String(name === tab));
        // Numbered as the keys that choose them.
        choose.textContent = `${CODEX_TABS.indexOf(name) + 1} ${t(`codex.tab.${name}`)}`;
        if (current.sealed.has(pageOf(entry, name))) choose.append(dot(page, t));
        return choose;
      }),
    );
    renderTab(
      text,
      shown?.tabs[tab] ?? '',
      (target, result) => {
        const place = followLink(open, current, target, result);
        if (place === null) {
          notice.textContent = t('codex.closedLink');
          return;
        }
        goTo(place);
        if (result !== null) scrollToResult(text, result);
      },
      t,
    );
    // The new page slides in; the class is set anew so the animation plays again.
    text.classList.remove('codex-turned');
    void text.offsetWidth;
    text.classList.add('codex-turned');
    // The entry shown stays in view in a long index.
    for (const row of shownRows) row.scrollIntoView({ block: 'nearest' });
    previous.disabled = !canTurn(open, current, -1);
    next.disabled = !canTurn(open, current, 1);
    // The focus goes back to the control that had it, or to the text, so the arrows scroll it.
    const again =
      focused === undefined ? null : book.querySelector<HTMLElement>(`[data-focus="${focused}"]`);
    (again !== null && !(again as HTMLButtonElement).disabled ? again : text).focus();
    // Shown is read: the save remembers it at once, the seal stays until the page is left.
    frame.saves.update((saved) => markRead(saved, pageOf(entry, tab), open));
  };

  /** Shows `place`, if there is one, with the sound of a page. */
  const goTo = (place: BookPlace | null): void => {
    if (place === null) return;
    const moved = moveTo(state, place);
    if (moved === state) return;
    state = moved;
    notice.textContent = '';
    frame.bus.emit('sound', 'bookFlip');
    draw(state);
  };
  const turn = (step: 1 | -1): void => goTo(turnPage(open, state, step));

  book.addEventListener('keydown', (event) => {
    const target = event.target as HTMLElement | null;
    // A key meant for a field of a diagram (a slider) stays there; so do shortcuts with modifiers.
    if (target !== null && target.closest('input, select, textarea') !== null) return;
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const command = bookCommand(event.key);
    if (command === null) return;
    event.preventDefault();
    if (command.kind === 'turn') turn(command.step);
    else if (command.kind === 'end') goTo(endPage(open, state, command.step));
    else goTo(chooseTab(open, state, command.tab));
  });
  draw(state);
}
