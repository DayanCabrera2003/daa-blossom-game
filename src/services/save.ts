import { z } from 'zod';
import { codexEntry, type CodexEntryId } from '@levels/codex';
import { codexPage, type CodexPage } from './codexPage';

/** The part of `localStorage` the save needs, so tests (and a refusing browser) can stand in. */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/** Where progress is kept in the browser. */
export const SAVE_KEY = 'florecer.save';

const SAVE_VERSION = 5 as const;

/** Each completed level with its best number of stars; the same in every version. */
const levels = z.record(z.string(), z.strictObject({ stars: z.number().int().min(0).max(3) }));

/** A bet of a script, named by its level and the index of its step: `1.6#3`. */
const betId = z.string().regex(/^\d+\.\d+#\d+$/, 'expected a bet like 1.6#3');

/** The Codex pages read and the glossary rows seen; the same since version 4. */
const codexProgress = {
  codexRead: z.array(codexPage),
  glossaryRead: z.array(codexEntry),
};

const saveSchema = z.strictObject({
  version: z.literal(SAVE_VERSION),
  levels,
  /** The levels whose notebook statement the player wrote (GDD §5.5), in the order written. */
  notebook: z.array(z.string()),
  /** The mechanic cards the player has closed (GDD §5.11), each shown once, in the order seen. */
  tutorialsSeen: z.array(z.string()),
  /**
   * The Codex pages (each tab of an entry, `C1:formal`) the player has read in the book, in the
   * order read, so the others wear the "new" seal. Which pages are open is never saved: it follows
   * from the completed levels. Next, the entries whose rows of the glossary (C13) the player has
   * seen there, in the order seen: the glossary grows as entries open, and its new rows make it new
   * again.
   */
  ...codexProgress,
  /**
   * The bets won (GDD §5.1), each once, in the order won: a formal bet or a doubling bet answered
   * right gives a seed. Unlike stars, they cannot be told from the completed levels.
   */
  betsWon: z.array(betId),
  /**
   * The cosmetics of the hub already announced, in the order announced. Which ones are there is
   * never saved: it follows from the stars and seeds.
   */
  cosmeticsSeen: z.array(z.string()),
});

/**
 * The saves of older versions, each turned into the current one without losing progress. Version
 * 1 had no notebook, version 2 no mechanic cards, version 3 no pages read nor glossary rows seen,
 * and version 4 no bets won nor cosmetics announced: what is missing comes back empty.
 */
const olderSaves = z
  .union([
    z.strictObject({ version: z.literal(1), levels }),
    z.strictObject({ version: z.literal(2), levels, notebook: z.array(z.string()) }),
    z.strictObject({
      version: z.literal(3),
      levels,
      notebook: z.array(z.string()),
      tutorialsSeen: z.array(z.string()),
    }),
    z.strictObject({
      version: z.literal(4),
      levels,
      notebook: z.array(z.string()),
      tutorialsSeen: z.array(z.string()),
      ...codexProgress,
    }),
  ])
  .transform((save) => ({
    version: SAVE_VERSION,
    levels: save.levels,
    notebook: 'notebook' in save ? save.notebook : [],
    tutorialsSeen: 'tutorialsSeen' in save ? save.tutorialsSeen : [],
    codexRead: 'codexRead' in save ? save.codexRead : ([] as CodexPage[]),
    glossaryRead: 'glossaryRead' in save ? save.glossaryRead : ([] as CodexEntryId[]),
    betsWon: [] as string[],
    cosmeticsSeen: [] as string[],
  }));

/**
 * Progress of a player: each completed level with its best number of stars, the notebook, the
 * mechanic cards already seen, the Codex pages and glossary rows already read, the bets won and the
 * cosmetics of the hub already announced.
 */
export type SaveData = z.infer<typeof saveSchema>;

/** A player who has not completed anything yet. */
export const emptySave = (): SaveData => ({
  version: SAVE_VERSION,
  levels: {},
  notebook: [],
  tutorialsSeen: [],
  codexRead: [],
  glossaryRead: [],
  betsWon: [],
  cosmeticsSeen: [],
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

/** The progress after reading a page of the Codex in the book; each page is recorded once. */
export function recordPageRead(save: SaveData, page: CodexPage): SaveData {
  return save.codexRead.includes(page) ? save : { ...save, codexRead: [...save.codexRead, page] };
}

/**
 * The progress after seeing in the glossary the rows of `entries`; each entry is recorded once, and
 * seeing only rows already seen changes nothing.
 */
export function recordGlossaryRows(save: SaveData, entries: readonly CodexEntryId[]): SaveData {
  const fresh = [...new Set(entries)].filter((entry) => !save.glossaryRead.includes(entry));
  return fresh.length === 0 ? save : { ...save, glossaryRead: [...save.glossaryRead, ...fresh] };
}

/** The items of `items` not yet in `kept`, each once, in the order given. */
const fresh = (kept: readonly string[], items: readonly string[]): string[] =>
  [...new Set(items)].filter((item) => !kept.includes(item));

/**
 * The progress after winning the bets `bets` (`1.6#3`); each bet gives its seed once, and winning
 * only bets already won changes nothing.
 */
export function recordBetsWon(save: SaveData, bets: readonly string[]): SaveData {
  const won = fresh(save.betsWon, bets);
  return won.length === 0 ? save : { ...save, betsWon: [...save.betsWon, ...won] };
}

/** The progress after announcing the cosmetics `ids`; each is announced once. */
export function recordCosmeticsSeen(save: SaveData, ids: readonly string[]): SaveData {
  const seen = fresh(save.cosmeticsSeen, ids);
  return seen.length === 0 ? save : { ...save, cosmeticsSeen: [...save.cosmeticsSeen, ...seen] };
}
