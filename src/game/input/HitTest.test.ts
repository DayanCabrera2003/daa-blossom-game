import { contract } from '@core/blossom/contract';
import { createGraph } from '@core/graph/createGraph';
import { createMatching } from '@core/matching/createMatching';
import { createGardenState } from '@core/rules/state';
import { unwrap } from '@core/shared/result';
import { describe, expect, it } from 'vitest';
import { hitTest, SPROUT_HIT_RADIUS } from './HitTest';

// Level 4.1 as laid out in its file: R a b c d e = 0 1 2 3 4 5.
const positions = [
  { x: 50, y: 135 },
  { x: 130, y: 135 },
  { x: 210, y: 135 },
  { x: 290, y: 85 },
  { x: 290, y: 185 },
  { x: 390, y: 85 },
];
const graph = unwrap(
  createGraph(6, [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 4],
    [2, 4],
    [3, 5],
  ]),
);
const open = createGardenState({
  graph,
  matching: unwrap(
    createMatching(graph, [
      [1, 2],
      [3, 4],
    ]),
  ),
  allowed: [],
});
const folded = { ...open, layer: contract(open.layer, [2, 3, 4]).layer };

describe('what lies under the pointer', () => {
  it('a sprout, within a generous radius', () => {
    expect(hitTest(open, positions, { x: 52, y: 137 })).toEqual({ kind: 'sprout', vertex: 0 });
    expect(hitTest(open, positions, { x: 50 + SPROUT_HIT_RADIUS, y: 135 })).toEqual({
      kind: 'sprout',
      vertex: 0,
    });
  });

  it('a vine, near the line between its sprouts', () => {
    expect(hitTest(open, positions, { x: 170, y: 137 })).toEqual({ kind: 'vine', u: 1, v: 2 });
  });

  it('nothing, far from everything', () => {
    expect(hitTest(open, positions, { x: 10, y: 10 })).toEqual({ kind: 'nothing' });
  });

  it('a folded flower inside its outline; its own vines belong to it (4.4)', () => {
    expect(hitTest(folded, positions, { x: 250, y: 110 })).toEqual({ kind: 'flower', blossom: 0 });
    expect(hitTest(folded, positions, { x: 270, y: 135 })).toEqual({ kind: 'flower', blossom: 0 });
  });

  it('a petal still wins over its flower, and vines leaving the flower can still be touched', () => {
    expect(hitTest(folded, positions, { x: 290, y: 85 })).toEqual({ kind: 'sprout', vertex: 3 });
    expect(hitTest(folded, positions, { x: 340, y: 85 })).toEqual({ kind: 'vine', u: 3, v: 5 });
  });

  it('only the outermost flower is offered, nested flowers open from the outside in (5.2)', () => {
    // Level 5.1 as laid out in its file: R a b c d g h t = 0 1 2 3 4 5 6 7.
    const wildPositions = [
      { x: 60, y: 135 },
      { x: 140, y: 75 },
      { x: 230, y: 75 },
      { x: 300, y: 135 },
      { x: 300, y: 30 },
      { x: 230, y: 200 },
      { x: 140, y: 200 },
      { x: 140, y: 20 },
    ];
    const wild = unwrap(
      createGraph(8, [
        [0, 1],
        [1, 2],
        [2, 3],
        [3, 4],
        [2, 4],
        [3, 5],
        [5, 6],
        [0, 6],
        [1, 7],
      ]),
    );
    const start = createGardenState({
      graph: wild,
      matching: unwrap(
        createMatching(wild, [
          [1, 2],
          [3, 4],
          [5, 6],
        ]),
      ),
      allowed: [],
    });
    const inner = contract(start.layer, [2, 3, 4]).layer;
    const twice = { ...start, layer: contract(inner, [0, 1, 2, 3, 4]).layer };
    expect(hitTest(twice, wildPositions, { x: 200, y: 135 })).toEqual({
      kind: 'flower',
      blossom: 1,
    });
    expect(hitTest(twice, wildPositions, { x: 140, y: 47 })).toEqual({ kind: 'vine', u: 1, v: 7 });
  });
});
