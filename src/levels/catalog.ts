import { invariant } from '@core/shared/invariant';
import { err, ok, type Result } from '@core/shared/result';
import type { Level } from './build';
import { loadLevel, type LoadError } from './loader';

/** A level file that does not load: its position among the files, and why. */
export interface CatalogError {
  readonly index: number;
  readonly error: LoadError;
}

/** Orders level ids as they are played: chapter, then level, as numbers (4.9 before 4.10). */
export function compareLevelIds(a: string, b: string): number {
  const [chapterA = 0, levelA = 0] = a.split('.').map(Number);
  const [chapterB = 0, levelB = 0] = b.split('.').map(Number);
  return chapterA - chapterB || levelA - levelB;
}

/** Loads every level file and sorts the levels in play order; the first broken file stops it. */
export function buildCatalog(files: readonly unknown[]): Result<Level[], CatalogError> {
  const levels: Level[] = [];
  for (const [index, file] of files.entries()) {
    const level = loadLevel(file);
    if (!level.ok) return err({ index, error: level.error });
    levels.push(level.value);
  }
  return ok(levels.sort((a, b) => compareLevelIds(a.data.id, b.data.id)));
}

/**
 * Every level of the game, bundled at build time from `data/chN/*.json`. `check-levels` runs in
 * CI, so a broken level never ships; reaching one here is a bug and stops the game loudly.
 */
export function catalog(): Level[] {
  const files = Object.values(
    import.meta.glob('./data/**/*.json', { eager: true, import: 'default' }),
  );
  const levels = buildCatalog(files);
  invariant(levels.ok, 'a level file does not load; run npm run check-levels');
  return levels.value;
}
