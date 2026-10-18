import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { nineSlice } from './nineSlice';

const source = { width: 16, height: 8 };
const slices = { left: 2, right: 3, top: 2, bottom: 1 };

describe('cutting a picture into nine patches to stretch it to any size', () => {
  it('keeps the corners as they are and stretches the edges and the middle between them', () => {
    const patches = nineSlice(source, slices, { x: 10, y: 20, width: 40, height: 14 });
    expect(patches).toHaveLength(9);
    // The top-left corner, copied pixel for pixel.
    expect(patches[0]).toEqual({
      src: { x: 0, y: 0, width: 2, height: 2 },
      dst: { x: 10, y: 20, width: 2, height: 2 },
    });
    // The middle: the inside of the source, stretched to the inside of the target.
    expect(patches[4]).toEqual({
      src: { x: 2, y: 2, width: 11, height: 5 },
      dst: { x: 12, y: 22, width: 35, height: 11 },
    });
    // The bottom-right corner, at the far corner of the target.
    expect(patches[8]).toEqual({
      src: { x: 13, y: 7, width: 3, height: 1 },
      dst: { x: 47, y: 33, width: 3, height: 1 },
    });
  });

  it('leaves out what has no room: a target as small as its corners has no middle', () => {
    const patches = nineSlice(source, slices, { x: 0, y: 0, width: 5, height: 3 });
    expect(patches).toHaveLength(4);
    expect(patches.every(({ dst }) => dst.width > 0 && dst.height > 0)).toBe(true);
  });

  it('the patches of a target at least as big as its corners tile it exactly, without overlap', () => {
    fc.assert(
      fc.property(fc.integer({ min: 5, max: 200 }), fc.integer({ min: 3, max: 120 }), (w, h) => {
        const patches = nineSlice(source, slices, { x: 3, y: 4, width: w, height: h });
        const area = patches.reduce((sum, { dst }) => sum + dst.width * dst.height, 0);
        expect(area).toBe(w * h);
        for (const { src, dst } of patches) {
          expect(src.x + src.width).toBeLessThanOrEqual(source.width);
          expect(src.y + src.height).toBeLessThanOrEqual(source.height);
          expect(dst.x).toBeGreaterThanOrEqual(3);
          expect(dst.x + dst.width).toBeLessThanOrEqual(3 + w);
          expect(dst.y + dst.height).toBeLessThanOrEqual(4 + h);
        }
      }),
    );
  });
});
