import { isMaximum } from '@core/edmonds/fast/maximum';
import type { ActionType } from '@core/rules/actions';
import type { Level } from './build';
import { buildCounterexample } from './counterexample';
import type { GardenError } from './garden';
import { sameKindVines, type KindClash } from './kinds';

/** Something wrong with the notebook of a level; `option` is the statement's index. */
export type NotebookProblem =
  /** The counterexample does not describe a garden. */
  | { readonly code: 'badCounterexample'; readonly option: number; readonly error: GardenError }
  /** The counterexample is touched with an action the level does not give the player. */
  | { readonly code: 'counterexampleLocked'; readonly option: number; readonly action: ActionType }
  /** A garden to draw a better reflection on whose lanterns nobody can beat. */
  | { readonly code: 'counterexampleUnbeatable'; readonly option: number }
  /** A vine of a garden of bees and flowers joins two of a kind. */
  | ({ readonly code: 'counterexampleSameKindVine'; readonly option: number } & KindClash);

/**
 * The checks of a level's notebook (plan 03, phase 6) that the schema cannot see: each
 * counterexample is a garden under the core's rules, it is played with tools the level already
 * gives (a counterexample never teaches a new move), and a `mirrorDraw` one leaves a better
 * reflection to find, or its search would never show the chain it promises. A garden of bees and
 * flowers joins only a bee and a flower, as a level's does. Its lines belonging to
 * the level is checked with every other line of the level.
 */
export function checkNotebook(level: Level): NotebookProblem[] {
  const problems: NotebookProblem[] = [];
  for (const [option, statement] of (level.data.notebook?.options ?? []).entries()) {
    const { counterexample } = statement;
    if (counterexample === undefined) continue;
    const built = buildCounterexample(counterexample);
    if (!built.ok) {
      problems.push({ code: 'badCounterexample', option, error: built.error });
      continue;
    }
    const { start } = built.value;
    for (const action of start.allowed) {
      if (!level.start.allowed.has(action)) {
        problems.push({ code: 'counterexampleLocked', option, action });
      }
    }
    if (counterexample.mode === 'mirrorDraw' && isMaximum(start.graph, start.matching)) {
      problems.push({ code: 'counterexampleUnbeatable', option });
    }
    for (const clash of sameKindVines(counterexample.sprouts, counterexample.vines)) {
      problems.push({ code: 'counterexampleSameKindVine', option, ...clash });
    }
  }
  return problems;
}
