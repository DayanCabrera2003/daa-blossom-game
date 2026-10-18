// Additive bell synthesis (plan 06, section 1.8): each note is a sum of sine partials, each with
// its own loudness and decay, after a short attack. Pure and without randomness, so the same
// parameters always give the same samples, and the committed sounds can be checked byte for byte.

/** One sine partial of the bell, relative to the note it rings. */
export interface BellPartial {
  /** Its frequency as a multiple of the note's (1 is the fundamental). */
  readonly ratio: number;
  /** Its loudness relative to the other partials. */
  readonly amplitude: number;
  /** Seconds it takes to fall to 1/e of its loudness: high partials die first, like a real bell. */
  readonly decay: number;
}

/** The sound of the bell, shared by every note it rings. */
export interface BellTimbre {
  readonly partials: readonly BellPartial[];
  /** Seconds the strike takes to reach full loudness: a few milliseconds, so it does not click. */
  readonly attack: number;
  /** Seconds each note rings before it is cut (with a short fade). */
  readonly duration: number;
  /** The loudest sample of the result, as a fraction of full scale: below 1, so nothing saturates. */
  readonly peak: number;
}

/** One note struck on the bell. */
export interface BellNote {
  /** Its fundamental, in hertz. */
  readonly frequency: number;
  /** Seconds after the start of the sound at which it is struck. */
  readonly start: number;
  /** Its loudness relative to the other notes of the sound. */
  readonly gain: number;
}

/** The largest 16-bit sample. */
const FULL_SCALE = 32767;

/** Seconds of the fade that closes every note, so a cut never clicks. */
const FADE = 0.005;

/** The envelope of one partial `t` seconds after its note was struck. */
function envelope(t: number, partial: BellPartial, timbre: BellTimbre): number {
  const rise = timbre.attack > 0 ? Math.min(1, t / timbre.attack) : 1;
  const tail = timbre.duration - t;
  const fade = Math.min(1, Math.max(0, tail / FADE));
  return rise * fade * Math.exp(-t / partial.decay);
}

/** Adds one note to the mix, leaving out partials at or above half the sample rate (aliasing). */
function strike(mix: Float64Array, note: BellNote, timbre: BellTimbre, sampleRate: number): void {
  const offset = Math.round(note.start * sampleRate);
  const length = Math.round(timbre.duration * sampleRate);
  for (const partial of timbre.partials) {
    const hz = note.frequency * partial.ratio;
    if (hz >= sampleRate / 2) continue;
    const step = (2 * Math.PI * hz) / sampleRate;
    for (let i = 0; i < length; i++) {
      // The last sample sits exactly at the end of the fade, so it is silence.
      const t = (i * timbre.duration) / Math.max(1, length - 1);
      const at = offset + i;
      mix[at] =
        (mix[at] ?? 0) +
        note.gain * partial.amplitude * envelope(t, partial, timbre) * Math.sin(step * i);
    }
  }
}

/**
 * Rings the notes on the bell and returns mono 16-bit samples, from the first strike to the end
 * of the last note, scaled so the loudest sample is `timbre.peak` of full scale.
 */
export function renderBell(
  notes: readonly BellNote[],
  timbre: BellTimbre,
  sampleRate: number,
): Int16Array {
  if (notes.length === 0) return new Int16Array(0);
  const end = Math.max(...notes.map((note) => note.start)) + timbre.duration;
  const mix = new Float64Array(Math.round(end * sampleRate));
  for (const note of notes) strike(mix, note, timbre, sampleRate);
  const loudest = mix.reduce((max, value) => Math.max(max, Math.abs(value)), 0);
  const scale = loudest > 0 ? (timbre.peak * FULL_SCALE) / loudest : 0;
  return Int16Array.from(mix, (value) => Math.round(value * scale));
}
