import type { Level } from '@levels/build';
import type { SaveData } from './save';

/**
 * What progress needs to know of a level of the catalog: its id, whether it is a draft, and the
 * stars that open it when it is a secret flower.
 */
export interface CatalogEntry {
  readonly id: string;
  readonly draft: boolean;
  readonly secret?: { readonly stars: number } | undefined;
}

/** The levels of the catalog as the progress reads them, in the same order. */
export function catalogEntries(levels: readonly Level[]): CatalogEntry[] {
  return levels.map(({ data: { id, draft, secret } }) =>
    secret === undefined ? { id, draft } : { id, draft, secret },
  );
}

/**
 * The levels a player gets to see as buttons, in catalog order. Drafts (test levels of chapters not
 * yet written) exist only for teacher mode, which shows everything else (GDD §5.8). Secret flowers
 * are never buttons, not even in teacher mode: each one opens from its flower in the hub (§5.10).
 */
export function visibleLevels<T extends CatalogEntry>(
  levels: readonly T[],
  teacherMode: boolean,
): T[] {
  return levels.filter((level) => level.secret === undefined && (teacherMode || !level.draft));
}

/**
 * The levels a player can open: the first one, every completed one, and the one right after each
 * completed level in catalog order. Catalog order (not "the previous level of the same chapter")
 * also opens the first level of each chapter. Drafts are left out before counting, so they never
 * open and never open the level after them; the next finished level takes their place, and so are
 * secret flowers, which no win opens and which open nothing. Teacher mode opens every level shown,
 * drafts included (GDD §5.8).
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
