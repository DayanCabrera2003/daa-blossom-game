import strings from '@content/es/strings.json';
import { betReveal } from '@game/picture/betReveal';
import { createTranslator } from '@services/i18n';
import { describe, expect, it } from 'vitest';

/**
 * The texts that count lanterns read right when the count is one: the goal shown on the board and
 * what the mentor says when a bet is revealed. «1 faroles» was once the first sentence of the game.
 */

const t = createTranslator(strings);

describe('counts of one lantern', () => {
  it('the goal on the board needs no plural', () => {
    expect(t('hud.goal', { count: 1 })).toBe('Faroles que caben aquí: 1');
  });

  it('the reveal of a bet says one lantern in the singular, and many in the plural', () => {
    for (const bet of [1, 2]) {
      const { key, params } = betReveal(bet, 1);
      expect(t(key, params)).not.toMatch(/\b1 faroles\b/);
      expect(t(key, params)).toMatch(/\b1 farol\b/);
    }
    for (const bet of [2, 3]) {
      const { key, params } = betReveal(bet, 3);
      expect(t(key, params)).toMatch(/\b3 faroles\b/);
    }
  });
});
