import {
  CODEX_ENTRIES,
  CODEX_TABS,
  type CodexEntryId,
  type CodexTab,
  type OpenTabs,
} from '@levels/codex';
import { pageOf, type CodexPage } from '@services/codexPage';

/**
 * Where the open Codex is, and which pages wear the "new" seal while it is open. The book opens at
 * the entry asked for (a link of the notebook) or at the first page not read yet, and turns between
 * open entries only. A page keeps its seal while the player reads it, so the seal is seen, and
 * loses it once left; the save marks it read as soon as it is shown.
 */

/** A page of the book: an entry and one of its tabs. */
export interface BookPlace {
  readonly entry: CodexEntryId;
  readonly tab: CodexTab;
}

/** The open book: the page shown, and the pages still wearing the seal. */
export interface BookState {
  readonly place: BookPlace;
  readonly sealed: ReadonlySet<CodexPage>;
}

/** The open tabs of `entry`, in the order of the book. */
const tabsOf = (open: OpenTabs, entry: CodexEntryId): CodexTab[] =>
  CODEX_TABS.filter((tab) => open.get(entry)?.has(tab) === true);

/** The open entries, in the order of the book. */
const entriesOf = (open: OpenTabs): CodexEntryId[] =>
  CODEX_ENTRIES.filter((entry) => tabsOf(open, entry).length > 0);

/** Where an open entry is opened: at its first unread tab, or else at its first tab. */
function placeIn(open: OpenTabs, entry: CodexEntryId, unread: ReadonlySet<CodexPage>): BookPlace {
  const tabs = tabsOf(open, entry);
  const tab = tabs.find((candidate) => unread.has(pageOf(entry, candidate))) ?? tabs[0];
  return { entry, tab: tab as CodexTab };
}

/** The page of `tab` in another open entry, or of its first tab when `tab` is not open there. */
function keepTab(open: OpenTabs, entry: CodexEntryId, tab: CodexTab): BookPlace {
  const tabs = tabsOf(open, entry);
  return { entry, tab: tabs.includes(tab) ? tab : (tabs[0] as CodexTab) };
}

/**
 * The book as it opens: at `requested` when that entry is open (at its tab `tab` when that one is
 * open too, as a link of the notebook asks), else at the first entry with an unread page, else at
 * the first open entry; every unread page wears the seal. Null when nothing is open.
 */
export function openBook(
  open: OpenTabs,
  unread: ReadonlySet<CodexPage>,
  requested?: string,
  tab?: CodexTab,
): BookState | null {
  const entries = entriesOf(open);
  const asked = entries.find((entry) => entry === requested);
  const fresh = entries.find((entry) =>
    tabsOf(open, entry).some((candidate) => unread.has(pageOf(entry, candidate))),
  );
  const entry = asked ?? fresh ?? entries[0];
  if (entry === undefined) return null;
  const place =
    asked !== undefined && tab !== undefined && tabsOf(open, asked).includes(tab)
      ? { entry: asked, tab }
      : placeIn(open, entry, unread);
  return { place, sealed: new Set(unread) };
}

/**
 * The page one open entry forward (`step` 1) or back (-1): the same tab when that entry has it
 * open, else its first tab. Null at either end of the book.
 */
export function turnPage(open: OpenTabs, state: BookState, step: 1 | -1): BookPlace | null {
  const entries = entriesOf(open);
  const entry = entries[entries.indexOf(state.place.entry) + step];
  if (entry === undefined) return null;
  return keepTab(open, entry, state.place.tab);
}

/**
 * The first open entry (`step` -1) or the last (1), keeping the tab as turning does; null when the
 * book is already there.
 */
export function endPage(open: OpenTabs, state: BookState, step: 1 | -1): BookPlace | null {
  const entries = entriesOf(open);
  const entry = step === 1 ? entries.at(-1) : entries[0];
  if (entry === undefined || entry === state.place.entry) return null;
  return keepTab(open, entry, state.place.tab);
}

/** Whether there is an open entry `step` away, to switch the arrows of the book on or off. */
export const canTurn = (open: OpenTabs, state: BookState, step: 1 | -1): boolean =>
  turnPage(open, state, step) !== null;

/** The page of `tab` in the entry shown, or null when that tab is not open. */
export function chooseTab(open: OpenTabs, state: BookState, tab: CodexTab): BookPlace | null {
  return tabsOf(open, state.place.entry).includes(tab) ? { entry: state.place.entry, tab } : null;
}

/** The book showing `place`: the page left loses its seal; staying on the page changes nothing. */
export function moveTo(state: BookState, place: BookPlace): BookState {
  if (place.entry === state.place.entry && place.tab === state.place.tab) return state;
  const sealed = new Set(state.sealed);
  sealed.delete(pageOf(state.place.entry, state.place.tab));
  return { place, sealed };
}

/**
 * Where a link of the book leads (`#C8`, or `#C8-T8.1` to a result): to that entry, in the tab
 * shown when it is open there (the formal tab, where results live, for a link to a result), or
 * nowhere when the entry is still closed, so the book can say so.
 */
export function followLink(
  open: OpenTabs,
  state: BookState,
  entry: string,
  result: string | null,
): BookPlace | null {
  const target = entriesOf(open).find((candidate) => candidate === entry);
  if (target === undefined) return null;
  return keepTab(open, target, result === null ? state.place.tab : 'formal');
}
