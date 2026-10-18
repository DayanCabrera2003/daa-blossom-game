import { describe, expect, it } from 'vitest';
import strings from '@content/es/strings.json';
import { createTranslator } from '@services/i18n';
import { answerAloud, lineAloud, questionAloud } from './aloud';

const t = createTranslator(strings);

describe('what a screen reader hears of the game (plan 09, phase 6)', () => {
  it('a line of dialogue whole, after the name of who says it', () => {
    const text = 'Cada brote quiere un farol, pero un farol solo alumbra a dos.';
    const said = lineAloud(t, { id: 'ch0.1.sauce.01', speaker: 'sauce', text });
    expect(said.startsWith(t('speaker.sauce'))).toBe(true);
    expect(said.endsWith(text)).toBe(true);
  });

  it('a question with its options, numbered as the digits that pick them', () => {
    const said = questionAloud(t, '¿Cuántos faroles caben?', ['Dos', 'Tres']);
    expect(said).toContain('¿Cuántos faroles caben?');
    expect(said.indexOf('1')).toBeLessThan(said.indexOf('Dos'));
    expect(said.indexOf('2')).toBeLessThan(said.indexOf('Tres'));
  });

  it('whether an answer was the one, but never the outcome of a bet before the garden shows it', () => {
    expect(answerAloud(t, 'ask', true)).toBe(t('a11y.answerRight'));
    expect(answerAloud(t, 'count', false)).toBe(t('a11y.answerWrong'));
    expect(answerAloud(t, 'notebook', false)).toBe(t('a11y.answerWrong'));
    expect(answerAloud(t, 'bet', true)).toBeNull();
    expect(answerAloud(t, 'raceBet', false)).toBeNull();
    expect(answerAloud(t, undefined, true)).toBeNull();
    expect(t('a11y.answerRight')).not.toBe(t('a11y.answerWrong'));
  });
});
