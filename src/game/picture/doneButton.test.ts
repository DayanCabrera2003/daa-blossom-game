import { catalog } from '@levels/catalog';
import { describe, expect, it } from 'vitest';
import { doneButton } from './doneButton';

describe('the words on the button that ends a level', () => {
  it('says «Presentar» exactly in the levels of certificates: 3.7–3.10 and chapter 7', () => {
    const presenting = catalog()
      .filter((level) => doneButton(level.data.victory) === 'hud.present')
      .map((level) => level.data.id);
    expect(presenting).toEqual([
      '3.7',
      '3.8',
      '3.9',
      '3.10',
      '7.1',
      '7.2',
      '7.3',
      '7.4',
      '7.5',
      '7.6',
    ]);
  });

  it('says "Terminé" everywhere else, and where no victory is judged', () => {
    expect(doneButton({ type: 'maximum' })).toBe('hud.done');
    expect(doneButton({ type: 'searchExhausted' })).toBe('hud.done');
    expect(doneButton(undefined)).toBe('hud.done');
  });
});
