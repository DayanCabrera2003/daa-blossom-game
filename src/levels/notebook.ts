import { z } from 'zod';
import { lineId } from './fields';

/**
 * The notebook question of a level (GDD §5.5): after the player masters an idea, the mentor asks
 * them to write it down by choosing the true statement among plausible false ones.
 */

/** A notebook question: a prompt and options, at least one of them right. */
export const notebookSchema = z.strictObject({
  prompt: lineId,
  options: z
    .array(z.strictObject({ line: lineId, correct: z.boolean() }))
    .min(2)
    .refine((options) => options.some((option) => option.correct), 'no option is correct'),
});

/** A notebook question as the level file writes it. */
export type NotebookData = z.infer<typeof notebookSchema>;
