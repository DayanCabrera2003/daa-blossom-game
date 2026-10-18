import { describe, expect, it } from 'vitest';
import { checkLayout, labelsOnVines, vineCrossings } from './layoutChecks';

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

  it('finds a name a vine of other sprouts runs through, as the free mode keeps them too', () => {
    // B–C runs level at y 64, through the name of A (61 to 68); its lantern hangs far to the right.
    const sprouts = [at('A', 100, 50), at('B', 40, 64), at('C', 200, 64)];
    expect(checkLayout({ sprouts, vines: [['B', 'C']], secret: undefined })).toEqual([
      { code: 'labelOnVine', label: 'A', vine: ['B', 'C'] },
    ]);
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

  it("finds a name drawn over the crown of the sprout below it: leaves, petals or a bee's wings", () => {
    // The name of A ends at 68; each crown rises above its body, which alone would leave it clear.
    const under = (kind: 'bee' | 'flower' | undefined, y: number) =>
      checkLayout({
        sprouts: [
          at('A', 100, 50),
          { ...at('B', 100, y), ...(kind === undefined ? {} : { kind }) },
        ],
        vines: [],
        secret: undefined,
      });
    const hidden = { code: 'labelOnSprout', label: 'A', sprout: 'B' };
    expect(under(undefined, 78)).toEqual([hidden]);
    expect(under('flower', 78)).toEqual([hidden]);
    expect(under('bee', 77)).toEqual([hidden]);
    expect(under('flower', 80)).toEqual([]);
    expect(under('bee', 78)).toEqual([]);
  });

  it("finds a name drawn over a body's outline, or a flower's side corner", () => {
    // The name of A runs from x 97 to 103 and from y 61 to 68.
    const beside = (kind: 'bee' | 'flower' | undefined, x: number) =>
      checkLayout({
        sprouts: [at('A', 100, 50), { ...at('B', x, 64), ...(kind === undefined ? {} : { kind }) }],
        vines: [],
        secret: undefined,
      });
    const hidden = { code: 'labelOnSprout', label: 'A', sprout: 'B' };
    expect(beside(undefined, 111)).toEqual([hidden]);
    expect(beside(undefined, 112)).toEqual([]);
    expect(beside('flower', 113)).toEqual([hidden]);
    expect(beside('flower', 114)).toEqual([]);
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

describe('labelsOnVines', () => {
  // The name of A, at (100, 50), is written from x 97 to 103 and from y 61 to 68. The vines run
  // long, so that their lanterns hang far from it.
  const A = at('A', 100, 50);
  const across = (y: number) => ({
    sprouts: [A, at('B', 40, y), at('C', 200, y)],
    vines: [['B', 'C'] as const],
  });
  const onVine = { code: 'labelOnVine', label: 'A', vine: ['B', 'C'] };

  it('finds a name a horizontal vine runs through', () => {
    expect(labelsOnVines(across(64))).toEqual([onVine]);
  });

  it('finds a name just above a horizontal vine, and leaves one a pixel of air above it', () => {
    // The lit stroke is 2 px wide: at 69 it reaches up to 68, at 70 to 69.
    expect(labelsOnVines(across(69))).toEqual([onVine]);
    expect(labelsOnVines(across(70))).toEqual([]);
  });

  it('finds a vertical vine through the middle of a name', () => {
    const garden = {
      sprouts: [A, at('P', 100, -100), at('Q', 100, 200)],
      vines: [['P', 'Q'] as const],
    };
    expect(labelsOnVines(garden)).toEqual([{ code: 'labelOnVine', label: 'A', vine: ['P', 'Q'] }]);
  });

  it("never counts a vine of the name's own sprout", () => {
    const garden = { sprouts: [A, at('D', 100, 120)], vines: [['A', 'D'] as const] };
    expect(labelsOnVines(garden)).toEqual([]);
  });
});
