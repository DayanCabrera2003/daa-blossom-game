import { describe, expect, it } from 'vitest';
import type { Point } from '../input/target';
import { FOLD_FRAMES, foldFrameAt, foldFrames, unfoldFrames } from './foldFrames';

const open: Point[] = [
  { x: 100, y: 60 },
  { x: 140, y: 100 },
  { x: 60, y: 100 },
];
const centre: Point = { x: 100, y: 86 };
const distance = (a: Point, b: Point): number => Math.hypot(a.x - b.x, a.y - b.y);

describe('the frames of folding a flower', () => {
  it('has eight frames, from the open sprouts to the middle', () => {
    const frames = foldFrames(open, centre);
    expect(frames).toHaveLength(FOLD_FRAMES);
    expect(FOLD_FRAMES).toBe(8);
    expect(frames[0]?.positions).toEqual(open);
    expect(frames[0]?.closed).toBe(0);
    for (const p of frames[7]?.positions ?? []) expect(p).toEqual(centre);
    expect(frames[7]?.closed).toBe(1);
  });

  it('brings every sprout closer to the middle at each frame, closing the petals', () => {
    const frames = foldFrames(open, centre);
    for (let i = 1; i < frames.length; i++) {
      const before = frames[i - 1];
      const now = frames[i];
      expect(now?.closed).toBeGreaterThan(before?.closed ?? 1);
      open.forEach((_, v) => {
        const was = distance(before?.positions[v] ?? centre, centre);
        expect(distance(now?.positions[v] ?? centre, centre)).toBeLessThan(was);
      });
    }
  });

  it('keeps each sprout on its way straight to the middle', () => {
    for (const frame of foldFrames(open, centre)) {
      frame.positions.forEach((p, v) => {
        const from = open[v] ?? centre;
        // The cross product of (from → centre) and (from → p) is zero: p is on that line.
        const cross = (centre.x - from.x) * (p.y - from.y) - (centre.y - from.y) * (p.x - from.x);
        expect(cross).toBeCloseTo(0);
      });
    }
  });

  it('unfolds the same way backwards', () => {
    expect(unfoldFrames(open, centre)).toEqual([...foldFrames(open, centre)].reverse());
    expect(unfoldFrames(open, centre)[7]?.positions).toEqual(open);
  });

  it('shows each frame for an eighth of the step, the last one to the very end', () => {
    const frames = foldFrames(open, centre);
    expect(foldFrameAt(frames, 0)).toBe(frames[0]);
    expect(foldFrameAt(frames, 0.124)).toBe(frames[0]);
    expect(foldFrameAt(frames, 0.125)).toBe(frames[1]);
    expect(foldFrameAt(frames, 0.99)).toBe(frames[7]);
    expect(foldFrameAt(frames, 1)).toBe(frames[7]);
    expect(foldFrameAt(frames, -1)).toBe(frames[0]);
  });
});
