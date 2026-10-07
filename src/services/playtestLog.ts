import { z } from 'zod';

/**
 * The format of the log. Entries are only ever added as new kinds, never changed, so every log an
 * earlier build wrote still reads under this schema: the version moves only when an entry changes
 * shape, together with a migration of the old one.
 */
const LOG_VERSION = 1;

/** Milliseconds since the epoch, from the injected clock. */
const at = z.number().int().min(0);
const level = z.string();

/**
 * One thing that happened while playing (GDD §10, Hito A). Moves are kept by type and refusals by
 * reason code: enough to see where players struggle, nothing about who they are.
 */
const entrySchema = z.discriminatedUnion('kind', [
  /** The game was opened. */
  z.strictObject({ kind: z.literal('sessionStart'), at }),
  z.strictObject({ kind: z.literal('levelStart'), at, level }),
  /** The level was won (with its stars) or left for the hub. */
  z.strictObject({
    kind: z.literal('levelEnd'),
    at,
    level,
    outcome: z.enum(['won', 'left']),
    stars: z.number().int().min(0).max(3).nullable(),
  }),
  z.strictObject({ kind: z.literal('move'), at, level, action: z.string() }),
  z.strictObject({
    kind: z.literal('refused'),
    at,
    level,
    action: z.string(),
    reason: z.string(),
  }),
  z.strictObject({ kind: z.literal('hint'), at, level, grade: z.number().int().min(1) }),
  /** "Terminé" pressed: right when the lanterns were the most the garden holds. */
  z.strictObject({ kind: z.literal('claim'), at, level, right: z.boolean() }),
  z.strictObject({
    kind: z.literal('history'),
    at,
    level,
    move: z.enum(['undo', 'redo', 'seek']),
  }),
  /** An option of an `ask`, or a number in a `count`: the step of the script that asked. */
  z.strictObject({
    kind: z.literal('answer'),
    at,
    level,
    step: z.number().int().min(0),
    option: z.number().int().min(0),
    right: z.boolean(),
  }),
  /** A bet on the lanterns the garden holds; an informal one earns no star (GDD §5.4). */
  z.strictObject({
    kind: z.literal('bet'),
    at,
    level,
    value: z.number().int().min(0),
    right: z.boolean(),
    informal: z.boolean(),
  }),
  /** A statement chosen in the notebook question, true or false. */
  z.strictObject({
    kind: z.literal('notebook'),
    at,
    level,
    option: z.number().int().min(0),
    right: z.boolean(),
  }),
  /** The garden that refutes the false notebook statement `option` was opened. */
  z.strictObject({
    kind: z.literal('counterexample'),
    at,
    level,
    option: z.number().int().min(0),
  }),
  /**
   * A drawn reflection was checked: whether it beats the garden, and whether it counted as a new
   * attempt (a better one not checked before).
   */
  z.strictObject({
    kind: z.literal('mirrorCheck'),
    at,
    level,
    beats: z.boolean(),
    counted: z.boolean(),
  }),
  /**
   * A vine pointed at in a `pickVine` step (4.2), by the names of its ends: right when it is the
   * conflict of the search.
   */
  z.strictObject({
    kind: z.literal('pickVine'),
    at,
    level,
    step: z.number().int().min(0),
    vine: z.tuple([z.string(), z.string()]),
    right: z.boolean(),
  }),
]);

const logSchema = z.strictObject({
  version: z.literal(LOG_VERSION),
  entries: z.array(entrySchema),
});

export type PlaytestEntry = z.infer<typeof entrySchema>;
export type PlaytestLog = z.infer<typeof logSchema>;

/** A log with nothing in it yet. */
export const emptyLog = (): PlaytestLog => ({ version: LOG_VERSION, entries: [] });

/** The log with one more entry at its end. */
export const appendEntry = (log: PlaytestLog, entry: PlaytestEntry): PlaytestLog => ({
  ...log,
  entries: [...log.entries, entry],
});

/** A log read back from storage, or null if it is not a log of this version. */
export function parseLog(json: unknown): PlaytestLog | null {
  const parsed = logSchema.safeParse(json);
  return parsed.success ? parsed.data : null;
}
