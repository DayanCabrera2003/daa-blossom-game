import { describe, expect, it } from 'vitest';
import { FLICKER_FRAME_MS, HALO_FRAMES } from './lanternFlicker';
import { glowBox, signpostGlow } from './signpostGlow';

/** A signpost as the hub stands one: 16 px square, after the flower's column. */
const SIGN = { x: 26, y: 40, width: 16, height: 16 };

/** Every frame of every lantern of the hub's eight chapters. */
const GLOWS = Array.from({ length: 8 }, (_, index) =>
  [0, 1, 2].map((frame) => signpostGlow(SIGN, frame * FLICKER_FRAME_MS, index)),
).flat();

describe('the glow of a signpost lantern', () => {
  it('is centred on the signpost', () => {
    for (const glow of GLOWS) {
      expect(glow.x).toBe(SIGN.x + SIGN.width / 2);
      expect(glow.y).toBe(SIGN.y + SIGN.height / 2);
    }
  });

  it('stays inside the signpost, a pixel in from each edge', () => {
    for (const glow of GLOWS) {
      const box = glowBox(glow);
      expect(box.x).toBeGreaterThanOrEqual(SIGN.x + 1);
      expect(box.y).toBeGreaterThanOrEqual(SIGN.y + 1);
      expect(box.x + box.width).toBeLessThanOrEqual(SIGN.x + SIGN.width - 1);
      expect(box.y + box.height).toBeLessThanOrEqual(SIGN.y + SIGN.height - 1);
    }
  });

  it('is fainter than a lantern of the garden, its outer tone fainter than its inner', () => {
    for (const { inner, outer } of GLOWS) {
      expect(outer.radius).toBeGreaterThan(inner.radius);
      expect(outer.alpha).toBeLessThan(inner.alpha);
      expect(inner.alpha).toBeLessThan(Math.min(...HALO_FRAMES.map((halo) => halo.inner.alpha)));
    }
  });

  it('still flickers: its frames are not all the same', () => {
    const frames = new Set(GLOWS.map(({ inner, outer }) => JSON.stringify([inner, outer])));
    expect(frames.size).toBeGreaterThan(1);
  });

  it('shrinks with a smaller signpost and never grows past it', () => {
    const small = { x: 0, y: 0, width: 6, height: 6 };
    const box = glowBox(signpostGlow(small, FLICKER_FRAME_MS, 0));
    expect(box.x).toBeGreaterThanOrEqual(1);
    expect(box.x + box.width).toBeLessThanOrEqual(5);
  });
});
