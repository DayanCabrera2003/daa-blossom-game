import type { SaveData } from './save';

/** What progress needs to know of a level of the catalog: its id and whether it is a draft. */
export interface CatalogEntry {
  readonly id: string;
  readonly draft: boolean;
}

/**
 * The levels a player gets to see, in catalog order. Drafts (test levels of chapters not yet
 * written) exist only for teacher mode, which shows everything (GDD §5.8).
 */
export function visibleLevels<T extends CatalogEntry>(
  levels: readonly T[],
  teacherMode: boolean,
): T[] {
  return teacherMode ? [...levels] : levels.filter((level) => !level.draft);
}

/**
 * The levels a player can open: the first one, every completed one, and the one right after each
 * completed level in catalog order. Catalog order (not "the previous level of the same chapter")
 * also opens the first level of each chapter. Drafts are left out before counting, so they never
 * open and never open the level after them; the next finished level takes their place. Teacher
 * mode opens everything, drafts included (GDD §5.8).
 */
export function unlockedLevels(
  levels: readonly CatalogEntry[],
  save: SaveData,
  teacherMode: boolean,
): Set<string> {
  const orderedIds = visibleLevels(levels, teacherMode).map((level) => level.id);
  if (teacherMode) return new Set(orderedIds);
  const open = new Set<string>(orderedIds.slice(0, 1));
  orderedIds.forEach((id, index) => {
    if (save.levels[id] === undefined) return;
    open.add(id);
    const next = orderedIds[index + 1];
    if (next !== undefined) open.add(next);
  });
  return open;
}
