import { z } from 'zod';

/**
 * The entries of the Codex (GDD §8) and how a level opens them (GDD §7). Each entry has three tabs:
 * the intuition in the garden's words, the formal statements with their proofs, and the bridge
 * between the two. A level may open a whole entry or only some of its tabs (0.5 opens the intuition
 * of C1; 1.8 opens the rest).
 */

/** The fourteen entries, in the order of the book. */
export const CODEX_ENTRIES = [
  'C1',
  'C2',
  'C3',
  'C4',
  'C5',
  'C6',
  'C7',
  'C8',
  'C9',
  'C10',
  'C11',
  'C12',
  'C13',
  'C14',
] as const;

/** An entry of the Codex, `C1` … `C14`. */
export type CodexEntryId = (typeof CODEX_ENTRIES)[number];

/** The tabs of an entry, in the order the book shows them. */
export const CODEX_TABS = ['intuition', 'formal', 'bridge'] as const;

/** A tab of an entry. */
export type CodexTab = (typeof CODEX_TABS)[number];

/** An entry id as a level file writes it. */
export const codexEntry = z.enum(CODEX_ENTRIES);

/** A tab name as a level file writes it. */
export const codexTab = z.enum(CODEX_TABS);

/**
 * What a level opens of an entry: `"C3"` opens every tab, `{ "entry": "C1", "tabs": ["intuition"] }`
 * only the tabs named (at least one, none twice).
 */
export const codexUnlock = z.union([
  codexEntry,
  z.strictObject({
    entry: codexEntry,
    tabs: z
      .array(codexTab)
      .min(1)
      .refine((tabs) => new Set(tabs).size === tabs.length, 'a tab is named twice'),
  }),
]);

/** An unlock as the level file writes it. */
export type CodexUnlock = z.infer<typeof codexUnlock>;

/** An unlock spelled out: the entry and the tabs it opens, in the order of the book. */
export interface UnlockedTabs {
  readonly entry: CodexEntryId;
  readonly tabs: readonly CodexTab[];
}

/** Spells out an unlock, whichever way the file wrote it. */
export function unlockedTabs(unlock: CodexUnlock): UnlockedTabs {
  if (typeof unlock === 'string') return { entry: unlock, tabs: CODEX_TABS };
  return { entry: unlock.entry, tabs: CODEX_TABS.filter((tab) => unlock.tabs.includes(tab)) };
}
