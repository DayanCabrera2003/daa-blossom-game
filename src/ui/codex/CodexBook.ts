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
import { focusAgain, focusedKey, openBookFrame, setHeading, turnIn } from '../book/bookFrame';
import { button, dot, make, seal } from '../book/bookParts';
import type { OverlayFrame } from '../shell';
import { codexEntries } from './entries';
import { renderTab, scrollToResult } from './EntryPage';
import './codex.css';

/**
 * The Codex as a book (GDD §5.6; plan 07, phase 3), on the frame every book shares
 * (`ui/book/bookFrame.ts`): the index on the left (closed entries as closed pages, the new ones
 * sealed), the page on the right with the tabs open of its entry, and above them the ways to turn
 * the pages and to close the book. Pointer and keyboard both work: the arrows and PageUp/PageDown
 * turn the pages, Home and End go to the ends, 1 2 3 choose a tab, Escape closes. What is open,
 * where the book opens and where each key leads are decided in `ui/model/`; this module only
 * builds the DOM and marks each page read in the shared save as soon as it is shown.
 */

/**
 * Opens the Codex in the shell's layer at the entry (and tab) `request` asks for, when it is open,
 * or at the first page not read yet. With nothing open (it never shows then) the layer closes at once.
 */
export function showCodex(frame: OverlayFrame, request: BookRequest, t: Translate): void {
  const entries = codexEntries();
  const save = frame.saves.get();
  const open: OpenTabs = frame.codexOpen(save);
  const first = openBook(open, unreadPages(open, save), request.entry, request.tab);
  if (first === null) {
    frame.close();
    return;
  }
  let state: BookState = first;
  const parts = openBookFrame(
    frame,
    {
      name: 'codex',
      title: t('codex.title'),
      codexOpen: true,
      className: 'codex-book',
      keys: t('codex.keys'),
      onTurn: (step) => turn(step),
      onCommand: (command) => {
        if (command.kind === 'turn') turn(command.step);
        else if (command.kind === 'end') goTo(endPage(open, state, command.step));
        else goTo(chooseTab(open, state, command.tab));
      },
    },
    t,
  );
  const { book, list, tabs, text, notice, previous, next } = parts;
  const page = book.ownerDocument;
  // The page its diagrams fit their gardens to (ui/diagram/fitToPage.ts).
  text.dataset['diagramPage'] = '';

  /** Fills the book for the page shown, keeping the keyboard focus on the same control. */
  const draw = (current: BookState): void => {
    const focused = focusedKey(parts);
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
    // The garden title, and the formal one once its tab is open.
    const formalOpen = open.get(entry)?.has('formal') === true;
    setHeading(parts, shown?.gardenTitle ?? '', formalOpen ? (shown?.formalTitle ?? '') : null);
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
    turnIn(parts);
    // The entry shown stays in view in a long index.
    for (const row of shownRows) row.scrollIntoView({ block: 'nearest' });
    previous.disabled = !canTurn(open, current, -1);
    next.disabled = !canTurn(open, current, 1);
    focusAgain(parts, focused);
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

  draw(state);
}
