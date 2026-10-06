import type { SaveData } from './save';

/**
 * The levels a player can open: the first one, every completed one, and the one right after each
 * completed level in catalog order. Catalog order (not "the previous level of the same chapter")
 * also opens the first level of each chapter. Teacher mode opens everything (GDD §5.8).
 */
export function unlockedLevels(
  orderedIds: readonly string[],
  save: SaveData,
  teacherMode: boolean,
): Set<string> {
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
