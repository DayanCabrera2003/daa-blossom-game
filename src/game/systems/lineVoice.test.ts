import { describe, expect, it } from 'vitest';
import { babble } from './babble';
import { voiceLine } from './lineVoice';
import { PACES, revealTimes } from './typewriter';

describe('how a line is spoken', () => {
  it('types the line at its speaker’s pace and babbles it in his voice', () => {
    const line = { id: 'ch6.3.bruto.02', text: '¡Todas, una a una!', speaker: 'bruto' } as const;
    expect(voiceLine(line)).toEqual({
      reveal: revealTimes(line.text, PACES.bruto),
      syllables: babble(line),
    });
  });

  it('types the gardener’s answers in silence', () => {
    const voiced = voiceLine({ id: 'ch1.8.gardener.02', text: 'Ya veo.', speaker: 'gardener' });
    expect(voiced.reveal).toHaveLength(7);
    expect(voiced.syllables).toEqual([]);
  });
});
