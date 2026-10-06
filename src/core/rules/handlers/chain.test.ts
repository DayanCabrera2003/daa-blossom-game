import { describe, expect, it } from 'vitest';
import { contract } from '../../blossom/contract';
import { createGraph } from '../../graph/createGraph';
import { createMatching } from '../../matching/createMatching';
import { unwrap } from '../../shared/result';
import { createGardenState } from '../state';
import { chain } from './chain';

// Level 1.4: A free. Branch 1: A–B=C–D=E (a dead end). Branch 2: A–F=G–H, H free.
// A B C D E F G H = 0 1 2 3 4 5 6 7.
const alley = unwrap(
  createGraph(8, [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 4],
    [0, 5],
    [5, 6],
    [6, 7],
  ]),
);
const state = createGardenState({
  graph: alley,
  matching: unwrap(
    createMatching(alley, [
      [1, 2],
      [3, 4],
      [5, 6],
    ]),
  ),
  allowed: ['chain'],
});

describe('chain: pass the lanterns along a path', () => {
  it('ending in the dark lights one more lantern (branch 2)', () => {
    const outcome = chain(state, { type: 'chain', path: [0, 5, 6, 7] });
    expect(outcome.ok && outcome.state.matching.mate).toEqual([5, 2, 1, 4, 3, 0, 7, 6]);
    expect(outcome.ok && outcome.events).toEqual([{ type: 'augment', path: [0, 5, 6, 7] }]);
  });

  it('ending on a lantern is allowed with gain 0: the darkness only moves (branch 1)', () => {
    const outcome = chain(state, { type: 'chain', path: [0, 1, 2, 3, 4] });
    expect(outcome.ok && outcome.state.matching.mate).toEqual([1, 0, 3, 2, -1, 6, 5, -1]);
  });

  it('two dark vines in a row are refused: B already has a lantern', () => {
    expect(chain(state, { type: 'chain', path: [0, 1, 0] })).toMatchObject({
      ok: false,
      reason: { code: 'invalidPath', error: { code: 'repeatedVertex' } },
    });
    expect(chain(state, { type: 'chain', path: [5, 0, 1] })).toMatchObject({
      ok: false,
      reason: { code: 'invalidPath' },
    });
  });

  it('a chain has to start in the dark', () => {
    expect(chain(state, { type: 'chain', path: [1, 2, 3, 4] })).toMatchObject({
      ok: false,
      reason: { code: 'invalidPath', error: { code: 'endpointNotExposed', vertex: 1 } },
    });
  });

  it('a chain stopping right after a dark vine on a lit sprout is refused', () => {
    expect(chain(state, { type: 'chain', path: [0, 1, 2, 3] })).toMatchObject({
      ok: false,
      reason: { code: 'invalidPath', error: { code: 'wrongParity' } },
    });
  });

  it('lanterns only move in the open garden', () => {
    const triangle = unwrap(
      createGraph(3, [
        [0, 1],
        [1, 2],
        [0, 2],
      ]),
    );
    const open = createGardenState({
      graph: triangle,
      matching: unwrap(createMatching(triangle, [[1, 2]])),
      allowed: ['chain'],
    });
    const folded = { ...open, layer: contract(open.layer, [0, 1, 2]).layer };
    expect(chain(folded, { type: 'chain', path: [0, 1, 2] })).toEqual({
      ok: false,
      reason: { code: 'flowersFolded' },
    });
  });
});
