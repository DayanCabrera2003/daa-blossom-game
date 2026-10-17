// The crickets of the prologue (GDD chapter 0: "sin música todavía, solo grillos"): a few
// crickets chirping on a loop, synthesized from versioned parameters like the chimes. Each chirp
// is a short train of sine pulses; every cricket chirps at a steady rate that divides the loop,
// so the loop repeats without a seam. Pure and without randomness: same parameters, same samples.

/** Seconds of the loop the chapter 0 screens play over and over. */
export const LOOP_SECONDS = 8;

/** One cricket: its pitch, how often and how it chirps, and how loud it is. */
export interface Cricket {
  /** The pitch of its pulses, in hertz. */
  readonly frequency: number;
  /** How many chirps it makes in one loop, evenly spaced. */
  readonly chirpsPerLoop: number;
  /** How many pulses one chirp has. */
  readonly pulses: number;
  /** Seconds after the start of the loop of its first chirp. */
  readonly offset: number;
  /** Its loudness relative to the other crickets. */
  readonly gain: number;
}

/** Seconds one pulse of a chirp lasts, and the time from one pulse to the next. */
const PULSE = 0.014;
const PULSE_PERIOD = 0.022;

/** The loudest sample of the loop, as a fraction of full scale: a quiet background. */
const PEAK = 0.25;

/** The largest 16-bit sample. */
const FULL_SCALE = 32767;

/** Three crickets at different pitches and rates, so the night never sounds like a metronome. */
export const CRICKETS: readonly Cricket[] = [
  { frequency: 4400, chirpsPerLoop: 13, pulses: 3, offset: 0.05, gain: 1 },
  { frequency: 4900, chirpsPerLoop: 11, pulses: 4, offset: 0.31, gain: 0.7 },
  { frequency: 3900, chirpsPerLoop: 9, pulses: 2, offset: 0.53, gain: 0.5 },
];

/** Adds one chirp starting at `start` seconds to the mix: its pulses, each with a smooth swell. */
function chirp(mix: Float64Array, cricket: Cricket, start: number, sampleRate: number): void {
  const step = (2 * Math.PI * cricket.frequency) / sampleRate;
  const length = Math.round(PULSE * sampleRate);
  for (let p = 0; p < cricket.pulses; p++) {
    const offset = Math.round((start + p * PULSE_PERIOD) * sampleRate);
    for (let i = 0; i < length; i++) {
      // sin² over the pulse: it starts and ends at silence, so a pulse never clicks.
      const swell = Math.sin((Math.PI * i) / length) ** 2;
      const at = offset + i;
      if (at < mix.length) mix[at] = (mix[at] ?? 0) + cricket.gain * swell * Math.sin(step * at);
    }
  }
}

/**
 * Renders one loop of the crickets as mono 16-bit samples, scaled so the loudest sample is
 * `PEAK` of full scale. The last chirp of each cricket ends well before the loop does.
 */
export function renderCrickets(crickets: readonly Cricket[], sampleRate: number): Int16Array {
  const mix = new Float64Array(LOOP_SECONDS * sampleRate);
  for (const cricket of crickets) {
    const every = LOOP_SECONDS / cricket.chirpsPerLoop;
    for (let k = 0; k < cricket.chirpsPerLoop; k++)
      chirp(mix, cricket, cricket.offset + k * every, sampleRate);
  }
  const loudest = mix.reduce((max, value) => Math.max(max, Math.abs(value)), 0);
  const scale = loudest > 0 ? (PEAK * FULL_SCALE) / loudest : 0;
  return Int16Array.from(mix, (value) => Math.round(value * scale));
}
