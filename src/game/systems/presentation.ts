import type { GardenState } from '@core/rules/state';
import type { CardId } from '@levels/cards/schema';
import type { Question } from './question';
import type { StarResult } from './stars';

/**
 * The order the player sees things in on the level screen (plan 03, phases 3, 4, 6 and 12).
 * Mechanic cards, lines of dialogue, questions, counterexamples, the replayed day and the victory
 * panel never overlap: each waits until the one before it is over (the card or the lines closed,
 * the question answered, the player back from the counterexample, the replay finished). Pure: the scene shows what this says to start and
 * reports back when it is over. Toasts and move animations are not queued; they show at once.
 */

/** Something shown on its own, until it is over. */
export type Presentation =
  /**
   * A mechanic card (GDD §5.11), queued before whatever its moment opens; over when the player
   * closes it, and its panel keeps the garden from taking touches meanwhile.
   */
  | { readonly kind: 'tutorial'; readonly card: CardId }
  /** Lines of dialogue, already translated; over when the player closes the box. */
  | { readonly kind: 'lines'; readonly lines: readonly string[] }
  /** A question or a bet, until it is answered; its panel keeps the garden from taking touches. */
  | { readonly kind: 'question'; readonly question: Question }
  /** The day replaying itself through these states, dawn to dusk; the garden takes no input. */
  | { readonly kind: 'replay'; readonly day: readonly GardenState[] }
  /**
   * The garden that refutes a false notebook statement (`option`), in a screen of its own; over when
   * the player goes back to the notebook.
   */
  | { readonly kind: 'counterexample'; readonly option: number }
  /** The victory panel; the level ends with it, so nothing after it ever shows. */
  | { readonly kind: 'victory'; readonly stars: StarResult };

/** What is on screen now, and what waits its turn, in order. */
export interface Stage {
  readonly showing: Presentation | null;
  readonly waiting: readonly Presentation[];
}

/** A stage with nothing on it. */
export const emptyStage: Stage = { showing: null, waiting: [] };

/** The stage after a change, and the item the scene has to start showing now, if any. */
export type StageTurn = { stage: Stage; start: Presentation | null };

/** Puts the next waiting item on an empty stage. */
function next(waiting: readonly Presentation[]): StageTurn {
  const [first, ...rest] = waiting;
  return first === undefined
    ? { stage: emptyStage, start: null }
    : { stage: { showing: first, waiting: rest }, start: first };
}

/** Queues items after everything already queued; on an empty stage the first one starts. */
export function present(stage: Stage, items: readonly Presentation[]): StageTurn {
  const waiting = [...stage.waiting, ...items];
  return stage.showing === null ? next(waiting) : { stage: { ...stage, waiting }, start: null };
}

/** The item on stage is over: the next one in line starts, if any. */
export const finishShowing = (stage: Stage): StageTurn => next(stage.waiting);

/** Whether the player's input is held back: only while the day replays. */
export const blocksInput = (stage: Stage): boolean => stage.showing?.kind === 'replay';

/** The question on stage was answered: it leaves and the next item starts. Anything else stays. */
export const answerShowing = (stage: Stage): StageTurn =>
  stage.showing?.kind === 'question' ? next(stage.waiting) : { stage, start: null };

/**
 * Whether the lines of a hint show at once, beside what is on stage, instead of waiting their turn:
 * only beside an open question, which waits for the very answer the hint helps to find.
 */
export const hintsShowBeside = (stage: Stage): boolean => stage.showing?.kind === 'question';

/** Whether a mechanic card is on stage or waiting its turn. */
export const hasCards = (stage: Stage): boolean =>
  [stage.showing, ...stage.waiting].some((item) => item?.kind === 'tutorial');
