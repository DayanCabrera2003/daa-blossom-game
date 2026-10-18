import { applyAction } from '../rules/applyAction';
import type { GardenState } from '../rules/state';
import { growStep } from '../search/growForest';
import { invariant } from '../shared/invariant';
import { itemAt } from '../shared/itemAt';
import type { RecipeCase } from './recipe';
import { AUTOMATON_MOVES, type AutomatonMove } from './run';

/**
 * Which case of the recipe each move of a run answers (Códex C10, the recipe told card by card):
 * the card the mechanical gardener is following when it makes that move. A sun at the start is the
 * start card; a look along a vine `sun–x` is the case `growStep` sees, from the garden just before
 * it (x lit: a moon; x in the dark or a sun of another tree: a chain; a sun of the same tree: a
 * flower); the flowers a chain crosses are opened, and the chain lit, by the card that found it;
 * "Terminé" is the end card. The moves are played by the rules from `start`, as `runRecipe` plays
 * them, so the cases are those of the very run.
 */
export function runCases(start: GardenState, moves: readonly AutomatonMove[]): RecipeCase[] {
  let state: GardenState = {
    ...start,
    allowed: new Set(AUTOMATON_MOVES),
    roots: null,
    revealed: null,
  };
  // The case of the look that found the chain being opened and lit.
  let chainCase: RecipeCase | null = null;

  /** The case of a look from the sprout `from` (a sun's) to the sprout `to`. */
  const lookCase = (from: number, to: number): RecipeCase => {
    const { layer, search } = state;
    invariant(search !== null, 'a look is made only once marks exist');
    const [sun, x] = [itemAt(layer.nodeOf, from), itemAt(layer.nodeOf, to)];
    const step = growStep(layer.matching, search, sun, x);
    switch (step.kind) {
      case 'grow':
        return 'lit';
      case 'chain':
        return search.label[x] === 'outer' ? 'otherTree' : 'dark';
      case 'oddCycle':
        return 'sameTree';
      case 'alreadyInner':
        return 'moon';
    }
  };

  return moves.map((move): RecipeCase => {
    let answered: RecipeCase;
    switch (move.type) {
      case 'markRoot':
        answered = 'start';
        break;
      case 'markMoon':
        answered = lookCase(move.from, move.to);
        if (answered === 'dark' || answered === 'otherTree') chainCase = answered;
        break;
      case 'foldAt':
        answered = 'sameTree';
        break;
      case 'unfold':
      case 'chain':
        invariant(chainCase !== null, 'a chain is opened and lit only after a look finds it');
        answered = chainCase;
        break;
      case 'declareDone':
        answered = 'end';
        break;
    }
    const outcome = applyAction(state, move);
    invariant(outcome.ok, `the rules accept every move of a recipe's run, not ${move.type}`);
    state = outcome.state;
    return answered;
  });
}
