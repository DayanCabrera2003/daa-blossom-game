import type { ActionType } from '@core/rules/actions';
import { UNLOCKED_AT } from '@core/rules/permissions';
import { z } from 'zod';

/**
 * The small pieces every part of a level file is written with: sprouts and their names, dialogue
 * line ids, vines and player actions. Shared by the level schema, the schema of its script and that
 * of its notebook, so all of them read names and lines the same way.
 */

/** Every action of the game, taken from the unlock table so the two can never drift apart. */
export const actionType = z.enum(Object.keys(UNLOCKED_AT) as [ActionType, ...ActionType[]]);

/** A sprout's name as written in the level. */
export const label = z.string().min(1);

/** A dialogue line id, which is also the name of its voice file: `ch4.11.sauce.03`. */
export const lineId = z
  .string()
  .regex(/^ch\d+\.\d+\.[a-z]+\.\d{2}$/, 'expected a line id like ch4.11.sauce.03');

/**
 * Where sprouts may sit on the 480×270 canvas: inside the garden area, clear of the HUD bars (the
 * goal and the sun on top, tools and buttons in two rows at the bottom) and of the edges.
 */
export const SPROUT_AREA = { x0: 8, x1: 472, y0: 28, y1: 226 } as const;

/**
 * What a sprout is in a garden of bees and flowers (chapter 3): a bee only pairs with a flower, so
 * the garden is two-sided without anybody saying so.
 */
export const sproutKind = z.enum(['bee', 'flower']);

/** A bee or a flower. */
export type SproutKind = z.infer<typeof sproutKind>;

/** A sprout and where it sits, inside `SPROUT_AREA`; bee or flower only in such gardens. */
const sprout = z.strictObject({
  label,
  x: z.number().int().min(SPROUT_AREA.x0).max(SPROUT_AREA.x1),
  y: z.number().int().min(SPROUT_AREA.y0).max(SPROUT_AREA.y1),
  kind: sproutKind.optional(),
});

/**
 * The sprouts of a garden, a level's or a counterexample's, in id order. Either none says what it
 * is or every one does: a garden of bees and flowers has no sprout that is neither. The rule needs
 * only the list, so the file is refused as it loads; that each vine joins a bee and a flower needs
 * the vines too and is an integrity check (`kinds.ts`).
 */
export const sprouts = z
  .array(sprout)
  .min(1)
  .refine(
    (list) => list.every((s) => s.kind === undefined) || list.every((s) => s.kind !== undefined),
    'if one sprout is a bee or a flower, every sprout must be one',
  );

/** A vine, or a lantern on it, between two named sprouts. */
export const vine = z.tuple([label, label]);

/** Sprouts in order: a chain, a stem or a loop. */
const path = z.array(label).min(1);

/**
 * The player actions as a level writes them: the same as `core/rules/actions.ts`, with names. Kept
 * as a list of options so a wider union (the walkthrough of a level) can reuse them.
 */
export const levelActionOptions = [
  z.strictObject({ type: z.literal('join'), u: label, v: label }),
  z.strictObject({ type: z.literal('split'), u: label, v: label }),
  z.strictObject({ type: z.literal('passLantern'), from: label, to: label }),
  z.strictObject({ type: z.literal('chain'), path }),
  z.strictObject({ type: z.literal('rotateStem'), stem: path }),
  z.strictObject({ type: z.literal('inspect'), vertex: label }),
  z.strictObject({ type: z.literal('markRoot'), vertex: label }),
  z.strictObject({ type: z.literal('markMoon'), from: label, to: label }),
  z.strictObject({ type: z.literal('foldAt'), from: label, to: label }),
  z.strictObject({ type: z.literal('fold'), loop: path }),
  z.strictObject({ type: z.literal('unfold'), blossom: z.number().int().min(0) }),
  z.strictObject({ type: z.literal('placeScarecrow'), vertex: label }),
  z.strictObject({ type: z.literal('removeScarecrow'), vertex: label }),
  z.strictObject({ type: z.literal('liftStone'), vertex: label }),
  z.strictObject({ type: z.literal('dropStone'), vertex: label }),
  z.strictObject({ type: z.literal('declareDone') }),
] as const;

/** A player action as a level writes it. */
export const levelAction = z.discriminatedUnion('type', levelActionOptions);

/** One player action, with sprout names. */
export type LevelAction = z.infer<typeof levelAction>;
