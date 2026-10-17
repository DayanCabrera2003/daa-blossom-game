import { describe, expect, it } from 'vitest';
import lines from '../../content/es/lines.json';
import { SPEAKERS, speakerOf, spokenLine } from './speaker';

describe('who says a line', () => {
  it('reads the speaker from the line id', () => {
    expect(speakerOf('ch4.11.sauce.03')).toBe('sauce');
    expect(speakerOf('ch6.3.bruto.02')).toBe('bruto');
    expect(speakerOf('ch7.2.oaks.01')).toBe('oaks');
    expect(speakerOf('ch1.8.gardener.02')).toBe('gardener');
    expect(speakerOf('ch1.5.notebook.01')).toBe('notebook');
  });

  it('gives the generic hints, the words that let the player go and the reveals to the mentor', () => {
    expect(speakerOf('hint.generic.2')).toBe('sauce');
    expect(speakerOf('mirror.spared')).toBe('sauce');
    expect(speakerOf('flower.spared')).toBe('sauce');
    expect(speakerOf('bet.revealRight')).toBe('sauce');
    expect(speakerOf('raceBet.revealWrong')).toBe('sauce');
  });

  it('gives a line of a speaker it does not know to the mentor too', () => {
    expect(speakerOf('ch4.1.owl.01')).toBe('sauce');
  });

  it('every line of the game is said by one of the five speakers', () => {
    for (const id of Object.keys(lines)) {
      expect(SPEAKERS).toContain(speakerOf(id));
      // Every line names its speaker: none falls back to the mentor by accident.
      expect(id.split('.')[2]).toBe(speakerOf(id));
    }
  });

  it('a spoken line keeps its id, its text and its speaker together', () => {
    expect(spokenLine('ch6.3.bruto.02', (id) => `«${id}»`)).toEqual({
      id: 'ch6.3.bruto.02',
      text: '«ch6.3.bruto.02»',
      speaker: 'bruto',
    });
  });
});
