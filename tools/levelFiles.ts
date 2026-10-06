// Lists the level files of the game, for the integrity test and the check-levels tool.
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Where level files live: one folder per chapter, one JSON per level (`ch4/4-10.json`). */
export const LEVELS_DIR = fileURLToPath(new URL('../src/levels/data', import.meta.url));

/** A level file: its path relative to the data folder and its parsed JSON. */
export interface LevelFile {
  readonly path: string;
  readonly json: unknown;
}

/** Every level file, sorted by path so reports and test names are stable. */
export function readLevelFiles(): LevelFile[] {
  return readdirSync(LEVELS_DIR, { recursive: true, encoding: 'utf8' })
    .filter((path) => path.endsWith('.json'))
    .sort()
    .map((path) => ({
      path: relative(LEVELS_DIR, join(LEVELS_DIR, path)),
      json: JSON.parse(readFileSync(join(LEVELS_DIR, path), 'utf8')) as unknown,
    }));
}

/** The path a level with this id must have: `4.10` lives in `ch4/4-10.json`. */
export function expectedPath(id: string): string {
  const [chapter] = id.split('.');
  return join(`ch${chapter}`, `${id.replace('.', '-')}.json`);
}
