import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { FIREFLY_ALPHA, FIREFLY_BOX, FIREFLY_COUNT, firefliesAt } from './fireflies';
import { lanternFlicker } from './lanternFlicker';

const BOX = { x: 100, y: 224, ...FIREFLY_BOX };

describe('the fireflies over the hub', () => {
  it('drift inside their box, the same at the same instant', () => {
    fc.assert(
      fc.property(fc.integer({ min: -100_000, max: 10_000_000 }), (now) => {
        const flies = firefliesAt(BOX, now);
        expect(firefliesAt(BOX, now)).toEqual(flies);
        expect(flies).toHaveLength(FIREFLY_COUNT);
        for (const { x, y } of flies) {
          expect(Number.isInteger(x) && Number.isInteger(y)).toBe(true);
          expect(x).toBeGreaterThanOrEqual(BOX.x);
          expect(y).toBeGreaterThanOrEqual(BOX.y);
          expect(x).toBeLessThan(BOX.x + BOX.width);
          expect(y).toBeLessThan(BOX.y + BOX.height);
        }
      }),
    );
  });

  it('glow in the three frames of a lantern, each out of step with the others', () => {
    for (const now of [0, 160, 320, 5000]) {
      firefliesAt(BOX, now).forEach(({ alpha }, k) => {
        expect(alpha).toBe(FIREFLY_ALPHA[lanternFlicker(now, k).frame]);
      });
    }
    expect(new Set(firefliesAt(BOX, 0).map(({ alpha }) => alpha)).size).toBe(3);
  });

  it('move about rather than stand still', () => {
    const a = firefliesAt(BOX, 0);
    const b = firefliesAt(BOX, 2000);
    expect(a.some((fly, k) => fly.x !== b[k]?.x || fly.y !== b[k]?.y)).toBe(true);
  });
});
