import { describe, expect, it } from 'vitest';
import { levelSchema } from './schema';
import { starsCeiling } from './starsCeiling';

/** A one-vine level as a file writes it, to which each test adds what earns stars. */
const plain = {
  id: '1.1',
  sprouts: [
    { label: 'A', x: 200, y: 135 },
    { label: 'B', x: 280, y: 135 },
  ],
  vines: [['A', 'B']],
  goal: { visible: true, value: 1 },
  victory: { type: 'matchingSize', value: 1 },
  solution: [{ type: 'join', u: 'A', v: 'B' }],
};

/** The ceiling of a level file, defaults filled in as the loader does. */
const ceilingOf = (file: object): number => starsCeiling(levelSchema.parse(file));

/** A formal bet before playing, as 1.6 writes it. */
const bet = { step: 'bet', prompt: 'ch1.1.sauce.00', range: 4 };

describe('the most stars a level can give', () => {
  it('one for completing and one without hints, even in a level that offers none', () => {
    expect(ceilingOf(plain)).toBe(2);
  });

  it('one more where water is counted', () => {
    expect(ceilingOf({ ...plain, water: 4 })).toBe(3);
  });

  it('one more for a formal bet, none for an informal one', () => {
    expect(ceilingOf({ ...plain, flow: [bet, { step: 'play' }] })).toBe(3);
    expect(ceilingOf({ ...plain, flow: [{ ...bet, informal: true }, { step: 'play' }] })).toBe(2);
  });

  it('counts water and a formal bet together, as the stars of a won level do', () => {
    expect(ceilingOf({ ...plain, water: 4, flow: [bet, { step: 'play' }] })).toBe(4);
  });
});
