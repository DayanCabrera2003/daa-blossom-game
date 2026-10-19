import { describe, expect, it } from 'vitest';
import { buildLevel, type Level } from './build';
import { checkChainRule } from './chainChecks';
import { levelSchema } from './schema';

/** Level 4.10 as a file: the festival garden R–a=b, triangle b–c=d–b, c–e. */
const festival = {
  id: '4.10',
  sprouts: ['R', 'a', 'b', 'c', 'd', 'e'].map((label, i) => ({ label, x: 40 + 70 * i, y: 135 })),
  vines: [
    ['R', 'a'],
    ['a', 'b'],
    ['b', 'c'],
    ['c', 'd'],
    ['d', 'b'],
    ['c', 'e'],
  ],
  lanterns: [
    ['a', 'b'],
    ['c', 'd'],
  ],
  goal: { visible: true, value: 3 },
  victory: { type: 'matchingSize', value: 3 },
  solution: [{ type: 'chain', path: ['R', 'a', 'b', 'd', 'c', 'e'] }],
};

/** The level a file builds. */
const level = (overrides: object): Level => {
  const built = buildLevel(levelSchema.parse({ ...festival, ...overrides }));
  if (!built.ok) throw new Error(`level does not build: ${JSON.stringify(built.error)}`);
  return built.value;
};

describe('the checks of a level’s chain rule', () => {
  it('any chain has nothing to check', () => {
    expect(checkChainRule(level({}))).toEqual([]);
  });

  it('where only the chain seen moves lanterns, nothing else that moves them may be open', () => {
    // 4.10 unlocks split, passing the lantern and rotating the stem: each would move lanterns
    // without the light, and open chains found without folding.
    expect(checkChainRule(level({ chains: { rule: 'seen' } }))).toEqual([
      { code: 'seenRuleOpen', action: 'split' },
      { code: 'seenRuleOpen', action: 'passLantern' },
      { code: 'seenRuleOpen', action: 'rotateStem' },
    ]);
    const closed = level({
      chains: { rule: 'seen' },
      forbid: ['split', 'passLantern', 'rotateStem'],
    });
    expect(checkChainRule(closed)).toEqual([]);
  });

  it('the closed flower is a flower of the starting garden, written base first', () => {
    expect(
      checkChainRule(level({ chains: { rule: 'fromBase', flower: ['b', 'c', 'd'] } })),
    ).toEqual([]);
    expect(
      checkChainRule(level({ chains: { rule: 'fromBase', flower: ['c', 'd', 'b'] } })),
    ).toEqual([{ code: 'badChainFlower', petals: ['c', 'd', 'b'] }]);
    expect(
      checkChainRule(level({ chains: { rule: 'fromBase', flower: ['a', 'b', 'c'] } })),
    ).toEqual([{ code: 'badChainFlower', petals: ['a', 'b', 'c'] }]);
  });
});
