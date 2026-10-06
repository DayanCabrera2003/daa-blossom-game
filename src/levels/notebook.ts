import { z } from 'zod';
import { actionType, lineId, sprout, vine } from './fields';

/**
 * The notebook question of a level (GDD §5.5): after the player masters an idea, the mentor asks
 * them to write it down by choosing the true statement among plausible false ones. A false one is
 * refuted with a garden, not with text: a counterexample the player can touch.
 */

/** What every counterexample is made of: a small garden, written as a level writes its own. */
const miniGarden = {
  /** The line that presents the garden: what to try in it. */
  line: lineId,
  /** Sprouts in id order, inside the same garden area as a level's. */
  sprouts: z.array(sprout).min(1),
  vines: z.array(vine),
  /** Lanterns lit when the garden opens. */
  lanterns: z.array(vine).default([]),
};

/**
 * The garden that refutes a false statement, by how the player touches it:
 * - `play`: the player moves lanterns with `actions`, under the same rules as in a level, and sees
 *   for themselves that the statement fails (1.5: a long chain still lights exactly one lantern).
 * - `mirrorDraw` (2.4 c): the player looks for "a better arrangement" by drawing a reflection over
 *   the garden's lanterns, as in the mirror challenge (plan 03, phase 8), and the thread that wins
 *   shows up as a chain. Garden moves are never taken; the only extra data is `found`, the line
 *   the mentor says when that chain shows. Level integrity requires the lanterns to be beatable,
 *   so a better reflection always exists.
 */
export const counterexampleSchema = z.discriminatedUnion('mode', [
  z.strictObject({ mode: z.literal('play'), ...miniGarden, actions: z.array(actionType).min(1) }),
  z.strictObject({ mode: z.literal('mirrorDraw'), ...miniGarden, found: lineId }),
]);

/** One statement on offer; `reply` is what the mentor says when it is chosen. */
const option = z
  .strictObject({
    line: lineId,
    correct: z.boolean(),
    reply: lineId.optional(),
    counterexample: counterexampleSchema.optional(),
  })
  .refine(
    (option) => !option.correct || option.counterexample === undefined,
    'a right statement has no counterexample',
  );

/** A notebook question: a prompt and options, at least one of them right. */
export const notebookSchema = z.strictObject({
  prompt: lineId,
  options: z
    .array(option)
    .min(2)
    .refine((options) => options.some((option) => option.correct), 'no option is correct'),
});

/** A notebook question as the level file writes it. */
export type NotebookData = z.infer<typeof notebookSchema>;

/** A counterexample as the level file writes it, defaults filled in. */
export type CounterexampleData = z.infer<typeof counterexampleSchema>;
