import type { CatalogEntry } from './progress';
import type { SaveData } from './save';

/**
 * The secret flowers of the hub (GDD §5.10), derived like the open levels (`progress.ts`): from
 * the catalog and the completed levels, never saved. Each flower closes its chapter and grows on the
 * chapter's signpost: nothing while the chapter is unfinished, a bud while its other levels have
 * fewer stars than the flower asks for, open once they have them, and won with its own stars.
 */

/** How the flower of a chapter looks in the hub. */
export type SecretFlowerState =
  /** The chapter is not finished yet: no flower on its signpost. */
  | { readonly kind: 'none' }
  /** The chapter is finished with `have` stars, fewer than the `need` that open the flower. */
  | { readonly kind: 'bud'; readonly need: number; readonly have: number }
  /** The flower can be played. */
  | { readonly kind: 'open' }
  /** The flower was won, with its best number of stars. */
  | { readonly kind: 'won'; readonly stars: number };

/** The flower of a chapter: the chapter, the level that is the flower, and how it looks. */
export interface SecretFlower {
  readonly chapter: string;
  readonly id: string;
  readonly state: SecretFlowerState;
}

/** The chapter of a level id: `1` for `1.10`. */
const chapterOf = (id: string): string => id.split('.')[0] ?? id;

/**
 * The flower of each chapter that has one, in catalog order. The chapter's levels are those that
 * are neither drafts nor flowers: finishing them all is what finishing the chapter means, and their
 * best stars are what open the flower. Teacher mode opens every flower (GDD §5.8); a won one still
 * shows its stars.
 */
export function secretFlowers(
  levels: readonly CatalogEntry[],
  save: SaveData,
  teacherMode: boolean,
): SecretFlower[] {
  const flowers: SecretFlower[] = [];
  for (const { id, secret } of levels) {
    if (secret === undefined) continue;
    const chapter = chapterOf(id);
    flowers.push({ chapter, id, state: stateOf(chapter, id, secret.stars) });
  }
  return flowers;

  /** How the flower `id` of `chapter`, opened by `need` stars, looks for this save. */
  function stateOf(chapter: string, id: string, need: number): SecretFlowerState {
    const won = save.levels[id];
    if (won !== undefined) return { kind: 'won', stars: won.stars };
    if (teacherMode) return { kind: 'open' };
    const played = levels.filter(
      (level) => chapterOf(level.id) === chapter && !level.draft && level.secret === undefined,
    );
    let have = 0;
    for (const level of played) {
      const best = save.levels[level.id];
      if (best === undefined) return { kind: 'none' };
      have += best.stars;
    }
    return have < need ? { kind: 'bud', need, have } : { kind: 'open' };
  }
}
