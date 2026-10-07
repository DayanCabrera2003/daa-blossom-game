import { size } from '@core/matching/queries';
import type { Action } from '@core/rules/actions';
import type { GardenState } from '@core/rules/state';
import type { LevelStep } from '@levels/flow';

/**
 * The reactions of a play step (plan 03, phase 5): what the mentor says while the player plays,
 * after a chain that lights nothing new (1.4) or when the garden reaches a number of lanterns. Pure:
 * it compares the lanterns before and after an accepted move, counted by the core. Each reaction
 * fires at most once in a play of the level; the list of those already fired is kept by the
 * session, outside the history of the garden, so undoing a move never lets its reaction fire again.
 */

/** A reaction as a play step writes it. */
export type Reaction = Extract<LevelStep, { step: 'play' }>['reactions'][number];

/** A reaction that already fired: the index of its play step in the script, and its own index. */
export interface FiredReaction {
  readonly step: number;
  readonly reaction: number;
}

/** The reactions fired so far, this move's included, and the lines they say, in order. */
export type ReactionTurn = { fired: readonly FiredReaction[]; lines: string[] };

/** Whether an accepted move from `before` to `after` triggers a reaction. */
function triggers(reaction: Reaction, action: Action, before: number, after: number): boolean {
  switch (reaction.on) {
    case 'gainZeroChain':
      // A chain is always accepted with gain 0 or 1; gain 0 leaves the count as it was.
      return action.type === 'chain' && after === before;
    case 'lanterns':
      // Reaching a count takes a move that changes it: staying at it reaches nothing.
      return after === reaction.value && before !== reaction.value;
  }
}

/**
 * The reactions of the play step `play` (its index in the script, and its reactions) that an
 * accepted move fires, skipping those in `fired`. Several fire in the order the level writes them.
 */
export function reactionsTo(
  play: { readonly step: number; readonly reactions: readonly Reaction[] },
  fired: readonly FiredReaction[],
  move: { readonly action: Action; readonly before: GardenState; readonly after: GardenState },
): ReactionTurn {
  const before = size(move.before.matching);
  const after = size(move.after.matching);
  const firedNow: FiredReaction[] = [];
  const lines: string[] = [];
  for (const [reaction, written] of play.reactions.entries()) {
    const done = fired.some((f) => f.step === play.step && f.reaction === reaction);
    if (done || !triggers(written, move.action, before, after)) continue;
    firedNow.push({ step: play.step, reaction });
    lines.push(...written.say);
  }
  return { fired: firedNow.length === 0 ? fired : [...fired, ...firedNow], lines };
}
