import { describe, expect, it } from 'vitest';
import { CRICKETS, LOOP_SECONDS, renderCrickets } from '../tools/synth/crickets';
import { strongest } from './support/spectrum';

const RATE = 22050;

describe('the crickets of the prologue night', () => {
  const samples = renderCrickets(CRICKETS, RATE);

  it('last one whole loop', () => {
    expect(samples).toHaveLength(LOOP_SECONDS * RATE);
  });

  it('are silent at both ends, so the loop has no seam', () => {
    const edge = Math.round(0.04 * RATE);
    expect(samples.slice(0, edge).every((s) => s === 0)).toBe(true);
    expect(samples.slice(samples.length - edge).every((s) => s === 0)).toBe(true);
  });

  it('stay quiet: a background, never louder than a quarter of full scale', () => {
    const loudest = samples.reduce((max, s) => Math.max(max, Math.abs(s)), 0);
    expect(loudest).toBeGreaterThan(0);
    expect(loudest).toBeLessThanOrEqual(Math.round(0.25 * 32767));
  });

  it('chirp at the pitch of the loudest cricket', () => {
    const loudest = CRICKETS.reduce((a, b) => (b.gain > a.gain ? b : a));
    const pitch = strongest(samples.slice(0, RATE), RATE, { low: 3000, high: 6000, step: 25 });
    expect(Math.abs(pitch - loudest.frequency)).toBeLessThanOrEqual(50);
  });

  it('give the same samples on every run', () => {
    expect(
      Buffer.from(renderCrickets(CRICKETS, RATE).buffer).equals(Buffer.from(samples.buffer)),
    ).toBe(true);
  });
});
