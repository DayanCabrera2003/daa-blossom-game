import { z } from 'zod';
import { label, levelActionOptions, vine } from '../fields';
import { flowInputOptions } from '../flowInput';

/**
 * The shape of the mechanic cards file (`cards.json`, GDD §5.11): for each mechanic, the tiny
 * garden its card shows and the steps that garden plays by itself, in a loop. The steps are written
 * like a level's walkthrough (garden moves and script inputs, sprouts by name), plus undo and redo,
 * so the moves are played by the real rules and the card shows only what the game would do.
 */

/** Every mechanic with a card, in the order cards are listed when several show together. */
export const CARD_IDS = [
  'lanterns',
  'undo',
  'passLantern',
  'chain',
  'sun',
  'bet',
  'question',
  'notebook',
  'declareDone',
  'reflection',
  'count',
  'draw',
  'inspect',
  'marks',
  'pickVine',
  'scarecrows',
  'fold',
  'unfold',
  'rotateStem',
  'stones',
] as const;

/** A mechanic that has a card. */
export type CardId = (typeof CARD_IDS)[number];

/**
 * Where a demo's sprouts may sit, in logical pixels of the demo's own small box: clear of its edges,
 * with room above each sprout for a sun or moon badge.
 */
export const DEMO_AREA = { width: 120, height: 52, x0: 6, x1: 114, y0: 10, y1: 44 } as const;

/** A sprout of a demo and where it sits, inside `DEMO_AREA`. */
const demoSprout = z.strictObject({
  label,
  x: z.number().int().min(DEMO_AREA.x0).max(DEMO_AREA.x1),
  y: z.number().int().min(DEMO_AREA.y0).max(DEMO_AREA.y1),
});

/** One step of a demo: a garden move, a script input, or undo and redo. */
const demoStep = z.discriminatedUnion('type', [
  ...levelActionOptions,
  ...flowInputOptions,
  z.strictObject({ type: z.literal('undo') }),
  z.strictObject({ type: z.literal('redo') }),
]);

/** One step of a demo, sprouts by name. */
export type DemoStepData = z.infer<typeof demoStep>;

/** One card: its mechanic and the demo it plays. Texts live in `content/`, by the card's id. */
const card = z.strictObject({
  id: z.enum(CARD_IDS),
  sprouts: z.array(demoSprout).min(2).max(6),
  vines: z.array(vine).min(1),
  lanterns: z.array(vine).default([]),
  /** Whether the tiny garden starts under fog (inspecting). */
  fog: z.boolean().default(false),
  /** Silver lanterns of a reflection shown over the garden from the start. */
  mirror: z.array(vine).default([]),
  /** The options under the garden that a bet or an answer picks from: numbers, or written lines. */
  choices: z
    .strictObject({ count: z.number().int().min(2).max(6), kind: z.enum(['numbers', 'lines']) })
    .optional(),
  steps: z.array(demoStep).min(1),
});

/** One card as the file writes it, defaults filled in. */
export type CardData = z.infer<typeof card>;

/** The whole cards file. */
export const cardsSchema = z.array(card).min(1);
