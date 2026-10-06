import { z } from 'zod';

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
