import { describe, expect, it } from 'vitest';
import strings from '@content/es/strings.json';
import { createTranslator } from '@services/i18n';
import type { MiniSprout } from './miniGarden';
import { helpKeys, sproutWords, vineWords } from './diagramWords';

const t = createTranslator(strings);

const sprout = (fields: Partial<MiniSprout>): MiniSprout => ({
  vertex: 0,
  x: 0,
  y: 0,
  label: 'A',
  kind: null,
  lit: false,
  mark: null,
  touched: null,
  base: false,
  scarecrow: false,
  stone: false,
  ...fields,
});

describe('helpKeys', () => {
  it('tells how to join, pass and put out the lanterns a garden allows', () => {
    expect(helpKeys({ kind: 'play', moves: ['join', 'split'] })).toEqual([
      'diagram.help.join',
      'diagram.help.split',
    ]);
    expect(helpKeys({ kind: 'play', moves: ['passLantern'] })).toEqual([
      'diagram.help.join',
      'diagram.help.pass',
    ]);
  });

  it('tells how to draw a chain, and how to walk a replayed day', () => {
    expect(helpKeys({ kind: 'play', moves: ['chain', 'split'] })).toEqual([
      'diagram.help.chain',
      'diagram.help.split',
    ]);
    expect(helpKeys({ kind: 'replay' })).toEqual(['diagram.help.replay']);
  });

  it('takes the help the block names instead, when it names one', () => {
    expect(helpKeys({ kind: 'replay', help: 'diagram.help.chain' })).toEqual([
      'diagram.help.chain',
    ]);
  });
});

describe('sproutWords and vineWords', () => {
  it('say a sprout by its name, its lantern and its mark, for a screen reader', () => {
    expect(sproutWords(sprout({}), t)).toBe(t('diagram.sprout.dark', { name: 'A' }));
    expect(sproutWords(sprout({ lit: true, mark: 'sun' }), t)).toBe(
      `${t('diagram.sprout.lit', { name: 'A' })}, ${t('diagram.mark.sun')}`,
    );
    expect(sproutWords(sprout({ mark: 'moon', touched: 2 }), t)).toBe(
      `${t('diagram.sprout.dark', { name: 'A' })}, ${t('diagram.mark.moon')}, ${t('diagram.sprout.touched')}`,
    );
  });

  it('say a vine by its two sprouts, lit or not', () => {
    expect(vineWords('A', 'B', true, t)).toBe(t('diagram.vine.lit', { u: 'A', v: 'B' }));
    expect(vineWords('A', 'B', false, t)).toBe(t('diagram.vine.dark', { u: 'A', v: 'B' }));
  });
});
