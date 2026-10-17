import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import lines from '../../content/es/lines.json';
import { assetEntry } from '../assets/keys';
import { babble, VOICES } from './babble';
import { SPEAKERS, type Speaker, type SpokenLine } from './speaker';
import { PACES, revealTimes } from './typewriter';

/** A line of `speaker` saying `text`. */
const line = (speaker: Speaker, text: string, id = `ch1.1.${speaker}.01`): SpokenLine => ({
  id,
  text,
  speaker,
});

/** Any line of a speaker who babbles. */
const voicedLine = fc.record({
  id: fc.string({ maxLength: 20 }),
  text: fc.string({ maxLength: 80 }),
  speaker: fc.constantFrom<Speaker>('sauce', 'bruto', 'oaks'),
});

/** A letter of any alphabet: the only characters that babble. */
const LETTER = /^\p{L}$/u;

describe('the babble of a line', () => {
  it('sounds the same every time the same line is said', () => {
    fc.assert(
      fc.property(voicedLine, (spoken) => {
        expect(babble(spoken)).toEqual(babble({ ...spoken }));
      }),
    );
  });

  it('takes its syllables and their small changes of pitch from the line id', () => {
    const text = 'Mira cómo crecen los brotes del jardín esta mañana';
    const one = babble(line('sauce', text, 'ch1.1.sauce.01'));
    const other = babble(line('sauce', text, 'ch1.1.sauce.02'));
    expect(one.map((s) => s.at)).toEqual(other.map((s) => s.at));
    expect(one).not.toEqual(other);
  });

  it('sounds only on letters, one every few of them, as each letter appears', () => {
    fc.assert(
      fc.property(voicedLine, (spoken) => {
        const chars = Array.from(spoken.text);
        const reveal = revealTimes(spoken.text, PACES[spoken.speaker]);
        const voice = VOICES[spoken.speaker];
        for (const syllable of babble(spoken)) {
          expect(chars[syllable.letter]).toMatch(LETTER);
          const layer = voice?.layers[syllable.layer];
          expect(syllable.at).toBe((reveal[syllable.letter] ?? NaN) + (layer?.delay ?? NaN));
        }
      }),
    );
    // The mentor sounds on the first letter of every three: «h», «a» and «ú».
    expect(babble(line('sauce', 'hola, ¿y tú? dí')).map((s) => s.letter)).toEqual([0, 3, 10]);
  });

  it('never has two syllables of one voice sounding at once', () => {
    fc.assert(
      fc.property(voicedLine, (spoken) => {
        const syllables = babble(spoken);
        for (const layer of [0, 1, 2]) {
          const times = syllables.filter((s) => s.layer === layer).map((s) => s.at);
          times.slice(1).forEach((at, i) => expect(at).toBeGreaterThan(times[i] ?? Infinity));
        }
      }),
    );
  });

  it('keeps each voice within the pitch of its speaker', () => {
    fc.assert(
      fc.property(voicedLine, (spoken) => {
        for (const syllable of babble(spoken)) {
          const layer = VOICES[spoken.speaker]?.layers[syllable.layer];
          const [low, high] = layer?.rate ?? [NaN, NaN];
          expect(syllable.rate).toBeGreaterThanOrEqual(low);
          expect(syllable.rate).toBeLessThanOrEqual(high);
          expect(VOICES[spoken.speaker]?.keys).toContain(syllable.key);
        }
      }),
    );
  });

  it('leaves no syllable to sound after the last letter has appeared', () => {
    fc.assert(
      fc.property(voicedLine, (spoken) => {
        const chars = Array.from(spoken.text);
        const reveal = revealTimes(spoken.text, PACES[spoken.speaker]);
        const letters = chars.flatMap((char, i) => (LETTER.test(char) ? [i] : []));
        const last = letters[letters.length - 1] ?? -1;
        for (const syllable of babble(spoken)) {
          expect(syllable.at).toBeLessThanOrEqual(reveal[last] ?? -Infinity);
        }
      }),
    );
  });

  it('gives a line with no letters no babble', () => {
    expect(babble(line('bruto', '¡¿…?! 123'))).toEqual([]);
  });

  it('lets the oaks speak in three voices at once, lowest first and each a little later', () => {
    const syllables = babble(line('oaks', 'Demuéstralo, pequeño jardinero, ante el consejo.'));
    const first = syllables.filter((s) => s.letter === 0);
    expect(first.map((s) => s.layer)).toEqual([0, 1, 2]);
    expect(first.map((s) => s.at)).toEqual([0, 35, 70]);
    expect(new Set(first.map((s) => s.key)).size).toBe(1);
    expect(first[0]?.rate).toBeLessThan(first[1]?.rate ?? 0);
    expect(first[1]?.rate).toBeLessThan(first[2]?.rate ?? 0);
  });

  it('lets the mentor and the gnome speak in a single voice', () => {
    for (const speaker of ['sauce', 'bruto'] as const) {
      const syllables = babble(line(speaker, 'Probemos todas las combinaciones, una a una.'));
      expect(syllables.length).toBeGreaterThan(0);
      expect(syllables.every((s) => s.layer === 0)).toBe(true);
    }
  });

  it('keeps the gardener and the notebook silent', () => {
    expect(VOICES.gardener).toBeNull();
    expect(VOICES.notebook).toBeNull();
    expect(babble(line('gardener', 'Creo que ya lo entiendo.'))).toEqual([]);
    expect(babble(line('notebook', 'Una cadena une dos brotes a oscuras.'))).toEqual([]);
  });

  it('only sounds the babble syllables of the manifest', () => {
    for (const speaker of SPEAKERS) {
      for (const key of VOICES[speaker]?.keys ?? []) expect(assetEntry(key).kind).toBe('voice');
    }
  });

  it('gives every voiced line of the game some babble', () => {
    for (const [id, text] of Object.entries(lines)) {
      const spoken = { id, text, speaker: id.split('.')[2] as Speaker };
      if (VOICES[spoken.speaker] !== null && /\p{L}/u.test(text)) {
        expect(babble(spoken).length).toBeGreaterThan(0);
      }
    }
  });
});
