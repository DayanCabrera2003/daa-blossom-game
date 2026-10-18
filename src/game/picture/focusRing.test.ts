import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../scale/integerZoom';
import { contrast } from './contrast';
import { FOCUS_RING, focusRing, ringContrast } from './focusRing';
import { PALETTE } from '../view/palette';

/** The pixels some one-pixel lines cover, as "x,y". */
const pixelsOf = (lines: readonly { x: number; y: number; width: number; height: number }[]) => {
  const pixels = new Set<string>();
  for (const line of lines) {
    for (let x = line.x; x < line.x + line.width; x += 1) {
      for (let y = line.y; y < line.y + line.height; y += 1) pixels.add(`${x},${y}`);
    }
  }
  return pixels;
};

/** The non-text contrast WCAG asks of a focus indicator against what it sits on. */
const MIN_RING_CONTRAST = 3;

describe('the ring round the thing in focus', () => {
  it('is a light line two pixels out from the box with a dark line inside it, touching the box', () => {
    const ring = focusRing({ x: 100, y: 50, width: 30, height: 12 });
    const light = pixelsOf(ring.light);
    const dark = pixelsOf(ring.dark);
    // The corners of the light line, two pixels out from the box; of the dark one, one pixel out.
    for (const corner of ['98,48', '131,48', '98,63', '131,63'])
      expect(light.has(corner)).toBe(true);
    for (const corner of ['99,49', '130,49', '99,62', '130,62'])
      expect(dark.has(corner)).toBe(true);
    expect(light.size).toBe(2 * 34 + 2 * 14);
    expect(dark.size).toBe(2 * 32 + 2 * 12);
    // Neither covers the box itself.
    expect(light.has('100,50') || dark.has('100,50')).toBe(false);
  });

  it('is drawn in the light of a lantern over the ink of the pack, both colours of the palette', () => {
    expect(FOCUS_RING.light).toBe('litGlow');
    expect(FOCUS_RING.dark).toBe('ink');
    expect(PALETTE[FOCUS_RING.light]).toBeTypeOf('number');
    expect(PALETTE[FOCUS_RING.dark]).toBeTypeOf('number');
    // Its two lines read apart from each other, so it is one ring on any ground.
    expect(contrast(PALETTE[FOCUS_RING.light], PALETTE[FOCUS_RING.dark])).toBeGreaterThan(10);
  });

  it('stands out 3:1 from the wooden panels, where the amber alone reached 2.45', () => {
    // The face of the panels and of the dialogue's frame (the pack's wood, `tests/wood.test.ts`).
    for (const wood of [0x9b513c, 0x965340, 0xa3754e, 0x755b3e, 0x46402e]) {
      expect(contrast(PALETTE.lit, 0x965340)).toBeLessThan(MIN_RING_CONTRAST);
      expect(ringContrast(wood)).toBeGreaterThanOrEqual(MIN_RING_CONTRAST);
    }
  });

  it('stands out 3:1 from every colour the game paints', () => {
    for (const colour of Object.values(PALETTE))
      expect(ringContrast(colour)).toBeGreaterThanOrEqual(MIN_RING_CONTRAST);
  });

  it('stands out 3:1 from any colour at all, whatever it sits on', () => {
    // Contrast depends only on luminance: grey levels cover every luminance the screen can show,
    // and the colours at random the rest.
    for (let grey = 0; grey <= 255; grey += 1) {
      expect(ringContrast(grey * 0x010101)).toBeGreaterThanOrEqual(MIN_RING_CONTRAST);
    }
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 0xffffff }), (colour) => {
        expect(ringContrast(colour)).toBeGreaterThanOrEqual(MIN_RING_CONTRAST);
      }),
    );
  });

  it('stays on the canvas and off the box, wherever the box is', () => {
    const box = fc
      .record({
        x: fc.integer({ min: 0, max: CANVAS_WIDTH - 1 }),
        y: fc.integer({ min: 0, max: CANVAS_HEIGHT - 1 }),
        width: fc.integer({ min: 1, max: 80 }),
        height: fc.integer({ min: 1, max: 30 }),
      })
      .filter((one) => one.x + one.width <= CANVAS_WIDTH && one.y + one.height <= CANVAS_HEIGHT);
    fc.assert(
      fc.property(box, (one) => {
        const ring = focusRing(one);
        const lines = [...ring.light, ...ring.dark];
        for (const line of lines) {
          expect(line.x).toBeGreaterThanOrEqual(0);
          expect(line.y).toBeGreaterThanOrEqual(0);
          expect(line.x + line.width).toBeLessThanOrEqual(CANVAS_WIDTH);
          expect(line.y + line.height).toBeLessThanOrEqual(CANVAS_HEIGHT);
        }
        // Inside the box only its outermost pixels may be touched, where the canvas ends: a
        // button's label starts two pixels in, so no letter is ever covered.
        for (const pixel of pixelsOf(lines)) {
          const [x = 0, y = 0] = pixel.split(',').map(Number);
          const deep =
            x > one.x && x < one.x + one.width - 1 && y > one.y && y < one.y + one.height - 1;
          expect(deep).toBe(false);
        }
      }),
    );
  });
});
