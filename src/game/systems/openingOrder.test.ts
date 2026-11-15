import { describe, expect, it } from 'vitest';
import { invariant } from '@core/shared/invariant';
import { catalog } from '@levels/catalog';
import { openController } from './levelController';
import { openingOrder } from './openingOrder';

const say = { kind: 'say', lines: ['ch0.1.sauce.00'] } as const;
const play = { kind: 'play' } as const;

describe('the order a level opens in', () => {
  it('a level that opens with a line says it before its cards', () => {
    expect(openingOrder([say, play])).toEqual([say, 'cards', play]);
  });

  it('a level that opens with anything else shows its cards first', () => {
    expect(openingOrder([play, say])).toEqual(['cards', play, say]);
  });

  it('a level that opens with nothing still shows its cards', () => {
    expect(openingOrder([])).toEqual(['cards']);
  });

  it('in 0.1 the first thing the player sees is the opening line, then the cards', () => {
    const level = catalog().find((candidate) => candidate.data.id === '0.1');
    invariant(level !== undefined, 'level 0.1 exists');
    const [first, second] = openingOrder(openController(level, 0).effects);
    expect(first).toEqual({ kind: 'say', lines: ['ch0.1.sauce.00'] });
    expect(second).toBe('cards');
  });
});
