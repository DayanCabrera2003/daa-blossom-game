import { describe, expect, it } from 'vitest';
import { createGraph } from '../../graph/createGraph';
import { createMatching } from '../../matching/createMatching';
import { unwrap } from '../../shared/result';
import { createGardenState } from '../state';
import { rotateStem } from './rotateStem';

// Level 4.10: R–a=b, triangle b–c=d–b, exit c–e. R a b c d e = 0 1 2 3 4 5.
const festival = unwrap(
  createGraph(6, [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 4],
    [2, 4],
    [3, 5],
  ]),
);
const state = createGardenState({
  graph: festival,
  matching: unwrap(
    createMatching(festival, [
      [1, 2],
      [3, 4],
    ]),
  ),
  allowed: ['rotateStem'],
});

describe('rotate the stem', () => {
  it('R–a=b becomes R=a–b: same lanterns, the base b now in the dark (level 4.10)', () => {
    const outcome = rotateStem(state, { type: 'rotateStem', stem: [0, 1, 2] });
    expect(outcome.ok && outcome.state.matching.mate).toEqual([1, 0, -1, 4, 3, -1]);
    expect(outcome.ok && outcome.events).toEqual([{ type: 'augment', path: [0, 1, 2] }]);
  });

  it('a chain that gains a lantern is not a stem', () => {
    expect(rotateStem(state, { type: 'rotateStem', stem: [0, 1, 2, 4, 3, 5] })).toMatchObject({
      ok: false,
      reason: { code: 'invalidPath', error: { code: 'wrongParity' } },
    });
  });
});
