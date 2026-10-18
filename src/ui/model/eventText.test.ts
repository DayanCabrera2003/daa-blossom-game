import { describe, expect, it } from 'vitest';
import strings from '@content/es/strings.json';
import type { TraceEvent } from '@core/trace/events';
import { createTranslator } from '@services/i18n';
import { eventText, stepText } from './eventText';

const names = ['R', 'a', 'b', 'c', 'd'];
const t = createTranslator(strings);

/** One event of every kind, a few twice to see both ways they are told. */
const EVERY_EVENT: readonly TraceEvent[] = [
  { type: 'searchStart', roots: [0, 4] },
  { type: 'searchStart', roots: [] },
  { type: 'labelOuter', vertex: 0, parent: null, root: 0 },
  { type: 'labelOuter', vertex: 2, parent: 1, root: 0 },
  { type: 'labelInner', vertex: 1, parent: 0, root: 0 },
  { type: 'scanEdge', from: 0, to: 1 },
  { type: 'oddCycleFound', vine: [2, 3] },
  {
    type: 'contract',
    blossom: 0,
    base: 1,
    cycle: [
      { kind: 'sprout', vertex: 1 },
      { kind: 'sprout', vertex: 2 },
      { kind: 'blossom', id: 7 },
    ],
  },
  { type: 'expand', blossom: 0 },
  { type: 'augment', path: [0, 1, 2, 4] },
  { type: 'searchFailed' },
  { type: 'done', size: 2 },
  { type: 'light', u: 0, v: 1 },
  { type: 'putOut', u: 0, v: 1 },
  { type: 'inspect', vertex: 3, vines: [2, 4] },
  { type: 'chainFound', path: [0, 1, 2, 4] },
  { type: 'searchCleared' },
  { type: 'scarecrow', vertex: 2, placed: true },
  { type: 'scarecrow', vertex: 2, placed: false },
  { type: 'stone', vertex: 3, lifted: true },
  { type: 'stone', vertex: 3, lifted: false },
  { type: 'declareDone' },
];

describe('eventText', () => {
  it('tells every event with a text of its own, every gap filled', () => {
    const texts = EVERY_EVENT.map((event) => {
      const { key, params } = eventText(event, names);
      return t(key, params);
    });
    for (const text of texts) {
      expect(text).not.toMatch(/[‹{]/);
    }
    expect(new Set(texts).size).toBe(texts.length);
  });

  it('names the sprouts, the petals and the chain', () => {
    expect(eventText({ type: 'labelInner', vertex: 1, parent: 0, root: 0 }, names)).toEqual({
      key: 'diagram.event.labelInner',
      params: { vertex: 'a', parent: 'R' },
    });
    expect(eventText(EVERY_EVENT[7] as TraceEvent, names)).toEqual({
      key: 'diagram.event.contract',
      params: { petals: 3, base: 'a' },
    });
    expect(eventText({ type: 'augment', path: [0, 1, 2, 4] }, names).params).toEqual({
      path: 'R–a–b–d',
    });
    expect(eventText({ type: 'light', u: 0, v: 9 }, names).params).toEqual({ u: 'R', v: '9' });
  });
});

describe('stepText', () => {
  it('tells dawn when nothing has happened, and the events of a step one after another', () => {
    expect(stepText([], names, t)).toBe(t('diagram.dawn'));
    const both = stepText(
      [
        { type: 'labelInner', vertex: 1, parent: 0, root: 0 },
        { type: 'labelOuter', vertex: 2, parent: 1, root: 0 },
      ],
      names,
      t,
    );
    expect(both).toBe(
      `${t('diagram.event.labelInner', { vertex: 'a', parent: 'R' })} ${t('diagram.event.labelOuter', { vertex: 'b', parent: 'a' })}`,
    );
  });
});
