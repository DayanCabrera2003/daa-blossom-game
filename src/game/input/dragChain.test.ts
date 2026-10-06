import { createGraph } from '@core/graph/createGraph';
import { createMatching } from '@core/matching/createMatching';
import type { ActionType } from '@core/rules/actions';
import { createGardenState } from '@core/rules/state';
import { unwrap } from '@core/shared/result';
import { describe, expect, it } from 'vitest';
import { chainGain, extendChain, finishChain, startChain } from './dragChain';

// Level 1.3: S–a=b–c=d–T with distractors b–x=y and c–z (z free).
// S a b c d T x y z = 0 1 2 3 4 5 6 7 8.
const brigadeGraph = unwrap(
  createGraph(9, [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 4],
    [4, 5],
    [2, 6],
    [6, 7],
    [3, 8],
  ]),
);
const brigade = createGardenState({
  graph: brigadeGraph,
  matching: unwrap(
    createMatching(brigadeGraph, [
      [1, 2],
      [3, 4],
      [6, 7],
    ]),
  ),
  allowed: ['chain'],
});

/** Drags through the sprouts in order, returning the last step. */
const drag = (vertices: number[], state = brigade) => {
  let step = startChain(state, vertices[0] as number);
  for (const v of vertices.slice(1)) step = extendChain(state, step.path, v);
  return step;
};

describe('dragging a chain', () => {
  it('follows alternating vines from a sprout in the dark (level 1.3)', () => {
    expect(drag([0, 1, 2, 3, 4, 5])).toEqual({ path: [0, 1, 2, 3, 4, 5], rejection: null });
    expect(chainGain(brigade, [0, 1, 2, 3, 4, 5])).toBe(1);
  });

  it('refuses the distractor c–z with the reason, and stays where it was', () => {
    expect(drag([0, 1, 2, 3, 8])).toEqual({
      path: [0, 1, 2, 3],
      rejection: { code: 'invalidPath', error: { code: 'notAlternating', index: 3 } },
    });
  });

  it('cannot start on a sprout that already has a lantern', () => {
    expect(startChain(brigade, 1)).toEqual({
      path: [],
      rejection: { code: 'invalidPath', error: { code: 'endpointNotExposed', vertex: 1 } },
    });
  });

  it('only moves to neighbors, and going back over the last step takes it back', () => {
    expect(drag([0, 2])).toMatchObject({
      path: [0],
      rejection: { code: 'invalidPath', error: { code: 'notAdjacent' } },
    });
    expect(drag([0, 1, 2, 1])).toEqual({ path: [0, 1], rejection: null });
    expect(drag([0, 1, 1])).toEqual({ path: [0, 1], rejection: null });
  });

  it('an empty drag cannot be extended', () => {
    expect(extendChain(brigade, [], 0)).toEqual({ path: [], rejection: null });
  });
});

describe('letting go of a chain', () => {
  it('a chain ending in the dark lights one more lantern', () => {
    expect(finishChain(brigade, [0, 1, 2, 3, 4, 5])).toEqual({
      type: 'chain',
      path: [0, 1, 2, 3, 4, 5],
    });
  });

  it('ending on a lantern it moves the darkness: a chain of gain 0 (level 1.4)', () => {
    expect(chainGain(brigade, [0, 1, 2])).toBe(0);
    expect(finishChain(brigade, [0, 1, 2])).toEqual({ type: 'chain', path: [0, 1, 2] });
  });

  it('where rotating the stem is unlocked, a chain of gain 0 is that move (level 4.10)', () => {
    const later = { ...brigade, allowed: new Set<ActionType>(['chain', 'rotateStem']) };
    expect(finishChain(later, [0, 1, 2])).toEqual({ type: 'rotateStem', stem: [0, 1, 2] });
  });

  it('a chain that would leave a sprout with two lanterns still goes to the rules, for its reason', () => {
    expect(chainGain(brigade, [0, 1, 2, 3])).toBeNull();
    expect(finishChain(brigade, [0, 1, 2, 3])).toEqual({ type: 'chain', path: [0, 1, 2, 3] });
  });

  it('a single sprout is a touch, not a chain', () => {
    expect(finishChain(brigade, [0])).toBeNull();
    expect(chainGain(brigade, [0])).toBeNull();
  });
});
