import { describe, expect, it } from 'vitest';
import type { SproutPicture } from './garden';
import { BLINK_MS, BLINK_PERIOD_MS, sproutLook } from './sproutLook';

/** A sprout as the garden's picture gives it, dark and plain unless told otherwise. */
const sprout = (overrides: Partial<SproutPicture> = {}): SproutPicture => ({
  vertex: 0,
  x: 100,
  y: 100,
  label: 'a',
  kind: null,
  lit: false,
  mark: null,
  selected: false,
  highlighted: false,
  inChain: false,
  scarecrow: false,
  stone: false,
  ...overrides,
});

/** The instants of one period at which a sprout's eyes are closed by a blink. */
const blinkingInstants = (picture: SproutPicture): number[] =>
  Array.from({ length: BLINK_PERIOD_MS }, (_, t) => t).filter(
    (t) => sproutLook(picture, t).blinking,
  );

describe('the look of a sprout', () => {
  it('sleeps in the dark and smiles with a lantern', () => {
    expect(sproutLook(sprout({ lit: false }), 0).face).toBe('asleep');
    expect(sproutLook(sprout({ lit: true }), 0).face).toBe('happy');
  });

  it('is a sprout, a bee or a flower as its level says', () => {
    expect(sproutLook(sprout(), 0).species).toBe('sprout');
    expect(sproutLook(sprout({ kind: 'bee' }), 0).species).toBe('bee');
    expect(sproutLook(sprout({ kind: 'flower' }), 0).species).toBe('flower');
  });

  it('blinks now and then, once a period and briefly, only with its eyes open', () => {
    const awake = blinkingInstants(sprout({ lit: true }));
    expect(awake).toHaveLength(BLINK_MS);
    // One closed stretch: the instants follow each other.
    expect(awake.every((t, i) => i === 0 || t === (awake[i - 1] ?? 0) + 1)).toBe(true);
    expect(blinkingInstants(sprout({ lit: false }))).toEqual([]);
  });

  it('blinks again a period later, the same way', () => {
    const lit = sprout({ lit: true, vertex: 3 });
    for (const t of [0, 250, 1234, 2999])
      expect(sproutLook(lit, t + BLINK_PERIOD_MS).blinking).toBe(sproutLook(lit, t).blinking);
  });

  it('does not blink together with its neighbours', () => {
    const first = blinkingInstants(sprout({ lit: true, vertex: 0 }));
    const second = blinkingInstants(sprout({ lit: true, vertex: 1 }));
    expect(first[0]).not.toBe(second[0]);
  });
});
