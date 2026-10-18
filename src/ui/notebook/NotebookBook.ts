import { catalog } from '@levels/catalog';
import type { LineText } from '@services/lines';
import type { Translate } from '@services/i18n';
import type { BookCommand } from '@ui/model/codexKeys';
import { notebookMove, openNotebook } from '@ui/model/notebookBook';
import { notebookPages, notebookSources, type NotebookPage } from '@ui/model/notebookPages';
import { focusAgain, focusedKey, openBookFrame, setHeading, turnIn } from '../book/bookFrame';
import { button, make } from '../book/bookParts';
import { codexEntries } from '../codex/entries';
import type { OverlayFrame } from '../shell';
import './notebook.css';

/**
 * The Cuaderno as a book (GDD §5.5; plan 07, phase 6), on the frame every book shares
 * (`ui/book/bookFrame.ts`): the statements the player wrote in the index, in the order written,
 * and on the page the one shown, its start and its right ending in the player's own words (the
 * lines they chose), with the level where it was written. Under it, the way to the entry of the
 * Codex that translates it, at its formal tab when that is open; while that entry is closed, the
 * page says it will be translated later. What the pages are and where each key leads are decided
 * in `ui/model/`; this module only builds the DOM.
 */

/** The commands of the arrows, to switch them on or off. */
const TURN_BACK: BookCommand = { kind: 'turn', step: -1 };
const TURN_ON: BookCommand = { kind: 'turn', step: 1 };

/** Opens the notebook in the shell's layer, at the statement written last. */
export function showNotebook(frame: OverlayFrame, t: Translate, line: LineText): void {
  const save = frame.saves.get();
  const open = frame.codexOpen(save);
  const pages = notebookPages(notebookSources(catalog()), save.notebook, open);
  const titles = codexEntries();
  let shown = openNotebook(pages.length);

  /** Shows the page a command leads to, if any, with the sound of a page. */
  const move = (command: BookCommand): void => {
    if (shown === null) return;
    const target = notebookMove(pages.length, shown, command);
    if (target === null) return;
    shown = target;
    frame.bus.emit('sound', 'bookFlip');
    draw();
  };
  const parts = openBookFrame(
    frame,
    {
      name: 'notebook',
      title: t('notebook.book.title'),
      codexOpen: open.size > 0,
      className: 'notebook-book',
      keys: t('notebook.book.keys'),
      onTurn: (step) => move({ kind: 'turn', step }),
      onCommand: move,
    },
    t,
  );
  const { book, list, text, previous, next } = parts;
  const page = book.ownerDocument;

  /** The words of a statement's page: its start, its ending, and the way to its translation. */
  const statement = (written: NotebookPage): HTMLElement[] => {
    const words = [
      make(page, 'p', 'notebook-prompt', line(written.prompt)),
      ...written.endings.map((ending) => make(page, 'p', 'notebook-ending', line(ending))),
    ];
    const { link } = written;
    if (link === null)
      return [...words, make(page, 'p', 'notebook-later', t('notebook.book.later'))];
    const title = titles.get(link.entry)?.gardenTitle ?? link.entry;
    const translate = button(page, 'book-button notebook-translate', 'translate', () =>
      frame.bus.emit('book.open', { book: 'codex', entry: link.entry, tab: link.tab }),
    );
    translate.textContent = t('notebook.book.translate', { title });
    return [...words, translate];
  };

  /** Fills the book for the page shown, keeping the keyboard focus on the same control. */
  const draw = (): void => {
    const focused = focusedKey(parts);
    const rows: HTMLElement[] = [];
    list.replaceChildren(
      ...pages.map((written, i) => {
        const item = make(page, 'li', 'notebook-row');
        const go = button(page, 'notebook-entry', `page-${i}`, () => goTo(i));
        if (i === shown) {
          go.setAttribute('aria-current', 'page');
          rows.push(go);
        }
        go.append(make(page, 'span', 'notebook-level', written.level));
        go.append(make(page, 'span', 'notebook-name', line(written.prompt)));
        go.title = line(written.prompt);
        item.append(go);
        return item;
      }),
    );
    const written = shown === null ? undefined : pages[shown];
    setHeading(
      parts,
      t('notebook.title'),
      written === undefined ? null : t('notebook.book.level', { level: written.level }),
    );
    text.replaceChildren(
      ...(written === undefined
        ? [make(page, 'p', 'notebook-empty', t('notebook.book.empty'))]
        : statement(written)),
    );
    text.scrollTop = 0;
    turnIn(parts);
    // The statement shown stays in view in a long index.
    for (const row of rows) row.scrollIntoView({ block: 'nearest' });
    previous.disabled = shown === null || notebookMove(pages.length, shown, TURN_BACK) === null;
    next.disabled = shown === null || notebookMove(pages.length, shown, TURN_ON) === null;
    focusAgain(parts, focused);
  };

  /** Shows page `i` of the index, with the sound of a page. */
  const goTo = (i: number): void => {
    if (i === shown) return;
    shown = i;
    frame.bus.emit('sound', 'bookFlip');
    draw();
  };
  draw();
}
