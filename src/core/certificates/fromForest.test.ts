import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  bipartiteWithMatchingArb,
  graphWithDensityArb,
  matchingArb,
} from '../../../tests/support/arbitraries';
import { members } from '../blossom/hierarchy';
import { edmonds } from '../edmonds/solve';
import { runPhase } from '../edmonds/phase';
import { connectedComponents } from '../graph/components';
import { createGraph } from '../graph/createGraph';
import { createMatching } from '../matching/createMatching';
import { size } from '../matching/queries';
import { unwrap } from '../shared/result';
import { stonesFromForest } from './fromForest';
import { checkTutteBerge } from './tutteBerge';
import { checkVertexCover, koenigCover } from './vertexCover';

// Level 7.4: the closed flower of 4.9 (R–a=b, triangle b–c=d–b) twice, side by side.
// R a b c d = 0 1 2 3 4 and R' a' b' c' d' = 5 6 7 8 9.
const twice = unwrap(
  createGraph(10, [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 4],
    [2, 4],
    [5, 6],
    [6, 7],
    [7, 8],
    [8, 9],
    [7, 9],
  ]),
);
const lanterns = unwrap(
  createMatching(twice, [
    [1, 2],
    [3, 4],
    [6, 7],
    [8, 9],
  ]),
);

describe('stones from the failed search', () => {
  it('lifts the moons: a and a′ (level 7.4)', () => {
    const outcome = runPhase(twice, lanterns);
    if (outcome.kind !== 'maximum') throw new Error('expected no chain');
    expect(stonesFromForest(outcome.layer, outcome.forest)).toEqual([1, 6]);
  });

  it('and the certificate closes: {R}, {b, c, d} and their twins are four odd groups', () => {
    const outcome = runPhase(twice, lanterns);
    if (outcome.kind !== 'maximum') throw new Error('expected no chain');
    const proof = unwrap(
      checkTutteBerge(twice, lanterns, stonesFromForest(outcome.layer, outcome.forest)),
    );
    expect(proof.bound).toBe(4);
    expect(proof.oddGroups).toEqual([[0], [2, 3, 4], [5], [7, 8, 9]]);
  });

  it('property (C12, Theorem 12.3): the odd groups are the suns and flowers, the rest pairs up', () => {
    fc.assert(
      fc.property(
        graphWithDensityArb({ maxN: 14 }).chain((graph) =>
          fc.tuple(fc.constant(graph), matchingArb(graph)),
        ),
        ([graph, initial]) => {
          const run = edmonds(graph, initial);
          const { finalLayer: layer, finalForest: forest } = run;
          const stones = stonesFromForest(layer, forest);
          const groups = connectedComponents(graph, new Set(stones));
          const suns = layer.nodes
            .filter((_, id) => forest.label[id] === 'outer')
            .map((node) => members(node).join(','));
          const odd = groups.filter((group) => group.length % 2 === 1);
          // Each sun or flower is one odd group by itself, and there is no other odd group.
          expect(odd.map((group) => group.join(',')).sort()).toEqual([...suns].sort());
          // The even groups are made of unreached sprouts, paired among themselves by M.
          for (const group of groups.filter((g) => g.length % 2 === 0)) {
            for (const v of group) {
              expect(forest.label[layer.nodeOf[v] as number]).toBe('none');
              expect(group).toContain(run.matching.mate[v]);
            }
          }
          // odd(G − U) − |U| is the number of sprouts in the dark.
          expect(odd.length - stones.length).toBe(graph.n - 2 * size(run.matching));
        },
      ),
    );
  });

  it('property (C12, Corollary 12.5): in bees and flowers nothing folds, and König comes back', () => {
    fc.assert(
      fc.property(bipartiteWithMatchingArb({ maxN: 12 }), ([graph, initial]) => {
        const run = edmonds(graph, initial);
        expect(run.finalLayer.nodes.every((node) => node.kind === 'sprout')).toBe(true);
        expect(run.trace.some((event) => event.type === 'contract')).toBe(false);
        const cover = koenigCover(graph, run.finalForest);
        expect(checkVertexCover(graph, cover).ok).toBe(true);
        expect(cover.length).toBe(size(run.matching));
        // The stones are the moons, and they are the whole cover when the search reached everyone.
        const stones = stonesFromForest(run.finalLayer, run.finalForest);
        expect(stones.every((v) => cover.includes(v))).toBe(true);
        if (run.finalForest.label.every((label) => label !== 'none')) expect(cover).toEqual(stones);
      }),
    );
  });
});
