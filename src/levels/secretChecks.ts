import { compareLevelIds } from './catalog';
import type { LevelData } from './schema';
import { starsCeiling } from './starsCeiling';

/**
 * The checks of the secret flowers (plan 08, phase 0), shared by the test suite and
 * `tools/check-levels`. Like the Codex checks they read the whole catalog, because a flower is
 * sound only next to its chapter: it comes after every other level of the chapter, it is the only
 * one there, it opens nothing (no actions, no Codex page, no notebook question, never a draft), and
 * the stars it asks for are more than finishing the chapter gives and at most all the chapter can
 * give. Drafts are left out of the chapter, as the player never plays them.
 */

/** What the checks read of a level; a level as loaded (`LevelData`) has all of it. */
export type SecretLevel = Pick<
  LevelData,
  'id' | 'draft' | 'secret' | 'unlocks' | 'notebook' | 'water' | 'flow'
>;

/** Something wrong with a secret flower. */
export type SecretProblem =
  /** `level` is a flower, but `before`, a level of its chapter, comes after it. */
  | { readonly code: 'secretNotLast'; readonly level: string; readonly before: string }
  /** The chapter holds more than one flower. */
  | { readonly code: 'secretTwice'; readonly chapter: string; readonly levels: readonly string[] }
  /** The flower unlocks actions or Codex pages. */
  | { readonly code: 'secretUnlocks'; readonly level: string }
  /** The flower asks a notebook question. */
  | { readonly code: 'secretNotebook'; readonly level: string }
  /** The flower is a draft. */
  | { readonly code: 'secretDraft'; readonly level: string }
  /** The flower asks for `stars`, out of `least`…`most` (the chapter's levels + 1 … its ceiling). */
  | {
      readonly code: 'secretStarsOutOfRange';
      readonly level: string;
      readonly stars: number;
      readonly least: number;
      readonly most: number;
    };

/** The chapter of a level id: `4` for `4.13`. */
const chapterOf = (id: string): string => id.split('.')[0] ?? id;

/** Checks the secret flowers of the catalog; an empty list means they are sound. */
export function checkSecrets(levels: readonly SecretLevel[]): SecretProblem[] {
  const problems: SecretProblem[] = [];
  const ordered = [...levels].sort((a, b) => compareLevelIds(a.id, b.id));
  const flowers = ordered.filter((level) => level.secret !== undefined);

  for (const flower of ordered) {
    const { id, secret } = flower;
    if (secret === undefined) continue;
    const chapter = chapterOf(id);
    // The levels the player plays in the chapter: neither drafts nor the flower itself.
    const others = ordered.filter(
      (level) => level !== flower && chapterOf(level.id) === chapter && !level.draft,
    );
    const later = others.find((level) => compareLevelIds(level.id, id) > 0);
    if (later !== undefined) problems.push({ code: 'secretNotLast', level: id, before: later.id });

    const { actions, codex } = flower.unlocks;
    if (actions.length > 0 || codex.length > 0) problems.push({ code: 'secretUnlocks', level: id });
    if (flower.notebook !== undefined) problems.push({ code: 'secretNotebook', level: id });
    if (flower.draft) problems.push({ code: 'secretDraft', level: id });

    // Only the levels that are not flowers count: finishing them all must not be enough.
    const normal = others.filter((level) => level.secret === undefined);
    const least = normal.length + 1;
    const most = normal.reduce((sum, level) => sum + starsCeiling(level), 0);
    if (secret.stars < least || secret.stars > most) {
      problems.push({ code: 'secretStarsOutOfRange', level: id, stars: secret.stars, least, most });
    }
  }

  // One flower per chapter (GDD §5.10).
  const byChapter = new Map<string, string[]>();
  for (const { id } of flowers) {
    const chapter = chapterOf(id);
    byChapter.set(chapter, [...(byChapter.get(chapter) ?? []), id]);
  }
  for (const [chapter, ids] of byChapter) {
    if (ids.length > 1) problems.push({ code: 'secretTwice', chapter, levels: ids });
  }
  return problems;
}
