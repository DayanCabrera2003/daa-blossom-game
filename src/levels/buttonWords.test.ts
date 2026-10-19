import { describe, expect, it } from 'vitest';
import type { LevelData } from './schema';
import { buttonWordProblems } from './buttonWords';

/** The two words of the button, as the interface texts write them. */
const WORDS = { done: 'Terminé', present: 'Presentar' };

/** A level that says `ids` in a line step, with `victory`. */
const levelSaying = (victory: LevelData['victory'], ids: string[]): LevelData =>
  ({
    id: '9.1',
    victory,
    flow: [
      { step: 'say', lines: ids },
      { step: 'play', reactions: [] },
    ],
    hints: [],
  }) as unknown as LevelData;

describe('the lines name the button the level shows', () => {
  const texts: Record<string, string> = {
    'ch9.1.sauce.00': 'Luego pulsa «Terminé».',
    'ch9.1.sauce.01': 'Luego pulsa «Presentar».',
    'ch9.1.sauce.02': 'Sin nombrar el botón.',
  };
  const text = (id: string): string | undefined => texts[id];

  it('a certificate level whose line says «Terminé» is told, with the word its button shows', () => {
    const level = levelSaying({ type: 'coverCertificate' }, Object.keys(texts));
    expect(buttonWordProblems(level, text, WORDS)).toEqual([
      { code: 'buttonWord', line: 'ch9.1.sauce.00', shows: 'Presentar' },
    ]);
  });

  it('a level of claims whose line says «Presentar» is told too', () => {
    const level = levelSaying({ type: 'maximum' }, Object.keys(texts));
    expect(buttonWordProblems(level, text, WORDS)).toEqual([
      { code: 'buttonWord', line: 'ch9.1.sauce.01', shows: 'Terminé' },
    ]);
  });

  it('lines that name no button, or have no text, are fine', () => {
    const level = levelSaying(undefined, ['ch9.1.sauce.02', 'ch9.1.sauce.09']);
    expect(buttonWordProblems(level, text, WORDS)).toEqual([]);
  });
});
