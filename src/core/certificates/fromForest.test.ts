import { describe, expect, it } from 'vitest';
import { runPhase } from '../edmonds/phase';
import { createGraph } from '../graph/createGraph';
import { createMatching } from '../matching/createMatching';
import { unwrap } from '../shared/result';
import { stonesFromForest } from './fromForest';
import { checkTutteBerge } from './tutteBerge';

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
});
