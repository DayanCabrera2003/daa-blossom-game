import { describe, expect, it } from 'vitest';
import { FLICKER_FRAME_MS, HALO_FRAMES, lanternFlicker } from './lanternFlicker';

describe('the flicker of a lantern', () => {
  it('has three frames, each a halo of two tones: the outer one wider and fainter', () => {
    expect(HALO_FRAMES).toHaveLength(3);
    for (const { inner, outer } of HALO_FRAMES) {
      expect(outer.radius).toBeGreaterThan(inner.radius);
      expect(outer.alpha).toBeLessThan(inner.alpha);
      expect(inner.alpha).toBeLessThanOrEqual(1);
    }
  });

  it('shows the three frames in turn and repeats them', () => {
    const frames = Array.from({ length: 7 }, (_, i) => lanternFlicker(i * FLICKER_FRAME_MS, 0));
    expect(frames.map((f) => f.frame)).toEqual([0, 1, 2, 0, 1, 2, 0]);
    expect(frames[3]).toEqual(frames[0]);
    expect(lanternFlicker(0, 0).halo).toEqual(HALO_FRAMES[0]);
  });

  it('holds a frame for its whole stretch', () => {
    expect(lanternFlicker(FLICKER_FRAME_MS - 1, 0).frame).toBe(0);
    expect(lanternFlicker(FLICKER_FRAME_MS, 0).frame).toBe(1);
  });

  it('puts neighbouring lanterns out of step, so they do not flicker together', () => {
    expect(lanternFlicker(0, 1).frame).not.toBe(lanternFlicker(0, 0).frame);
    expect(lanternFlicker(0, 2).frame).not.toBe(lanternFlicker(0, 1).frame);
  });
});
