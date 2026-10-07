import { UNLOCKED_AT } from '@core/rules/permissions';
import { z } from 'zod';
import { describe, expect, it } from 'vitest';
import { FLOW_INPUT_TYPES, flowInputOptions } from './flowInput';

const flowInput = z.discriminatedUnion('type', flowInputOptions);
const accepts = (input: unknown) => flowInput.safeParse(input).success;

describe('the inputs a walkthrough gives the script', () => {
  it('reads answers, bets, the sun, touches and the mirror challenge', () => {
    for (const input of [
      { type: 'answer', option: 1 },
      { type: 'bet', value: 4 },
      { type: 'seekSun', fraction: 0.5 },
      { type: 'tapGarden' },
      { type: 'tapSprout', vertex: 'a' },
      { type: 'drawMirror', lanterns: [['a', 'b']] },
      { type: 'checkMirror' },
    ]) {
      expect(accepts(input)).toBe(true);
    }
  });

  it('keeps the sun inside the day and the numbers whole', () => {
    expect(accepts({ type: 'seekSun', fraction: 1.5 })).toBe(false);
    expect(accepts({ type: 'answer', option: -1 })).toBe(false);
    expect(accepts({ type: 'bet', value: 1.5 })).toBe(false);
    expect(accepts({ type: 'tapGarden', vertex: 'a' })).toBe(false);
  });

  it('no input shares its type with a player action, so the two never mix up', () => {
    const actions = new Set(Object.keys(UNLOCKED_AT));
    expect(FLOW_INPUT_TYPES.filter((type) => actions.has(type))).toEqual([]);
    expect(FLOW_INPUT_TYPES).toHaveLength(flowInputOptions.length);
  });
});
