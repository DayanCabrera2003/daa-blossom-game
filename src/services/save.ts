import { z } from 'zod';

/** The part of `localStorage` the save needs, so tests (and a refusing browser) can stand in. */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/** Where progress is kept in the browser. */
export const SAVE_KEY = 'florecer.save';

const SAVE_VERSION = 3 as const;

/** Each completed level with its best number of stars; the same in every version. */
const levels = z.record(z.string(), z.strictObject({ stars: z.number().int().min(0).max(3) }));

const saveSchema = z.strictObject({
  version: z.literal(SAVE_VERSION),
  levels,
  /** The levels whose notebook statement the player wrote (GDD §5.5), in the order written. */
  notebook: z.array(z.string()),
  /** The mechanic cards the player has closed (GDD §5.11), each shown once, in the order seen. */
  tutorialsSeen: z.array(z.string()),
});

/**
 * The saves of older versions, each turned into the current one without losing progress. Version
 * 1 had no notebook and version 2 no mechanic cards: what is missing comes back empty.
 */
const olderSaves = z
  .union([
    z.strictObject({ version: z.literal(1), levels }),
    z.strictObject({ version: z.literal(2), levels, notebook: z.array(z.string()) }),
  ])
  .transform((save) => ({
    version: SAVE_VERSION,
    levels: save.levels,
    notebook: 'notebook' in save ? save.notebook : [],
    tutorialsSeen: [] as string[],
  }));

/**
 * Progress of a player: each completed level with its best number of stars, the notebook, and the
 * mechanic cards already seen.
 */
export type SaveData = z.infer<typeof saveSchema>;

/** A player who has not completed anything yet. */
export const emptySave = (): SaveData => ({
  version: SAVE_VERSION,
  levels: {},
  notebook: [],
  tutorialsSeen: [],
});

/**
 * Reads the saved progress; a save of an older version is migrated to the current one. Anything
 * unreadable (no save, damaged JSON, an unknown version, storage refused in private mode) gives a
 * fresh start: losing progress is better than a broken game.
 */
export function loadSave(store: KeyValueStore): SaveData {
  try {
    const raw = store.getItem(SAVE_KEY);
    if (raw === null) return emptySave();
    const parsed = z.union([saveSchema, olderSaves]).safeParse(JSON.parse(raw));
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

/** The progress after writing a level's statement in the notebook; each level is written once. */
export function recordNotebook(save: SaveData, levelId: string): SaveData {
  return save.notebook.includes(levelId)
    ? save
    : { ...save, notebook: [...save.notebook, levelId] };
}

/** The progress after closing a mechanic card; each card is recorded once. */
export function recordTutorialSeen(save: SaveData, card: string): SaveData {
  return save.tutorialsSeen.includes(card)
    ? save
    : { ...save, tutorialsSeen: [...save.tutorialsSeen, card] };
}
