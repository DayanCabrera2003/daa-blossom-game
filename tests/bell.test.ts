import { describe, expect, it } from 'vitest';
import { renderBell, type BellTimbre } from '../tools/synth/bell';
import { magnitude, strongest } from './support/spectrum';

const RATE = 22050;

/** A bell with a strong fundamental and two quieter inharmonic partials above it. */
const TIMBRE: BellTimbre = {
  partials: [
    { ratio: 1, amplitude: 1, decay: 0.4 },
    { ratio: 2.76, amplitude: 0.4, decay: 0.2 },
    { ratio: 5.4, amplitude: 0.2, decay: 0.1 },
  ],
  attack: 0.004,
  duration: 0.6,
  peak: 0.8,
};

describe('the synthesized bell', () => {
  it.each([523.25, 1046.5, 3520])('rings at %s Hz to within 1 %%', (hz) => {
    const samples = renderBell([{ frequency: hz, start: 0, gain: 1 }], TIMBRE, RATE);
    // A coarse scan over every partial finds the fundamental strongest; a fine one pins it.
    const coarse = strongest(samples.subarray(0, 4096), RATE, { low: 100, high: 10000, step: 10 });
    const fine = strongest(samples, RATE, { low: coarse - 15, high: coarse + 15, step: 0.5 });
    expect(Math.abs(fine - hz) / hz).toBeLessThan(0.01);
  });

  it('lasts its duration and never saturates, its loudest sample at the peak asked for', () => {
    const samples = renderBell([{ frequency: 880, start: 0, gain: 1 }], TIMBRE, RATE);
    expect(samples.length).toBe(Math.round(TIMBRE.duration * RATE));
    const loudest = Math.max(...Array.from(samples, Math.abs));
    expect(loudest).toBeLessThan(32767);
    expect(loudest).toBe(Math.round(TIMBRE.peak * 32767));
  });

  it('starts and ends in silence, so it never clicks', () => {
    const samples = renderBell([{ frequency: 660, start: 0, gain: 1 }], TIMBRE, RATE);
    expect(samples[0]).toBe(0);
    expect(samples[samples.length - 1]).toBe(0);
  });

  it('gives the same samples on every run', () => {
    const notes = [
      { frequency: 523.25, start: 0, gain: 1 },
      { frequency: 659.25, start: 0.08, gain: 0.7 },
    ];
    expect(renderBell(notes, TIMBRE, RATE)).toEqual(renderBell(notes, TIMBRE, RATE));
  });

  it('starts each note at its own time: nothing sounds before the first one', () => {
    const samples = renderBell([{ frequency: 880, start: 0.1, gain: 1 }], TIMBRE, RATE);
    const before = samples.subarray(0, Math.round(0.1 * RATE));
    expect(before.every((sample) => sample === 0)).toBe(true);
    expect(samples.length).toBe(Math.round((0.1 + TIMBRE.duration) * RATE));
  });

  it('leaves out partials above half the sample rate, which would fold back as other notes', () => {
    // At 3520 Hz the 5.4 partial (19 kHz) is past 11 kHz: it would come back near 3 kHz.
    const samples = renderBell([{ frequency: 3520, start: 0, gain: 1 }], TIMBRE, RATE);
    const folded = RATE - 3520 * 5.4;
    expect(magnitude(samples, Math.abs(folded), RATE)).toBeLessThan(
      magnitude(samples, 3520, RATE) / 100,
    );
  });

  it('is silence for no notes', () => {
    expect(renderBell([], TIMBRE, RATE).length).toBe(0);
  });
});
