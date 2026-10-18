import { describe, expect, it } from 'vitest';
import { checkLayout, vineCrossings } from './layoutChecks';

/** A sprout named `label` at (x, y). */
const at = (label: string, x: number, y: number) => ({ label, x, y });

/** Four sprouts on the corners of a square, far apart. */
const square = [at('A', 100, 50), at('B', 200, 50), at('C', 200, 150), at('D', 100, 150)];

describe('vineCrossings', () => {
  it('finds the two diagonals of a square, once', () => {
    const garden = {
      sprouts: square,
      vines: [['A', 'C'] as const, ['B', 'D'] as const, ['A', 'B'] as const],
    };
    expect(vineCrossings(garden)).toEqual([
      {
        code: 'vinesCross',
        vines: [
          ['A', 'C'],
          ['B', 'D'],
        ],
      },
    ]);
  });

  it('lets the vines of one sprout part from it, and the sides of a square be', () => {
    const sides = [
      ['A', 'B'],
      ['B', 'C'],
      ['C', 'D'],
      ['D', 'A'],
    ] as const;
    expect(vineCrossings({ sprouts: square, vines: sides })).toEqual([]);
  });

  it('sees a vine that runs through a sprout along another vine of it', () => {
    const line = [at('A', 100, 50), at('B', 200, 50), at('C', 300, 50)];
    expect(
      vineCrossings({
        sprouts: line,
        vines: [
          ['A', 'B'],
          ['A', 'C'],
        ],
      }),
    ).toHaveLength(1);
  });
  it('leaves to the garden builder a vine to a sprout the level does not name', () => {
    expect(
      vineCrossings({
        sprouts: square,
        vines: [
          ['A', 'C'],
          ['B', 'Z'],
        ],
      }),
    ).toEqual([]);
  });
});

describe('checkLayout', () => {
  const plain = { sprouts: square, vines: [['A', 'B'] as const], secret: undefined };

  it('passes a garden with room around every name', () => {
    expect(checkLayout(plain)).toEqual([]);
  });

  it('finds a name drawn over the lantern of a short vine down from its sprout', () => {
    // The lantern hangs at (350, 60); the name of e is written from 43 to 53, one pixel too close.
    const sprouts = [at('e', 350, 35), at('f', 350, 85)];
    expect(checkLayout({ sprouts, vines: [['e', 'f']], secret: undefined })).toEqual([
      { code: 'labelOnLantern', label: 'e', vine: ['e', 'f'] },
    ]);
  });

  it('leaves a name with a pixel of air above the lantern, unless its letter has a tail', () => {
    const vines = [['e', 'f']] as const;
    expect(
      checkLayout({ sprouts: [at('e', 350, 34), at('f', 350, 86)], vines, secret: undefined }),
    ).toEqual([]);
    expect(
      checkLayout({
        sprouts: [at('g', 350, 34), at('f', 350, 86)],
        vines: [['g', 'f']],
        secret: undefined,
      }),
    ).toEqual([{ code: 'labelOnLantern', label: 'g', vine: ['g', 'f'] }]);
  });

  it('finds a name drawn over the sprout below it', () => {
    const sprouts = [at('A', 100, 50), at('B', 100, 75)];
    expect(checkLayout({ sprouts, vines: [], secret: undefined })).toContainEqual({
      code: 'labelOnSprout',
      label: 'A',
      sprout: 'B',
    });
  });

  it('finds two names written over each other, once', () => {
    const sprouts = [at('long', 100, 100), at('name', 118, 104)];
    expect(checkLayout({ sprouts, vines: [], secret: undefined })).toEqual([
      { code: 'labelOnLabel', labels: ['long', 'name'] },
    ]);
  });

  it('finds two names that differ only by case, which the pixel font tells apart by size alone', () => {
    const sprouts = [at('c', 100, 50), at('C', 200, 50), at('r', 300, 50)];
    expect(checkLayout({ sprouts, vines: [], secret: undefined })).toEqual([
      { code: 'labelsDifferByCase', labels: ['c', 'C'] },
    ]);
  });

  it('asks a secret flower to keep its vines from crossing, and only reports it elsewhere', () => {
    const crossed = { sprouts: square, vines: [['A', 'C'] as const, ['B', 'D'] as const] };
    expect(checkLayout({ ...crossed, secret: undefined })).toEqual([]);
    expect(checkLayout({ ...crossed, secret: { stars: 2 } })).toEqual([
      {
        code: 'vinesCross',
        vines: [
          ['A', 'C'],
          ['B', 'D'],
        ],
      },
    ]);
  });
});
