import type { VertexId } from '@core/graph/types';
import type { Action } from '@core/rules/actions';
import { z } from 'zod';
import { label, levelAction, lineId } from './fields';

/**
 * The script of a level (plan 03, phase 1): the steps that happen in it, in order, after or instead
 * of "play until won". The script is data, never code: a fixed, small set of steps with no
 * conditions and no jumps, run by a pure engine. A level that writes no script is played until won,
 * exactly as before scripts existed.
 */

/**
 * Something the mentor says while the player plays, once per game: after a chain that lights
 * nothing new (1.4), or when the garden reaches a number of lanterns.
 */
const reaction = z.discriminatedUnion('on', [
  z.strictObject({ on: z.literal('gainZeroChain'), say: z.array(lineId).min(1) }),
  z.strictObject({
    on: z.literal('lanterns'),
    value: z.number().int().min(0),
    say: z.array(lineId).min(1),
  }),
]);

/** A question with written answers; `reply` is what the mentor says after that answer. */
const option = z.strictObject({ line: lineId, correct: z.boolean(), reply: lineId.optional() });

/** The numbers offered by a numeric question: every whole number from 0 to `range`. */
const range = z.number().int().min(1);

/** The steps of a script, by `step`. Every object is strict, so a typo is an error. */
const flowStep = z.discriminatedUnion('step', [
  /** Play with the level's rules until its victory holds. */
  z.strictObject({ step: z.literal('play'), reactions: z.array(reaction).default([]) }),
  /** The mentor says these lines; done at once. */
  z.strictObject({ step: z.literal('say'), lines: z.array(lineId).min(1) }),
  /** A question; with `retry`, a wrong answer asks again. Integrity checks one option is right. */
  z.strictObject({
    step: z.literal('ask'),
    prompt: lineId,
    options: z.array(option).min(2),
    retry: z.boolean().default(false),
  }),
  /**
   * A bet on the number of lanterns, answered by the core. `preview` shows the garden for that many
   * milliseconds and then veils it; an `informal` bet (0.4) earns no star.
   */
  z.strictObject({
    step: z.literal('bet'),
    prompt: lineId,
    range,
    preview: z.number().int().min(1).optional(),
    informal: z.boolean().default(false),
  }),
  /** Waits until the player moves the sun. */
  z.strictObject({ step: z.literal('sun') }),
  /**
   * The day rewinds and plays itself again. With `demo`, these moves are played from the start of
   * the level instead of the player's day, with every action allowed, so what is seen matches what
   * the mentor says however the player solved it (1.1, 1.2).
   */
  z.strictObject({ step: z.literal('replay'), demo: z.array(levelAction).min(1).optional() }),
  /** The reflection (`mirror` of the level) appears over the garden. */
  z.strictObject({ step: z.literal('mirror') }),
  /** With the reflection shown, a touch on a sprout shows its threads in the tangle. */
  z.strictObject({ step: z.literal('explore') }),
  /** A touch on the garden splits the tangle into its threads and loops. */
  z.strictObject({ step: z.literal('separate') }),
  /**
   * A number the core knows, asked with the numbers 0 to `range`; the player always may try again.
   * Either how many lanterns, the player's or the reflection's (`of`), the piece of the tangle
   * through the sprout `piece` holds (chapter 2), or how many sprouts the loop closed by the
   * conflict of the player's search holds (`of: 'loop'`, 4.2).
   */
  z.discriminatedUnion('of', [
    z.strictObject({
      step: z.literal('count'),
      prompt: lineId,
      piece: label,
      of: z.enum(['yours', 'mirror']),
      range,
    }),
    z.strictObject({ step: z.literal('count'), prompt: lineId, of: z.literal('loop'), range }),
  ]),
  /**
   * The player points at the vine where the light went wrong: the conflict of their search (4.2),
   * as the core finds it. A wrong vine is answered with `reply`, if any, and asked again.
   */
  z.strictObject({ step: z.literal('pickVine'), prompt: lineId, reply: lineId.optional() }),
  /** The mirror challenge (2.4): draw a better reflection, `attempts` times. */
  z.strictObject({ step: z.literal('draw'), attempts: z.number().int().min(1) }),
  /**
   * The flower challenge (4.11): the player draws chains in the open garden, which are shown cut at
   * the level's `flower` and never applied, until `attempts` of them are chains.
   */
  z.strictObject({ step: z.literal('flowerChallenge'), attempts: z.number().int().min(1) }),
  /** The level's notebook question. */
  z.strictObject({ step: z.literal('notebook') }),
]);

/** The script of a level; without one, the level is played until won. */
export const flowSchema = z
  .array(flowStep)
  .min(1)
  .prefault(() => [{ step: 'play' as const }]);

/** One step of a script, as the level file writes it (sprouts by name). */
export type FlowStep = z.infer<typeof flowStep>;

/** One step of a built script: the sprouts it names are ids. */
export type LevelStep =
  | Exclude<FlowStep, { of: 'yours' | 'mirror' } | { step: 'replay' }>
  | (Omit<Extract<FlowStep, { of: 'yours' | 'mirror' }>, 'piece'> & { readonly piece: VertexId })
  | { readonly step: 'replay'; readonly demo?: readonly Action[] };

/** A `count` step of a built script: lanterns on a piece of the tangle, or sprouts of the loop. */
export type CountStep = Extract<LevelStep, { step: 'count' }>;
