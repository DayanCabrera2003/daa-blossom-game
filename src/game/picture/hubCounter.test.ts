import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { hubCounter } from './hubCounter';
import { PIXEL_FONT } from './pixelFont';
import { STAR_SIZE } from './starIcon';

const CELL = PIXEL_FONT.advance;
/** The seed icon of the pack, 8 pixels wide. */
const SEED = 8;

/** The cells of `text` that hold something other than a blank. */
const written = (text: string): number[] =>
  [...text].flatMap((char, i) => (char === ' ' ? [] : [i]));

describe('the counter of stars and seeds by the hub title', () => {
  it('writes the stars after the room of the star, then the seeds after the room of the seed', () => {
    const counter = hubCounter(57, 3, SEED);
    expect(counter.text).toBe('  57   3');
    // The star is centred in its two blank cells, the seed in its own.
    expect(counter.star).toBe(Math.floor((2 * CELL - STAR_SIZE) / 2));
    expect(counter.seed).toBe(5 * CELL + Math.floor((2 * CELL - SEED) / 2));
    expect(counter.width).toBe(8 * CELL);
  });

  it('never draws the star or the seed over a digit, whatever the numbers', () => {
    fc.assert(
      fc.property(fc.nat(999), fc.nat(99), (stars, seeds) => {
        const counter = hubCounter(stars, seeds, SEED);
        const cells = written(counter.text);
        const drawn: [number, number][] = [[counter.star, STAR_SIZE]];
        if (counter.seed !== null) drawn.push([counter.seed, SEED]);
        for (const [left, width] of drawn) {
          const first = Math.floor(left / CELL);
          const last = Math.floor((left + width - 1) / CELL);
          for (const cell of cells) expect(cell < first || cell > last).toBe(true);
        }
        expect(counter.text.trim()).toBe(seeds === 0 ? `${stars}` : `${stars}   ${seeds}`);
        expect(counter.width).toBe([...counter.text].length * CELL);
      }),
    );
  });

  it('leaves the seeds out until the first one is won; the stars always show', () => {
    const none = hubCounter(57, 0, SEED);
    expect(none.text).toBe('  57');
    expect(none.seed).toBeNull();
    expect(none.width).toBe(4 * CELL);
    expect(hubCounter(0, 0, SEED).text).toBe('  0');
    expect(hubCounter(57, 1, SEED).seed).not.toBeNull();
  });

  it('a three-digit count of stars only pushes the seeds a cell further', () => {
    const narrow = hubCounter(57, 3, SEED);
    const wide = hubCounter(134, 3, SEED);
    expect((wide.seed ?? 0) - (narrow.seed ?? 0)).toBe(CELL);
    expect(wide.width).toBe(9 * CELL);
  });
});
