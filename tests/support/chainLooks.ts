import { AUTOMATON_MOVES, type AutomatonMove } from '@core/recipe/run';
import { applyAction } from '@core/rules/applyAction';
import type { GardenState } from '@core/rules/state';
import { growStep } from '@core/search/growForest';
import type { ForestLabel } from '@core/search/forest';

/**
 * The mark of the far end of every look of a recipe's run that finds a chain, read in the garden
 * just before the look, as the rules see it. The recipe's cards tell a chain to a sprout in the
 * dark and unmarked (`'none'`) from a chain to a sun of another tree (`'outer'`); this is the
 * evidence of which of the two a run ever meets, independent of how the core names its cases.
 * The moves are replayed as `runRecipe` plans them: every automaton move allowed, from every dark
 * sprout, with the fog lifted.
 */
export function chainLookMarks(start: GardenState, moves: readonly AutomatonMove[]): ForestLabel[] {
  let state: GardenState = {
    ...start,
    allowed: new Set(AUTOMATON_MOVES),
    roots: null,
    revealed: null,
  };
  const marks: ForestLabel[] = [];
  for (const move of moves) {
    if (move.type === 'markMoon' && state.search !== null) {
      const { nodeOf } = state.layer;
      const [sun, x] = [nodeOf[move.from], nodeOf[move.to]];
      if (sun === undefined || x === undefined) throw new Error('a look between unknown sprouts');
      const step = growStep(state.layer.matching, state.search, sun, x);
      if (step.kind === 'chain') marks.push(state.search.label[x] ?? 'none');
    }
    const outcome = applyAction(state, move);
    if (!outcome.ok) throw new Error(`${move.type} refused: ${outcome.reason.code}`);
    state = outcome.state;
  }
  return marks;
}
