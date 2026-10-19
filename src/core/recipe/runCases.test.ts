import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { graphWithMatchingArb } from '../../../tests/support/arbitraries';
import { createGraph } from '../graph/createGraph';
import type { Graph } from '../graph/types';
import { createMatching } from '../matching/createMatching';
import type { Matching } from '../matching/types';
import { createGardenState, type GardenState } from '../rules/state';
import { unwrap } from '../shared/result';
import { AUTOMATON_MOVES, runRecipe } from './run';
import { runCases } from './runCases';

/** A garden open to the automaton's moves, with these lanterns. */
const gardenOf = (graph: Graph, matching?: Matching): GardenState =>
  createGardenState({
    graph,
    ...(matching === undefined ? {} : { matching }),
    allowed: AUTOMATON_MOVES,
  });

/** The run of the right recipe in `start`, folding, with the case each move follows. */
function casesOf(start: GardenState) {
  const moves = runRecipe(start, { fold: true });
  return { moves, cases: runCases(start, moves) };
}

describe('the card each move of a run follows', () => {
  it('on a row of four with its middle lit: suns, a moon, a chain root to root, the end', () => {
    // 0 – 1 = 2 – 3: the suns 0 and 3 start; 0 makes 1 a moon and 2 a sun; 3 meets that sun.
    const row = unwrap(
      createGraph(4, [
        [0, 1],
        [1, 2],
        [2, 3],
      ]),
    );
    const { moves, cases } = casesOf(gardenOf(row, unwrap(createMatching(row, [[1, 2]]))));
    expect(moves.map((move) => move.type)).toEqual([
      'markRoot',
      'markRoot',
      'markMoon',
      'markMoon',
      'chain',
      'declareDone',
    ]);
    expect(cases).toEqual(['start', 'start', 'lit', 'otherTree', 'otherTree', 'end']);
  });

  it('a look that reaches a sprout in the dark is a chain root to root, never to the dark', () => {
    const vine = unwrap(createGraph(2, [[0, 1]]));
    const { cases } = casesOf(gardenOf(vine));
    // Both are suns at the start; the look from 0 reaches 1, a sun of another tree.
    expect(cases).toEqual(['start', 'start', 'otherTree', 'otherTree', 'end']);
    // With only 0 marked, the same look would reach 1 unmarked in the dark: no run of a recipe
    // does that (every dark sprout is a sun from the start), so it is a broken run.
    const toTheDark = () =>
      runCases(gardenOf(vine), [
        { type: 'markRoot', vertex: 0 },
        { type: 'markMoon', from: 0, to: 1 },
        { type: 'chain', path: [0, 1] },
      ]);
    expect(toTheDark).toThrow();
    const lonely = unwrap(
      createGraph(3, [
        [0, 1],
        [1, 2],
      ]),
    );
    // 1 = 2 lit and 0 alone: 0 makes 1 a moon, 2 a sun; nothing else is in the dark.
    const lit = casesOf(gardenOf(lonely, unwrap(createMatching(lonely, [[1, 2]])))).cases;
    expect(lit).toEqual(['start', 'lit', 'end']);
  });

  it('a flower is folded by its card, and the flowers a chain crosses open by the chain card', () => {
    // R – a = b, the triangle b c = d, then d – e = f – S, a second root: R a b c d e f S as 0…7.
    // R grows to b, S grows to e, b folds the triangle, and e meets the flower: a sun of R's tree.
    const kite = unwrap(
      createGraph(8, [
        [0, 1],
        [1, 2],
        [2, 3],
        [3, 4],
        [4, 2],
        [4, 5],
        [5, 6],
        [6, 7],
      ]),
    );
    const start = gardenOf(
      kite,
      unwrap(
        createMatching(kite, [
          [1, 2],
          [3, 4],
          [5, 6],
        ]),
      ),
    );
    const { moves, cases } = casesOf(start);
    const paired = moves.map((move, i) => [move.type, cases[i]]);
    expect(paired).toContainEqual(['foldAt', 'sameTree']);
    expect(paired).toContainEqual(['unfold', 'otherTree']);
    expect(paired).toContainEqual(['chain', 'otherTree']);
  });

  it('gives every move of any run one case, the run starting and ending as its cards say', () => {
    fc.assert(
      fc.property(graphWithMatchingArb({ maxN: 8 }), ([graph, matching]) => {
        const { moves, cases } = casesOf(gardenOf(graph, matching));
        expect(cases).toHaveLength(moves.length);
        expect(cases.at(-1)).toBe('end');
        moves.forEach((move, i) => {
          if (move.type === 'markRoot') expect(cases[i]).toBe('start');
          if (move.type === 'foldAt') expect(cases[i]).toBe('sameTree');
        });
        // A moon is left alone: no move ever follows its card.
        expect(cases).not.toContain('moon');
      }),
    );
  });
});
