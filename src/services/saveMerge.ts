import type { SaveData } from './save';

/** The lists of a save: each an ordered set of things done once, which can only grow. */
const LISTS = [
  'notebook',
  'tutorialsSeen',
  'codexRead',
  'glossaryRead',
  'betsWon',
  'cosmeticsSeen',
] as const;

/**
 * The items of `kept` followed by those of `more` not already there, in their order; `kept` itself
 * when `more` adds nothing, so a merge that changes nothing can be told by reference.
 */
function union<T extends string>(kept: readonly T[], more: readonly T[]): readonly T[] {
  const known = new Set(kept);
  const added = more.filter((item) => !known.has(item));
  return added.length === 0 ? kept : [...kept, ...new Set(added)];
}

/** Every level of either side, each with the best stars of the two; `kept` when `more` adds none. */
function bestLevels(kept: SaveData['levels'], more: SaveData['levels']): SaveData['levels'] {
  const better = Object.entries(more).filter(([id, { stars }]) => stars > (kept[id]?.stars ?? -1));
  return better.length === 0 ? kept : { ...kept, ...Object.fromEntries(better) };
}

/**
 * Two copies of the progress made one, as when two tabs of the game play at once and each wrote
 * its own: nothing either copy holds is lost. A level won in either stays won with the better
 * stars, and every list keeps all it holds in either (the order of `kept` first, then what only
 * `more` has). Progress never goes back, so this is all a merge needs: it is idempotent, and
 * commutative and associative but for the order of the lists. When `more` adds nothing, `kept`
 * itself comes back.
 */
export function mergeSaves(kept: SaveData, more: SaveData): SaveData {
  const levels = bestLevels(kept.levels, more.levels);
  let merged: SaveData = levels === kept.levels ? kept : { ...kept, levels };
  for (const key of LISTS) {
    // Each list is joined with the same list of the other copy, so its items keep their kind.
    const items: readonly string[] = union<string>(kept[key], more[key]);
    if (items !== kept[key]) merged = { ...merged, [key]: items };
  }
  return merged;
}
