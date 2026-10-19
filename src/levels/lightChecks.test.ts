import { describe, expect, it } from 'vitest';
import { buildLevel, type Level } from './build';
import { checkLight } from './lightChecks';
import { levelSchema } from './schema';

/** Level 4.5 as a file: the festival garden R–a=b, triangle b–c=d–b, c–e, searched from R. */
const festival = {
  id: '4.5',
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
  roots: ['R'],
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

describe('the checks of a level where the light searches by itself', () => {
  it('a level whose search is the player’s has nothing to check', () => {
    expect(checkLight(level({}))).toEqual([]);
  });

  it('no move that changes the lanterns without the light may be open', () => {
    // Splitting and passing the lantern are open in 4.5, and any chain or join goes by default.
    expect(checkLight(level({ light: true }))).toEqual([
      { code: 'lightBypassed', action: 'join' },
      { code: 'lightBypassed', action: 'split' },
      { code: 'lightBypassed', action: 'passLantern' },
      { code: 'lightBypassed', action: 'chain' },
    ]);
  });

  it('chains and joins may stay open when only the chain the light saw lights a lantern', () => {
    const closed = { light: true, forbid: ['split', 'passLantern'] };
    expect(checkLight(level({ ...closed, chains: { rule: 'seen' } }))).toEqual([]);
    expect(
      checkLight(level({ ...closed, forbid: ['split', 'passLantern', 'join', 'chain'] })),
    ).toEqual([]);
  });
});
