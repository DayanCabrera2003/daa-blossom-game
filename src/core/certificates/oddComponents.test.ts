import { describe, expect, it } from 'vitest';
import { createGraph } from '../graph/createGraph';
import { cycleGraph } from '../generators/families';
import { unwrap } from '../shared/result';
import { oddComponents } from './oddComponents';

// Level 7.3, "the helix": center C = 0 joined to one sprout of each of three triangles.
const helix = unwrap(
  createGraph(10, [
    [0, 1],
    [0, 4],
    [0, 7],
    [1, 2],
    [2, 3],
    [1, 3],
    [4, 5],
    [5, 6],
    [4, 6],
    [7, 8],
    [8, 9],
    [7, 9],
  ]),
);

describe('odd groups left after lifting stones', () => {
  it('the five-cycle is one odd group with no stones lifted (level 7.2)', () => {
    expect(oddComponents(cycleGraph(5), [])).toEqual([[0, 1, 2, 3, 4]]);
  });

  it('the whole helix is one even group, which proves nothing', () => {
    expect(oddComponents(helix, [])).toEqual([]);
  });

  it('lifting C leaves three triangles, three odd groups (level 7.3)', () => {
    expect(oddComponents(helix, [0])).toEqual([
      [1, 2, 3],
      [4, 5, 6],
      [7, 8, 9],
    ]);
  });

  it('even groups do not count (the square of the notebook in 7.3)', () => {
    expect(oddComponents(cycleGraph(4), [])).toEqual([]);
  });
});
