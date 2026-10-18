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
import type { SaveData } from './save';

/**
 * Which pages of the Codex the player can read (GDD §7), derived like the open levels
 * (`progress.ts`): from the completed levels and what each one opens. Nothing of it is saved, so an
 * old save opens exactly what it won and never drifts from the level files; only the entries
 * already read are kept, for the "new" seal.
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

/** The open entries the player has not read yet, in the order of the book. */
export function newEntries(open: OpenTabs, save: SaveData): CodexEntryId[] {
  return [...open.keys()].filter((entry) => !save.codexRead.includes(entry));
}

/** Whether `after` shows a tab that `before` did not: a win that opened pages of the Codex. */
export function pagesOpened(before: OpenTabs, after: OpenTabs): boolean {
  return [...after].some(([entry, tabs]) => [...tabs].some((tab) => !before.get(entry)?.has(tab)));
}
