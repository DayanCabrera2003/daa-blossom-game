import type { CatalogEntry } from './progress';
import type { SaveData } from './save';

/**
 * The stars a player has gathered (GDD §5.4), derived from the completed levels and the catalog,
 * never saved. Drafts never count, and neither does a level the catalog no longer has.
 */

/** The chapter of a level id: `1` for `1.10`. */
const chapterOf = (id: string): string => id.split('.')[0] ?? id;

/** The best stars of the levels of `levels` won in `save`, added up. */
const starsOf = (levels: readonly CatalogEntry[], save: SaveData): number =>
  levels.reduce((sum, level) => sum + (save.levels[level.id]?.stars ?? 0), 0);

/** Every star of the game: the best of each level won, secret flowers included. */
export function totalStars(levels: readonly CatalogEntry[], save: SaveData): number {
  return starsOf(
    levels.filter((level) => !level.draft),
    save,
  );
}

/**
 * The stars of a chapter's levels of the main path, neither drafts nor its secret flower: what the
 * flower of the chapter asks for.
 */
export function chapterStars(
  levels: readonly CatalogEntry[],
  save: SaveData,
  chapter: string,
): number {
  return starsOf(
    levels.filter(
      (level) => chapterOf(level.id) === chapter && !level.draft && level.secret === undefined,
    ),
    save,
  );
}
