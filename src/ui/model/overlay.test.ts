import { describe, expect, it } from 'vitest';
import { groupOf, ringOf, strandOf } from './overlay';

/** Three sprouts in an L: 0 at the corner, 1 to its right, 2 below it. */
const at = [
  { x: 10, y: 10 },
  { x: 30, y: 10 },
  { x: 10, y: 40 },
];

describe('the marks of a special diagram', () => {
  it('lays a strand on its vine, whichever way the vine is named', () => {
    expect(strandOf(at, [0, 1], 'yours')).toEqual({
      a: { x: 10, y: 10 },
      b: { x: 30, y: 10 },
      tone: 'yours',
    });
    expect(strandOf(at, [1, 0], 'mirror')).toEqual(strandOf(at, [0, 1], 'mirror'));
  });

  it('shifts a strand sideways, the same way for both namings, so two fit on one vine', () => {
    const shifted = strandOf(at, [1, 0], 'mirror', 4);
    expect(shifted).toEqual({ a: { x: 10, y: 14 }, b: { x: 30, y: 14 }, tone: 'mirror' });
    const down = strandOf(at, [2, 0], 'mirror', 4);
    expect(down.a.x).toBeCloseTo(6);
    expect(down.b.x).toBeCloseTo(6);
  });

  it('wraps a group with the vines inside it only, its label at the middle', () => {
    const group = groupOf(
      at,
      [0, 1],
      [
        [0, 1],
        [0, 2],
      ],
      'odd',
      '1',
    );
    expect(group).toEqual({
      tone: 'odd',
      sprouts: [at[0], at[1]],
      links: [[at[0], at[1]]],
      label: '1',
      labelAt: { x: 20, y: 10 },
    });
    expect(groupOf(at, [2], [], 'even').label).toBeNull();
  });

  it('rings a sprout where it sits', () => {
    expect(ringOf(at, 2, 'base')).toEqual({ at: { x: 10, y: 40 }, tone: 'base' });
  });
});
