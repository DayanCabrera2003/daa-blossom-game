import type { Level } from '@levels/build';
import {
  CODEX_ENTRIES,
  CODEX_TABS,
  openedBy,
  type CodexEntryId,
  type CodexTab,
  type CodexUnlock,
  type OpenTabs,
} from '@levels/codex';
import { pageOf, type CodexPage } from './codexPage';
import { recordGlossaryRows, recordPageRead, type SaveData } from './save';

/**
 * Which pages of the Codex the player can read (GDD §7), derived like the open levels
 * (`progress.ts`): from the completed levels and what each one opens. Nothing of it is saved, so an
 * old save opens exactly what it won and never drifts from the level files; only the pages
 * already read (and the glossary rows already seen) are kept, for the "new" seal.
 */

/** What the progress reads of a level: its id and the Codex pages it opens when won. */
export interface CodexSource {
  readonly id: string;
  readonly codex: readonly CodexUnlock[];
}

/** The levels of the catalog as the Codex progress reads them. */
export function codexSources(levels: readonly Level[]): CodexSource[] {
  return levels.map((level) => ({ id: level.data.id, codex: level.data.unlocks.codex }));
}

/**
 * The open tabs of each open entry, entries in the order of the book. Every completed level opens
 * its pages; teacher mode opens the whole book (GDD §5.8).
 */
export function openCodex(
  levels: readonly CodexSource[],
  save: SaveData,
  teacherMode: boolean,
): OpenTabs {
  if (teacherMode) {
    return new Map(CODEX_ENTRIES.map((entry) => [entry, new Set<CodexTab>(CODEX_TABS)]));
  }
  const won = levels.filter((level) => save.levels[level.id] !== undefined);
  const open = openedBy(won.flatMap((level) => level.codex));
  return new Map(CODEX_ENTRIES.flatMap((entry) => listed(entry, open.get(entry))));
}

/** An entry and its tabs as a map row, or no row when it is closed. */
const listed = (
  entry: CodexEntryId,
  tabs: ReadonlySet<CodexTab> | undefined,
): [CodexEntryId, ReadonlySet<CodexTab>][] => (tabs === undefined ? [] : [[entry, tabs]]);

/**
 * The entries with rows in the glossary of C13 (plan 07, §1.3): the glossary shows the rows of the
 * open ones, and is whole once C12 is open.
 */
export const GLOSSARY_ENTRIES: readonly CodexEntryId[] = CODEX_ENTRIES.slice(0, 12);

/** The page of C13 that shows the rows of the glossary. */
const GLOSSARY_PAGE: CodexPage = 'C13:bridge';

/** The entries whose rows the glossary shows now: those open among `GLOSSARY_ENTRIES`. */
const glossaryRows = (open: OpenTabs): CodexEntryId[] =>
  GLOSSARY_ENTRIES.filter((entry) => open.has(entry));

/**
 * The open pages the player has not read yet, in the order of the book: those never read, and the
 * page of the glossary when it shows rows of an entry not seen there yet.
 */
export function unreadPages(open: OpenTabs, save: SaveData): Set<CodexPage> {
  const rowsUnseen = glossaryRows(open).some((entry) => !save.glossaryRead.includes(entry));
  return new Set(
    [...open].flatMap(([entry, tabs]) =>
      CODEX_TABS.filter((tab) => tabs.has(tab))
        .map((tab) => pageOf(entry, tab))
        .filter((page) => !save.codexRead.includes(page) || (page === GLOSSARY_PAGE && rowsUnseen)),
    ),
  );
}

/**
 * Whether the book has news: some open tab still unread (the glossary's page included when it shows
 * rows not seen there yet). The Codex sign of the hub wears the "new" seal while it does.
 */
export const hasNewPages = (open: OpenTabs, save: SaveData): boolean =>
  unreadPages(open, save).size > 0;

/**
 * The progress after the player views `page` with the pages `open`: the page is read and, on the
 * glossary's page, so are the rows it shows.
 */
export function markRead(save: SaveData, page: CodexPage, open: OpenTabs): SaveData {
  const read = recordPageRead(save, page);
  return page === GLOSSARY_PAGE ? recordGlossaryRows(read, glossaryRows(open)) : read;
}

/** Whether `after` shows a tab that `before` did not: a win that opened pages of the Codex. */
export function pagesOpened(before: OpenTabs, after: OpenTabs): boolean {
  return [...after].some(([entry, tabs]) => [...tabs].some((tab) => !before.get(entry)?.has(tab)));
}
