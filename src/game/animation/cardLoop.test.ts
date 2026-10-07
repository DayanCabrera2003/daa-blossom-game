import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { CARD_REST_STEPS, CARD_STEP_MS, cardFrameAt } from './cardLoop';

describe('the loop of a mechanic card demo', () => {
  it('steps through the frames, rests on the last one, then starts again', () => {
    const at = (steps: number) => cardFrameAt(3, steps * CARD_STEP_MS);
    expect([0, 1, 2].map(at)).toEqual([0, 1, 2]);
    expect(at(2 + CARD_REST_STEPS)).toBe(2);
    expect(at(3 + CARD_REST_STEPS)).toBe(0);
    expect(cardFrameAt(3, CARD_STEP_MS - 1)).toBe(0);
  });

  it('always shows a frame of the demo, whatever the time', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 12 }), fc.double({ noNaN: true }), (frames, t) => {
        const frame = cardFrameAt(frames, t);
        expect(Number.isInteger(frame)).toBe(true);
        expect(frame).toBeGreaterThanOrEqual(0);
        expect(frame).toBeLessThan(frames);
      }),
    );
  });
});
