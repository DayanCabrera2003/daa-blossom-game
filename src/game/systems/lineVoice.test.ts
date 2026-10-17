import { describe, expect, it } from 'vitest';
import { babble } from './babble';
import { voiceLine } from './lineVoice';
import { PACES, revealTimes } from './typewriter';

describe('how a line is spoken', () => {
  it('types the line at its speaker’s pace and babbles it in his voice', () => {
    const line = { id: 'ch6.3.bruto.02', text: '¡Todas, una a una!', speaker: 'bruto' } as const;
    const voiced = voiceLine(line);
    expect(voiced.reveal).toEqual(revealTimes(line.text, PACES.bruto));
    expect(voiced.syllables).toEqual(babble(line));
  });

  it('tells how much of the line has appeared after some time', () => {
    const voiced = voiceLine({ id: 'ch1.1.sauce.01', text: 'Hola.', speaker: 'sauce' });
    expect(voiced.visibleAt(0)).toBe(1);
    expect(voiced.visibleAt(Infinity)).toBe(5);
  });

  it('types the gardener’s answers in silence', () => {
    const voiced = voiceLine({ id: 'ch1.8.gardener.02', text: 'Ya veo.', speaker: 'gardener' });
    expect(voiced.reveal).toHaveLength(7);
    expect(voiced.syllables).toEqual([]);
  });
});
