import { createGraph } from '@core/graph/createGraph';
import { createMatching } from '@core/matching/createMatching';
import { unwrap } from '@core/shared/result';
import { describe, expect, it } from 'vitest';
import { checkMirror, drawVine, startChallenge } from '../systems/mirrorChallenge';
import { checkText, drawingPicture } from './mirrorDrawing';

/** A row 0–1–2–3 with the middle vine lit, and a lone pair 4–5 far below it, also lit. */
const graph = unwrap(
  createGraph(6, [
    [0, 1],
    [1, 2],
    [2, 3],
    [4, 5],
  ]),
);
const yours = unwrap(
  createMatching(graph, [
    [1, 2],
    [4, 5],
  ]),
);
const positions = [
  { x: 100, y: 80 },
  { x: 160, y: 80 },
  { x: 220, y: 80 },
  { x: 280, y: 80 },
  { x: 100, y: 180 },
  { x: 160, y: 180 },
];
const labels = ['A', 'B', 'C', 'D', 'E', 'F'];

const drawn = (vines: [number, number][]) =>
  vines.reduce((c, [u, v]) => unwrap(drawVine(c, graph, u, v)), startChallenge(graph));

describe('the picture of the mirror challenge', () => {
  it('while drawing, only the silver lanterns show, over the garden', () => {
    expect(drawingPicture(yours, startChallenge(graph), positions, labels).strands).toEqual([]);
    const picture = drawingPicture(yours, drawn([[0, 1]]), positions, labels);
    expect(picture).toEqual({
      strands: [{ a: positions[0], b: positions[1], side: 'mirror', piece: null }],
      sprouts: [],
      offsets: [],
      separated: false,
      dissolved: false,
      degree: null,
      winning: null,
    });
  });

  it('a check that does not beat you leaves the drawing as it was', () => {
    const { challenge } = checkMirror(drawn([[0, 1]]), yours);
    expect(drawingPicture(yours, challenge, positions, labels).separated).toBe(false);
  });

  it('a better reflection is overlaid, separated, and its winning thread pointed at', () => {
    const { challenge, check } = checkMirror(
      drawn([
        [0, 1],
        [2, 3],
        [4, 5],
      ]),
      yours,
    );
    const picture = drawingPicture(yours, challenge, positions, labels);
    expect(picture.separated).toBe(true);
    expect(picture.dissolved).toBe(false);
    expect(check.kind).toBe('better');
    // The pair E=F is lit on both sides: it fades, and the only piece is the winning thread.
    expect(picture.winning).toBe(0);
    expect(picture.strands.map((strand) => strand.side)).toEqual([
      'mirror',
      'yours',
      'mirror',
      'shared',
    ]);
    expect(picture.sprouts.map((sprout) => sprout.label)).toEqual(['A', 'B', 'C', 'D']);
  });

  it('each check is told in words: not better, a chain, or a reflection already tried', () => {
    const weak = checkMirror(drawn([[0, 1]]), yours);
    expect(checkText(weak.check)).toEqual({
      key: 'mirror.notBetter',
      params: { drawn: 1, yours: 2 },
    });
    const better = checkMirror(
      drawn([
        [0, 1],
        [2, 3],
        [4, 5],
      ]),
      yours,
    );
    expect(checkText(better.check)).toEqual({ key: 'mirror.chain', params: {} });
    expect(checkText(checkMirror(better.challenge, yours).check)).toEqual({
      key: 'mirror.again',
      params: {},
    });
  });
});
