import { describe, expect, it } from 'vitest';
import { createTranslator } from './i18n';

const t = createTranslator({
  'hud.lanterns': 'Faroles: {count}',
  'reason.notAdjacent': '{u} y {v} no comparten enredadera.',
  'hud.done': 'Terminé',
});

describe('translating interface text', () => {
  it('returns the text of a key', () => {
    expect(t('hud.done')).toBe('Terminé');
  });

  it('fills in named parameters, as many times as they appear', () => {
    expect(t('hud.lanterns', { count: 3 })).toBe('Faroles: 3');
    expect(t('reason.notAdjacent', { u: 'Ana', v: 'Beto' })).toBe(
      'Ana y Beto no comparten enredadera.',
    );
  });

  it('leaves a parameter it was not given visible, so the gap shows in a playtest', () => {
    expect(t('hud.lanterns')).toBe('Faroles: {count}');
  });

  it('never fails on a missing key: it shows the key itself', () => {
    expect(t('hud.nowhere')).toBe('⟨hud.nowhere⟩');
  });
});
