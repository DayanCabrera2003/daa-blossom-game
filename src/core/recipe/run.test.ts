import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  bipartiteWithMatchingArb,
  graphWithDensityArb,
  graphWithMatchingArb,
  matchingArb,
} from '../../../tests/support/arbitraries';
import { BRUTO_PROPERTY_TIMEOUT } from '../../../tests/support/timeouts';
import { bruteForceMatching } from '../bruteforce/maximumMatching';
import { maximumSize } from '../edmonds/fast/maximum';
import { nestedFlowers } from '../generators/hardCases';
import { createGraph } from '../graph/createGraph';
import type { Graph } from '../graph/types';
import { createMatching } from '../matching/createMatching';
import { size } from '../matching/queries';
import type { Matching } from '../matching/types';
import type { Action } from '../rules/actions';
import { applyAction } from '../rules/applyAction';
import { createGardenState, type GardenState } from '../rules/state';
import { unwrap } from '../shared/result';
import { RECIPE_CARDS, RIGHT_RECIPE, placeCard, withoutCases } from './recipe';
import { AUTOMATON_MOVES, runOptionsOf, runRecipe } from './run';

/** Plays moves in order; a refusal fails the test with its reason. */
const play = (state: GardenState, actions: readonly Action[]): GardenState =>
  actions.reduce((current, action) => {
    const outcome = applyAction(current, action);
    if (!outcome.ok) throw new Error(`${action.type} refused: ${outcome.reason.code}`);
    return outcome.state;
  }, state);

/** A garden open to the automaton's moves, with these lanterns. */
const gardenOf = (graph: Graph, matching?: Matching): GardenState =>
  createGardenState({
    graph,
    ...(matching === undefined ? {} : { matching }),
    allowed: AUTOMATON_MOVES,
  });

/** Where the run leaves the garden, every move played by the rules. */
const ranFrom = (start: GardenState, fold: boolean): GardenState =>
  play(start, runRecipe(start, { fold }));

// The garden of level 5.1: R a b c d g h t as 0…7, a flower b–c–d inside the loop R–a–b–c–g–h,
// lanterns a=b, c=d, g=h, and an exit a–t.
const wildGraph = unwrap(
  createGraph(8, [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 4],
    [4, 2],
    [3, 5],
    [5, 6],
    [6, 0],
    [1, 7],
  ]),
);
const wild = gardenOf(
  wildGraph,
  unwrap(
    createMatching(wildGraph, [
      [1, 2],
      [3, 4],
      [5, 6],
    ]),
  ),
);

describe('the run of a recipe', () => {
  it('without the fold card, the garden of 5.1 stops at 3 lanterns and says "terminé"', () => {
    const moves = runRecipe(wild, { fold: false });
    // Every dark sprout a sun (R, t); R looks at a and h; b at c; the sun–sun d–b is passed over.
    expect(moves).toEqual([
      { type: 'markRoot', vertex: 0 },
      { type: 'markRoot', vertex: 7 },
      { type: 'markMoon', from: 0, to: 1 },
      { type: 'markMoon', from: 0, to: 6 },
      { type: 'markMoon', from: 2, to: 3 },
      { type: 'declareDone' },
    ]);
    const end = play(wild, moves);
    expect(size(end.matching)).toBe(3);
    expect(end.declaredDone).toBe(true);
  });

  it('with the fold card, the same garden folds both flowers and reaches 4', () => {
    const moves = runRecipe(wild, { fold: true });
    const end = play(wild, moves);
    expect(size(end.matching)).toBe(4);
    expect(end.declaredDone).toBe(true);
    const kinds = moves.map((move) => move.type);
    expect(kinds.filter((kind) => kind === 'foldAt')).toHaveLength(2);
    // The chain crosses both flowers: they are opened, outer first, right before it is lit.
    expect(kinds.slice(-4)).toEqual(['unfold', 'unfold', 'chain', 'declareDone']);
  });

  it('starts every round again from the dark sprouts, until no chain is left', () => {
    // A path of four in the dark: one round lights a–b; the next marks b a moon from c, then finds
    // c–d.
    const path = unwrap(
      createGraph(4, [
        [0, 1],
        [1, 2],
        [2, 3],
      ]),
    );
    const moves = runRecipe(gardenOf(path), { fold: true });
    expect(moves).toEqual([
      { type: 'markRoot', vertex: 0 },
      { type: 'markRoot', vertex: 1 },
      { type: 'markRoot', vertex: 2 },
      { type: 'markRoot', vertex: 3 },
      { type: 'markMoon', from: 0, to: 1 },
      { type: 'chain', path: [0, 1] },
      { type: 'markRoot', vertex: 2 },
      { type: 'markRoot', vertex: 3 },
      { type: 'markMoon', from: 2, to: 1 },
      { type: 'markMoon', from: 2, to: 3 },
      { type: 'chain', path: [2, 3] },
      { type: 'declareDone' },
    ]);
  });

  it('a garden with nothing in the dark is over at once', () => {
    const edge = unwrap(createGraph(2, [[0, 1]]));
    const lit = gardenOf(edge, unwrap(createMatching(edge, [[0, 1]])));
    expect(runRecipe(lit, { fold: true })).toEqual([{ type: 'declareDone' }]);
  });

  it('flowers inside flowers are folded one around the other, and kept when no chain is left', () => {
    // Three nestings around a single dark sprout and no chain: the run folds them all and ends.
    const { graph, matching } = nestedFlowers(3);
    const moves = runRecipe(gardenOf(graph, matching), { fold: true });
    expect(moves.filter((move) => move.type === 'foldAt')).toHaveLength(4);
    expect(moves.some((move) => move.type === 'unfold' || move.type === 'chain')).toBe(false);
    expect(size(ranFrom(gardenOf(graph, matching), true).matching)).toBe(maximumSize(graph));
  });

  it(
    'the full recipe reaches the most lanterns on random gardens, as Bruto finds them',
    () => {
      fc.assert(
        fc.property(graphWithMatchingArb({ maxN: 10 }), ([graph, matching]) => {
          const outcome = bruteForceMatching(graph);
          if (outcome.status !== 'complete') throw new Error('brute force gave up');
          const end = ranFrom(gardenOf(graph, matching), true);
          expect(size(end.matching)).toBe(size(outcome.matching));
          expect(end.declaredDone).toBe(true);
        }),
        { numRuns: 500 },
      );
    },
    BRUTO_PROPERTY_TIMEOUT,
  );

  it(
    'the full recipe reaches the maximum on larger gardens of any density',
    () => {
      fc.assert(
        fc.property(
          graphWithDensityArb({ maxN: 18 }).chain((graph) =>
            fc.tuple(fc.constant(graph), matchingArb(graph)),
          ),
          ([graph, matching]) => {
            const end = ranFrom(gardenOf(graph, matching), true);
            expect(size(end.matching)).toBe(maximumSize(graph));
          },
        ),
      );
    },
    BRUTO_PROPERTY_TIMEOUT,
  );

  it('without folding, every move is still accepted and the run never overshoots', () => {
    fc.assert(
      fc.property(graphWithMatchingArb({ maxN: 12 }), ([graph, matching]) => {
        const start = gardenOf(graph, matching);
        const end = ranFrom(start, false);
        expect(size(end.matching)).toBeGreaterThanOrEqual(size(matching));
        expect(size(end.matching)).toBeLessThanOrEqual(maximumSize(graph));
      }),
    );
  });

  it('without folding, a garden with no odd loop still reaches the maximum', () => {
    fc.assert(
      fc.property(bipartiteWithMatchingArb({ maxN: 12 }), ([graph, matching]) => {
        expect(size(ranFrom(gardenOf(graph, matching), false).matching)).toBe(maximumSize(graph));
      }),
    );
  });
});

describe('what a recipe changes in its run', () => {
  it('the right recipe folds, in any order of its cases', () => {
    expect(runOptionsOf(RIGHT_RECIPE)).toEqual({ fold: true });
    const reversed = { ...RIGHT_RECIPE, cases: [...RIGHT_RECIPE.cases].reverse() };
    expect(runOptionsOf(reversed)).toEqual({ fold: true });
  });

  it('without the fold card it runs, passing sun–sun over', () => {
    expect(runOptionsOf(withoutCases(RIGHT_RECIPE, ['sameTree']))).toEqual({ fold: false });
  });

  it('any other card missing, or a distractor placed, is a recipe the automaton cannot run', () => {
    expect(runOptionsOf(withoutCases(RIGHT_RECIPE, ['dark']))).toBeNull();
    expect(runOptionsOf(withoutCases(RIGHT_RECIPE, ['start']))).toBeNull();
    for (const card of RECIPE_CARDS.filter((candidate) => !candidate.right)) {
      const swapped = placeCard(withoutCases(RIGHT_RECIPE, [card.case]), card.id);
      expect(runOptionsOf(swapped)).toBeNull();
    }
  });
});
