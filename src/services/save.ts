import { z } from 'zod';

/** The part of `localStorage` the save needs, so tests (and a refusing browser) can stand in. */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/** Where progress is kept in the browser. */
export const SAVE_KEY = 'florecer.save';

const SAVE_VERSION = 1;

const saveSchema = z.strictObject({
  version: z.literal(SAVE_VERSION),
  levels: z.record(z.string(), z.strictObject({ stars: z.number().int().min(0).max(3) })),
});

/** Progress of a player: each completed level with its best number of stars. */
export type SaveData = z.infer<typeof saveSchema>;

/** A player who has not completed anything yet. */
export const emptySave = (): SaveData => ({ version: SAVE_VERSION, levels: {} });

/**
 * Reads the saved progress. Anything unreadable (no save, damaged JSON, another version, storage
 * refused in private mode) gives a fresh start: losing progress is better than a broken game.
 */
export function loadSave(store: KeyValueStore): SaveData {
  try {
    const raw = store.getItem(SAVE_KEY);
    if (raw === null) return emptySave();
    const parsed = saveSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : emptySave();
  } catch {
    return emptySave();
  }
}

/** Writes the progress; if the browser refuses, the game goes on without saving. */
export function writeSave(store: KeyValueStore, save: SaveData): void {
  try {
    store.setItem(SAVE_KEY, JSON.stringify(save));
  } catch {
    // Storage refused (private mode, quota): progress lives only for this session.
  }
}

/** The progress after completing a level, keeping its best result. */
export function recordCompletion(save: SaveData, levelId: string, stars: number): SaveData {
  const best = Math.max(stars, save.levels[levelId]?.stars ?? 0);
  return { ...save, levels: { ...save.levels, [levelId]: { stars: best } } };
}
