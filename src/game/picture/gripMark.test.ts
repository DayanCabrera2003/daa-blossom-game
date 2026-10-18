import { describe, expect, it } from 'vitest';
import { GRIP_MARK, gripMark, gripMarkCentre } from './gripMark';

describe('the mark that tells a panel can be moved', () => {
  it('two rows of three dots, a pixel each, centred where it is put', () => {
    const dots = gripMark({ x: 100, y: 10 });
    expect(dots).toHaveLength(6);
    for (const dot of dots) expect(dot).toMatchObject({ width: 1, height: 1 });
    const xs = dots.map((dot) => dot.x);
    const ys = dots.map((dot) => dot.y);
    expect(Math.min(...xs) + Math.max(...xs)).toBe(2 * 100);
    expect(new Set(ys).size).toBe(2);
    expect(Math.max(...xs) - Math.min(...xs)).toBe(2 * GRIP_MARK.spacing);
  });

  it('sits on the top border of a panel, across its middle', () => {
    expect(gripMarkCentre({ x: 40, y: 28, width: 400, height: 60 })).toEqual({
      x: 240,
      y: 28 + GRIP_MARK.inset,
    });
  });
});
