// The versioned parameters of every sound the project synthesizes (plan 06, section 1.8): the
// lantern chimes on a major pentatonic scale from C5, the sparkle at the end of a chain, and the
// chord of a folding flower with its downward arpeggio when it unfolds, and the crickets that are
// the only music of the prologue (`crickets.ts`). Changing a number here
// and running `npm run sounds` remakes the wave files and their manifest entries.
import type { MadeFile, OwnWork } from '../assets/types';
import { encodeWav } from '../assets/wav';
import { renderBell, type BellTimbre } from './bell';
import { CRICKETS, renderCrickets } from './crickets';

/** How many chimes the scale has: three octaves of five notes, C5 to A7. */
export const CHIME_COUNT = 15;

/** The rate every shipped wave file has (the pack effects are brought to it too). */
const SAMPLE_RATE = 22050;

/** Semitones above C of the five notes of the major pentatonic scale: C, D, E, G, A. */
const PENTATONIC = [0, 2, 4, 7, 9] as const;
const NOTE_NAMES = ['C', 'D', 'E', 'G', 'A'] as const;

/** The MIDI number of C5, the first chime. */
const C5 = 72;

/** The frequency of step `i` of the scale (0 is C5), in equal temperament with A4 at 440 Hz. */
export function pentatonicFrequency(i: number): number {
  const octave = Math.floor(i / PENTATONIC.length);
  const semitone = PENTATONIC[i % PENTATONIC.length] ?? 0;
  return 440 * 2 ** ((C5 + 12 * octave + semitone - 69) / 12);
}

/** The name of step `i` of the scale, as the credits list it (e.g. `G6`). */
const noteName = (i: number): string =>
  `${NOTE_NAMES[i % NOTE_NAMES.length] ?? ''}${5 + Math.floor(i / NOTE_NAMES.length)}`;

/**
 * A small glass bell: a strong fundamental and the inharmonic partials of a struck bar, the high
 * ones dying first, peaking a little below full scale so a chord never saturates.
 */
const CHIME: BellTimbre = {
  partials: [
    { ratio: 1, amplitude: 1, decay: 0.45 },
    { ratio: 2.76, amplitude: 0.35, decay: 0.16 },
    { ratio: 5.4, amplitude: 0.14, decay: 0.07 },
    { ratio: 8.93, amplitude: 0.06, decay: 0.04 },
  ],
  attack: 0.003,
  duration: 0.8,
  peak: 0.7,
};

/** The chord rings longer and softer: a flower closing, not a lantern lit. */
const CHORD: BellTimbre = { ...CHIME, duration: 1.1, peak: 0.6 };

/** One note of a synthesized sound: a step of the scale, when it is struck and how loud. */
export interface SoundNote {
  readonly step: number;
  /** Seconds after the start of the sound. */
  readonly start: number;
  readonly gain: number;
}

/** One synthesized sound: its key, its file, the name the credits give it, and its notes. */
export interface SoundParameters {
  readonly key: string;
  readonly file: string;
  readonly name: string;
  readonly timbre: BellTimbre;
  readonly notes: readonly SoundNote[];
}

/** The steps of the pentatonic triad of the fold: C5, E5 and G5. */
const TRIAD = [0, 2, 3] as const;

/** Each chime: one note of the scale, the i-th hop of a chain ringing the i-th. */
const CHIMES: readonly SoundParameters[] = Array.from({ length: CHIME_COUNT }, (_, step) => ({
  key: `sfx.chime${step + 1}`,
  file: `chime-${String(step + 1).padStart(2, '0')}.wav`,
  name: `chime ${step + 1} (${noteName(step)})`,
  timbre: CHIME,
  notes: [{ step, start: 0, gain: 1 }],
}));

/** Every synthesized sound, in the order the manifest lists them. */
export const SOUNDS: readonly SoundParameters[] = [
  ...CHIMES,
  {
    key: 'sfx.sparkle',
    file: 'sparkle.wav',
    name: `sparkle (${[12, 13, 14].map(noteName).join(', ')})`,
    timbre: CHIME,
    // The three highest notes, quickly upwards: the new lantern at the end of a chain.
    notes: [12, 13, 14].map((step, i) => ({ step, start: 0.07 * i, gain: 1 - 0.15 * i })),
  },
  {
    key: 'sfx.fold',
    file: 'fold.wav',
    name: `fold chord (${TRIAD.map(noteName).join(', ')})`,
    timbre: CHORD,
    notes: TRIAD.map((step) => ({ step, start: 0, gain: 1 })),
  },
  {
    key: 'sfx.unfold',
    file: 'unfold.wav',
    name: `unfold arpeggio (${[...TRIAD].reverse().map(noteName).join(', ')})`,
    timbre: CHORD,
    // The same chord, opened one note at a time from the top down.
    notes: [...TRIAD].reverse().map((step, i) => ({ step, start: 0.09 * i, gain: 1 })),
  },
];

/** Renders one sound into a mono wave file. */
function render({ timbre, notes }: SoundParameters): Uint8Array {
  const struck = notes.map(({ step, start, gain }) => ({
    frequency: pentatonicFrequency(step),
    start,
    gain,
  }));
  return encodeWav({
    sampleRate: SAMPLE_RATE,
    channels: [renderBell(struck, timbre, SAMPLE_RATE)],
  });
}

const made = (sound: SoundParameters): MadeFile => ({
  key: sound.key,
  source: sound.name,
  out: `audio/sfx/${sound.file}`,
  kind: 'sfx',
  group: 'boot',
  make: () => render(sound),
});

/** The project's own sounds, credited as its original work under the license of its code. */
export const OWN_WORK: OwnWork = {
  id: 'own',
  credit: {
    name: 'Original work',
    version: null,
    author: 'Dayan Cabrera',
    license: 'MIT',
    url: 'https://github.com/DayanCabrera2003/daa-blossom-game',
  },
  files: [
    ...SOUNDS.map(made),
    {
      key: 'music.ch0',
      source: 'crickets of the prologue night',
      out: 'audio/music/ch0-night.wav',
      kind: 'music',
      group: 'ch0',
      make: () =>
        encodeWav({ sampleRate: SAMPLE_RATE, channels: [renderCrickets(CRICKETS, SAMPLE_RATE)] }),
    },
  ],
};
