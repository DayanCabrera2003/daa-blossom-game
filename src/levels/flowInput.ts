import type { Edge, VertexId } from '@core/graph/types';
import { z } from 'zod';
import { label, vine } from './fields';

/**
 * What a player gives the script of a level besides garden moves: answers, bets, the sun, touches
 * and the mirror challenge. A level's reference walkthrough (`solution`) writes them between its
 * moves, so a test can play the whole level, script included. None of these changes the lanterns.
 */

/** The inputs as a level file writes them, sprouts by name. */
export const flowInputOptions = [
  /** The chosen option of an `ask` or `notebook` (its index), or the number picked in a `count`. */
  z.strictObject({ type: z.literal('answer'), option: z.number().int().min(0) }),
  /** The number of lanterns bet on. */
  z.strictObject({ type: z.literal('bet'), value: z.number().int().min(0) }),
  /** Moves the sun to this point of the day, from dawn (0) to now (1). */
  z.strictObject({ type: z.literal('seekSun'), fraction: z.number().min(0).max(1) }),
  /** A touch anywhere on the garden. */
  z.strictObject({ type: z.literal('tapGarden') }),
  /** A touch on a sprout. */
  z.strictObject({ type: z.literal('tapSprout'), vertex: label }),
  /** A reflection drawn in the mirror challenge: its silver lanterns. */
  z.strictObject({ type: z.literal('drawMirror'), lanterns: z.array(vine) }),
  /** Asks whether the drawn reflection beats the garden. */
  z.strictObject({ type: z.literal('checkMirror') }),
] as const;

/** Every input type; none of them is the type of a player action. */
export const FLOW_INPUT_TYPES: readonly string[] = flowInputOptions.map(
  (option) => option.shape.type.value,
);

/** One input, as the level file writes it. */
export type LevelFlowInput = z.infer<(typeof flowInputOptions)[number]>;

/** One input, built: sprouts by id. */
export type FlowInput =
  | Exclude<LevelFlowInput, { type: 'tapSprout' } | { type: 'drawMirror' }>
  | { readonly type: 'tapSprout'; readonly vertex: VertexId }
  | { readonly type: 'drawMirror'; readonly lanterns: readonly Edge[] };

/** The tag of a script input. */
export type FlowInputType = LevelFlowInput['type'];

const INPUT_TYPES: ReadonlySet<string> = new Set(FLOW_INPUT_TYPES);

/** Whether a walkthrough entry is a script input rather than a garden move. */
export const isFlowInput = <T extends { readonly type: string }>(
  entry: T,
): entry is Extract<T, { readonly type: FlowInputType }> => INPUT_TYPES.has(entry.type);
