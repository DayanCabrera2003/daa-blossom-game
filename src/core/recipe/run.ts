import { baseVertex } from '../blossom/hierarchy';
import type { VertexId } from '../graph/types';
import { isExposed } from '../matching/queries';
import type { Action, ActionType } from '../rules/actions';
import { applyAction } from '../rules/applyAction';
import type { GardenState } from '../rules/state';
import { looksFrom } from '../search/autoSearch';
import { growStep } from '../search/growForest';
import { searchStatus } from '../search/searchStatus';
import { invariant } from '../shared/invariant';
import { itemAt } from '../shared/itemAt';
import { RECIPE_CARDS, isPlaced, rightCardOf, type Recipe } from './recipe';

/**
 * The mechanical gardener (GDD 6.2, 6.3; plan 05, phase 3): a recipe run in a garden. The automaton
 * has no algorithm of its own. Its run is a list of the player's own moves, each one applied by the
 * rules (`applyAction`) in order, so the sun replays it like any day and a recipe the rules would
 * not accept could not be run at all. What the recipe decides is only which case of the search each
 * vine is (`growStep`, the rules of `markMoon`) and what is done about it.
 */

/** The moves the automaton makes: marks, folds, opening flowers, chains, and "Terminé". */
export type AutomatonMove = Extract<
  Action,
  {
    readonly type: 'markRoot' | 'markMoon' | 'foldAt' | 'unfold' | 'chain' | 'declareDone';
  }
>;

/** The actions a garden must allow for the automaton to run in it. */
export const AUTOMATON_MOVES: readonly ActionType[] = [
  'markRoot',
  'markMoon',
  'foldAt',
  'unfold',
  'chain',
  'declareDone',
];

/** The only thing a recipe changes in its run: whether two suns of one tree fold their loop. */
export interface RunOptions {
  readonly fold: boolean;
}

/**
 * How a recipe runs, or null when the automaton cannot run it. Only the right cards run, in any
 * order; the fold card may be missing (the broken recipe of 6.3), and then the sun–sun of one tree
 * is passed over, as the light did in 4.1. A distractor, or any other card missing, never runs:
 * some would not even end ("repeat until no sprout is left in the dark"), which is why the recipe
 * is judged without running it (`check.ts`) before the automaton ever sees it.
 */
export function runOptionsOf(recipe: Recipe): RunOptions | null {
  const fold = rightCardOf('sameTree').id;
  const runs = RECIPE_CARDS.every((card) =>
    card.right ? card.id === fold || isPlaced(recipe, card.id) : !isPlaced(recipe, card.id),
  );
  return runs ? { fold: isPlaced(recipe, fold) } : null;
}

/**
 * The run of a recipe in the garden `start`, as the moves of the rules, in a fixed order so a garden
 * always runs the same way. Each round, as the cards say:
 * - start (`markDarkSuns`): every sprout or flower in the dark and unmarked gets a sun (`markRoot`),
 *   in ascending order of its base sprout;
 * - the suns are then searched breadth first, in that order, each looking along its dark vines to
 *   the sprouts in ascending order (`looksFrom`, as the light does), and each vine `sun–x` is one
 *   case of `growStep`:
 *   - lit (`growMoon`): `markMoon`, x a moon and its partner a sun, which waits its turn;
 *   - dark, or a sun of another tree (`chainToDark`, `chainRootToRoot`): `markMoon` shows the chain;
 *     the flowers it crosses are opened (`unfold`), outer ones first, and it is lit (`chain`), which
 *     wipes the marks: the next round starts;
 *   - a sun of the same tree (`foldFlower`): `foldAt`, and the flower becomes a sun at the back of
 *     the queue, so every petal's vines are looked along again; without the fold card, nothing;
 *   - a moon (`moonNothing`): nothing;
 * - end (`finishKeepMoons`): a round that finds no chain is the last; the automaton says "Terminé"
 *   (`declareDone`), which keeps the marks: the moons the Council of chapter 7 will need.
 *
 * The run is planned in `start` with every automaton move allowed, from every dark sprout, and with
 * the fog lifted: the recipe looks at the whole garden. Whether a level's own garden accepts the
 * same moves (its locks, roots and fog) is for the level's checks to say.
 *
 * Each round lights one more lantern or is the last, and each fold removes at least two nodes, so
 * the run always ends. With folding it is Edmonds' search from every dark sprout at once, so it ends
 * with the most lanterns the garden can hold; without it, it may stop short (6.3).
 */
export function runRecipe(start: GardenState, { fold }: RunOptions): AutomatonMove[] {
  const moves: AutomatonMove[] = [];
  let state: GardenState = {
    ...start,
    allowed: new Set(AUTOMATON_MOVES),
    roots: null,
    revealed: null,
  };
  const make = (move: AutomatonMove): void => {
    const outcome = applyAction(state, move);
    invariant(outcome.ok, `the rules accept every move of a recipe's run, not ${move.type}`);
    state = outcome.state;
    moves.push(move);
  };
  /** The base sprout of a node of the garden as it is now: what names the node across moves. */
  const sproutOf = (node: VertexId): VertexId => baseVertex(itemAt(state.layer.nodes, node));
  /** The node of the garden as it is now that holds a sprout. */
  const nodeOf = (sprout: VertexId): VertexId => itemAt(state.layer.nodeOf, sprout);

  /** Opens every flower the chain seen crosses, outer ones first, and lights it. */
  const lightChain = (): void => {
    const path = state.chainSeen;
    invariant(path !== null, 'a look that reaches a chain shows it');
    for (;;) {
      const flower = path
        .map((sprout) => itemAt(state.layer.nodes, nodeOf(sprout)))
        .find((node) => node.kind === 'blossom');
      if (flower?.kind !== 'blossom') break;
      make({ type: 'unfold', blossom: flower.id });
    }
    make({ type: 'chain', path });
  };

  /** One round of the recipe; true when it lit a chain, false when the search is over. */
  const round = (): boolean => {
    const dark = state.layer.nodes.flatMap((node, id) =>
      isExposed(state.layer.matching, id) && (state.search?.label[id] ?? 'none') === 'none'
        ? [baseVertex(node)]
        : [],
    );
    for (const sprout of dark) make({ type: 'markRoot', vertex: sprout });
    // The queue holds suns by base sprout, since folding renames the nodes.
    let queue = (state.search?.label ?? []).flatMap((mark, node) =>
      mark === 'outer' ? [sproutOf(node)] : [],
    );
    let head = 0;

    /** The looks of one sun; the flower folded (its node), 'chain', or null when all are done. */
    const searchFrom = (sun: VertexId): VertexId | 'chain' | null => {
      for (const [from, to] of looksFrom(state.layer, sun)) {
        const search = state.search;
        invariant(search !== null, 'a sun is searched only once marks exist');
        const step = growStep(state.layer.matching, search, sun, nodeOf(to));
        switch (step.kind) {
          case 'grow':
            make({ type: 'markMoon', from, to });
            queue.push(sproutOf(step.outer));
            break;
          case 'chain':
            make({ type: 'markMoon', from, to });
            lightChain();
            return 'chain';
          case 'oddCycle':
            if (!fold) break;
            make({ type: 'foldAt', from, to });
            return nodeOf(from);
          case 'alreadyInner':
            break;
        }
      }
      return null;
    };

    while (head < queue.length) {
      const found = searchFrom(nodeOf(itemAt(queue, head++)));
      if (found === 'chain') return true;
      if (found === null) continue;
      // The suns still waiting now name their nodes in the folded garden; those swallowed by the
      // flower are the flower, which goes to the back: the sun just searched is inside it now.
      const waiting = new Set(queue.slice(head).map(nodeOf));
      waiting.delete(found);
      queue = [...waiting, found].map(sproutOf);
      head = 0;
    }
    return false;
  };

  while (round());
  invariant(
    searchStatus(state.layer, state.search, { roots: null, foldAllowed: fold }) === 'exhausted',
    'a run ends only when its search has nothing left to explore',
  );
  make({ type: 'declareDone' });
  return moves;
}
