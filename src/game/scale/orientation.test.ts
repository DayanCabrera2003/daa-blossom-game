import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { cssPixel, integerZoom, MIN_CSS_PIXEL } from './integerZoom';
import { asksToTurn } from './orientation';

// A phone held upright (plan 09, phase 7; the author's answer to question 17 of appendix A): only
// the notice "gira el teléfono" over the game, which is not played until it is turned.

describe('the notice to turn the phone', () => {
  it.each([
    [360, 800, 3],
    [390, 844, 3],
    [412, 915, 2.625],
    [360, 640, 3],
  ])('shows on a phone held upright, %i × %i at density %f', (width, height, density) => {
    expect(asksToTurn(width, height, density)).toBe(true);
  });

  it.each([
    [800, 360, 3],
    [844, 390, 3],
    [915, 412, 2.625],
    [640, 360, 3],
  ])('does not show on the same phone held sideways, %i × %i at density %f', (w, h, density) => {
    expect(asksToTurn(w, h, density)).toBe(false);
  });

  it.each([
    [768, 1024, 2],
    [1280, 720, 1],
    [1440, 810, 1],
    [1920, 1080, 1],
  ])('does not show on a tablet upright or a computer, %i × %i at density %f', (w, h, density) => {
    expect(asksToTurn(w, h, density)).toBe(false);
  });

  it('property: it shows exactly when the window is upright and the game would be under ×1', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 200, max: 4000 }),
        fc.integer({ min: 200, max: 4000 }),
        fc.constantFrom(1, 1.5, 2, 2.625, 3, 3.5),
        (width, height, density) => {
          const small = cssPixel(integerZoom(width, height, density), density) < MIN_CSS_PIXEL;
          expect(asksToTurn(width, height, density)).toBe(height > width && small);
        },
      ),
    );
  });

  it('never shows at density 1, where the game is at least ×1', () => {
    fc.assert(
      fc.property(fc.nat(4000), fc.nat(4000), (width, height) => {
        expect(asksToTurn(width, height, 1)).toBe(false);
      }),
    );
  });
});
