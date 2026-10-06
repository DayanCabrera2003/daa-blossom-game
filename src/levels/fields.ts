import type { ActionType } from '@core/rules/actions';
import { UNLOCKED_AT } from '@core/rules/permissions';
import { z } from 'zod';

/**
 * The small pieces every part of a level file is written with: sprout names, dialogue line ids,
 * vines and player actions. Shared by the level schema and the schema of its script, so both read
 * names and lines the same way.
 */

/** Every action of the game, taken from the unlock table so the two can never drift apart. */
export const actionType = z.enum(Object.keys(UNLOCKED_AT) as [ActionType, ...ActionType[]]);

/** A sprout's name as written in the level. */
export const label = z.string().min(1);

/** A dialogue line id, which is also the name of its voice file: `ch4.11.sauce.03`. */
export const lineId = z
  .string()
  .regex(/^ch\d+\.\d+\.[a-z]+\.\d{2}$/, 'expected a line id like ch4.11.sauce.03');

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
