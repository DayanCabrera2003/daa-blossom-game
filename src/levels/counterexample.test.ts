import { size } from '@core/matching/queries';
import { applyAction } from '@core/rules/applyAction';
import { describe, expect, it } from 'vitest';
import { buildCounterexample } from './counterexample';
import { counterexampleSchema } from './notebook';

/** Four sprouts in a row with the middle pair lit: a chain from end to end lights one more. */
const rowOfFour = {
  line: 'ch1.5.sauce.01',
  sprouts: ['a', 'b', 'c', 'd'].map((label, i) => ({ label, x: 100 + 60 * i, y: 120 })),
  vines: [
    ['a', 'b'],
    ['b', 'c'],
    ['c', 'd'],
  ],
  lanterns: [['b', 'c']],
};

const built = (json: unknown) => buildCounterexample(counterexampleSchema.parse(json));

describe('building a counterexample', () => {
  it('a garden to play with is a core garden with its lanterns and only its actions', () => {
    const result = built({ mode: 'play', ...rowOfFour, actions: ['chain'] });
    if (!result.ok) throw new Error('the row should build');
    const { start, labels, line, found, mode } = result.value;
    expect({ mode, line, found }).toEqual({ mode: 'play', line: 'ch1.5.sauce.01', found: null });
    expect(start.graph.n).toBe(4);
    expect(size(start.matching)).toBe(1);
    expect([...start.allowed]).toEqual(['chain']);
    expect(labels.names).toEqual(['a', 'b', 'c', 'd']);
  });

  it('plays by the same rules as a level: the chain is accepted, a locked move is not', () => {
    const result = built({ mode: 'play', ...rowOfFour, actions: ['chain'] });
    if (!result.ok) throw new Error('the row should build');
    const chained = applyAction(result.value.start, { type: 'chain', path: [0, 1, 2, 3] });
    expect(chained.ok && size(chained.state.matching)).toBe(2);
    const joined = applyAction(result.value.start, { type: 'join', u: 0, v: 1 });
    expect(joined).toEqual({ ok: false, reason: { code: 'actionLocked', action: 'join' } });
  });

  it('a garden to draw a reflection on takes no garden moves, and keeps the line of its chain', () => {
    const result = built({ mode: 'mirrorDraw', ...rowOfFour, found: 'ch2.4.sauce.05' });
    if (!result.ok) throw new Error('the row should build');
    expect(result.value.found).toBe('ch2.4.sauce.05');
    expect(result.value.start.allowed.size).toBe(0);
    expect(size(result.value.start.matching)).toBe(1);
  });

  it('a counterexample that is no garden is reported, as a level would be', () => {
    const twoLanternsOnB = {
      ...rowOfFour,
      lanterns: [
        ['a', 'b'],
        ['b', 'c'],
      ],
    };
    expect(built({ mode: 'play', ...twoLanternsOnB, actions: ['chain'] })).toMatchObject({
      ok: false,
      error: { code: 'badLanterns' },
    });
    const unknown = { ...rowOfFour, vines: [['a', 'z']] };
    expect(built({ mode: 'play', ...unknown, actions: ['chain'] })).toMatchObject({
      ok: false,
      error: { code: 'badLabel' },
    });
  });
});
