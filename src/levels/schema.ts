import { z } from 'zod';
import { actionType, label, levelActionOptions, lineId, vine } from './fields';
import { flowSchema } from './flow';
import { flowInputOptions } from './flowInput';

/**
 * The shape of a level file (`levels/data/chN/N-M.json`), the single source of truth of a level's
 * logic. Files name sprouts by their labels (`"R"`, `"a"`…), as the design document
 * does; `build.ts` turns names into ids. Objects are strict so a typo is an error, never ignored.
 */

/**
 * A sprout and where it sits on the 480×270 canvas: inside the garden area, clear of the HUD bars
 * (the goal and the sun on top, tools and buttons in two rows at the bottom) and of the edges.
 */
const sprout = z.strictObject({
  label,
  x: z.number().int().min(8).max(472),
  y: z.number().int().min(28).max(226),
});

/** The declarative victory condition (`core/rules/victory.ts`). */
const victory = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('matchingSize'), value: z.number().int().min(0) }),
  z.strictObject({ type: z.literal('maximum') }),
  z.strictObject({ type: z.literal('chainFound') }),
  z.strictObject({ type: z.literal('coverCertificate') }),
  z.strictObject({ type: z.literal('tutteBergeCertificate') }),
]);

/** The goal shown to the player: "this garden can light N lanterns", or hidden (GDD §5.2). */
const goal = z.discriminatedUnion('visible', [
  z.strictObject({ visible: z.literal(true), value: z.number().int().min(0) }),
  z.strictObject({ visible: z.literal(false) }),
]);

/** A notebook question (GDD §5.5): a prompt and options, at least one of them right. */
const notebook = z.strictObject({
  prompt: lineId,
  options: z
    .array(z.strictObject({ line: lineId, correct: z.boolean() }))
    .min(2)
    .refine((options) => options.some((option) => option.correct), 'no option is correct'),
});

export const levelSchema = z.strictObject({
  /** `chapter.level`, e.g. `4.10`. */
  id: z.string().regex(/^\d+\.\d+$/, 'expected chapter.level, like 4.10'),
  /** Sprouts in id order: the n-th sprout is vertex n. */
  sprouts: z.array(sprout).min(1),
  /**
   * A test level of a chapter not yet written: it still passes every integrity check, but only
   * teacher mode shows it, so playtesters never reach it.
   */
  draft: z.boolean().default(false),
  vines: z.array(vine),
  /** Lanterns lit when the level starts. */
  lanterns: z.array(vine).default([]),
  /** The lanterns of the reflection in the pond (chapter 2), shown by a `mirror` step. */
  mirror: z.array(vine).optional(),
  goal,
  fog: z.boolean().default(false),
  /** Water budget for the extra star; null when the level does not count water. */
  water: z.number().int().min(0).nullable().default(null),
  /** Actions unlocked by now that this level keeps closed (4.10 closes folding). */
  forbid: z.array(actionType).default([]),
  /** When the play step is won; required exactly when the script has a play step. */
  victory: victory.optional(),
  /** Hints: a voiced line and the sprouts to highlight (GDD §5.3). */
  hints: z
    .array(z.strictObject({ line: lineId, highlight: z.array(label).default([]) }))
    .default([]),
  notebook: notebook.optional(),
  /** What happens in the level, in order; played until won when the level writes no script. */
  flow: flowSchema,
  /** What finishing the level unlocks: actions and Codex entries (C1…C14). */
  unlocks: z
    .strictObject({
      actions: z.array(actionType).default([]),
      codex: z
        .array(z.string().regex(/^C(1[0-4]|[1-9])$/, 'expected a Codex entry C1…C14'))
        .default([]),
    })
    .default({ actions: [], codex: [] }),
  /**
   * The reference walkthrough: the moves, replayed by the integrity checks with the real rules, and
   * between them the inputs the script asks for (answers, bets, the sun, touches). At least one entry.
   */
  solution: z
    .array(z.discriminatedUnion('type', [...levelActionOptions, ...flowInputOptions]))
    .min(1),
});

/** A level file after validation, defaults filled in. */
export type LevelData = z.infer<typeof levelSchema>;
