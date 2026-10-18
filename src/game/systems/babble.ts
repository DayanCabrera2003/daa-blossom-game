import { itemAt } from '@core/shared/itemAt';
import { createRng } from '@core/shared/rng';
import type { AssetKey } from '../assets/keys';
import type { Speaker, SpokenLine } from './speaker';
import { PACES, revealTimes } from './typewriter';

/** One syllable of babble: which sound, how fast (its pitch), in which voice and when. */
export interface Syllable {
  /** When it starts, in ms after the line starts typing. */
  readonly at: number;
  readonly key: AssetKey;
  /** Playback rate: below 1 the syllable sounds lower (and longer) than recorded. */
  readonly rate: number;
  /** The voice it belongs to: always 0, except in the oaks' chorus of three. */
  readonly layer: number;
  /** The character of the line it sounds on, always a letter. */
  readonly letter: number;
  /** Its own volume within the voices channel, between 0 and 1. */
  readonly volume: number;
}

/** One voice of a speaker: its range of rates, its delay behind the letter and its volume. */
export interface VoiceLayer {
  readonly rate: readonly [low: number, high: number];
  readonly delay: number;
  readonly volume: number;
}

/** How a speaker babbles: the syllables he picks from, one every how many letters, in which voices. */
export interface Voice {
  readonly keys: readonly AssetKey[];
  readonly every: number;
  readonly layers: readonly VoiceLayer[];
}

/**
 * The babble of each speaker (plan 06, section 1.9; GDD §3.2 and §4.2). The pack's syllables are
 * high, so every male voice plays them slower: the mentor warm and mid-low, the gnome high and
 * rushed, the oaks a chorus of three very low voices, each a little later than the one below. Each
 * oak keeps a narrow band around its own pitch (0.42, 0.47 and 0.53), so the line id can still vary
 * it slightly. The gardener (the player) and the notebook do not babble.
 */
export const VOICES: Readonly<Record<Speaker, Voice | null>> = {
  sauce: {
    keys: ['voice.6', 'voice.10', 'voice.3'],
    every: 3,
    layers: [{ rate: [0.6, 0.68], delay: 0, volume: 1 }],
  },
  bruto: {
    keys: ['voice.1', 'voice.2', 'voice.4'],
    every: 3,
    layers: [{ rate: [1.15, 1.35], delay: 0, volume: 1 }],
  },
  oaks: {
    keys: ['voice.7', 'voice.6'],
    every: 4,
    // Three voices at once would be loud: each sounds softer than a single speaker.
    layers: [
      { rate: [0.41, 0.43], delay: 0, volume: 0.6 },
      { rate: [0.46, 0.48], delay: 35, volume: 0.6 },
      { rate: [0.52, 0.54], delay: 70, volume: 0.6 },
    ],
  },
  gardener: null,
  notebook: null,
};

/** A letter of any alphabet: the only characters that babble (no spaces, marks or digits). */
const LETTER = /^\p{L}$/u;

/** A 32-bit FNV-1a hash of `text`: the seed that makes a line always sound the same. */
function seedOf(text: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash = Math.imul(hash ^ text.charCodeAt(i), 0x01000193);
  }
  return hash >>> 0;
}

/**
 * The syllables of `line`, in the order they start. Every `every`-th letter (from the first one)
 * sounds a syllable as it appears; which syllable, and the small change of pitch of each voice,
 * come from a generator seeded with the line id. All the voices of a beat say the same syllable.
 * A voice's syllable that would start after the last letter has appeared is left out, so the
 * babble never outlasts the text. A speaker who does not babble gives none.
 */
export function babble(line: SpokenLine): Syllable[] {
  const voice = VOICES[line.speaker];
  if (voice === null) return [];
  const chars = Array.from(line.text);
  const reveal = revealTimes(line.text, PACES[line.speaker]);
  const letters = chars.flatMap((char, i) => (LETTER.test(char) ? [i] : []));
  if (letters.length === 0) return [];
  const end = itemAt(reveal, itemAt(letters, letters.length - 1));
  const rng = createRng(seedOf(line.id));
  const syllables: Syllable[] = [];
  letters.forEach((letter, n) => {
    if (n % voice.every !== 0) return;
    const key = rng.pick(voice.keys);
    voice.layers.forEach(({ rate: [low, high], delay, volume }, layer) => {
      // Drawn even when the syllable is left out, so each beat takes the same numbers.
      const rate = low + (high - low) * rng.next();
      const at = itemAt(reveal, letter) + delay;
      if (at <= end) syllables.push({ at, key, rate, layer, letter, volume });
    });
  });
  return syllables.sort((a, b) => a.at - b.at);
}
