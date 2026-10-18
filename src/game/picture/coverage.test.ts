import { describe, expect, it } from 'vitest';
import { clipSegment } from './boxDistance';
import { coverage, totalCoverage, type Shape } from './coverage';

const panel = { x: 10, y: 10, width: 20, height: 10 };

describe('how much of a piece of the garden a panel covers', () => {
  it('a box: the area the two share', () => {
    const box: Shape = { kind: 'box', box: { x: 20, y: 15, width: 20, height: 20 } };
    expect(coverage(panel, box)).toBe(10 * 5);
  });

  it('a box apart, or only touching an edge, is not covered', () => {
    expect(coverage(panel, { kind: 'box', box: { x: 30, y: 10, width: 5, height: 5 } })).toBe(0);
    expect(coverage(panel, { kind: 'box', box: { x: 50, y: 50, width: 5, height: 5 } })).toBe(0);
  });

  it('a line: the length inside the panel times its width', () => {
    const line: Shape = { kind: 'line', a: { x: 0, y: 15 }, b: { x: 100, y: 15 }, width: 2 };
    // The panel grown by half the stroke on each side: 22 pixels of the line, 2 wide.
    expect(coverage(panel, line)).toBeCloseTo(22 * 2);
  });

  it('a line that passes the panel by is not covered', () => {
    const line: Shape = { kind: 'line', a: { x: 0, y: 40 }, b: { x: 100, y: 40 }, width: 2 };
    expect(coverage(panel, line)).toBe(0);
  });

  it('a line with both ends on one point covers nothing', () => {
    const dot: Shape = { kind: 'line', a: { x: 15, y: 15 }, b: { x: 15, y: 15 }, width: 2 };
    expect(coverage(panel, dot)).toBe(0);
  });

  it('adds up what a panel covers of many pieces', () => {
    const shapes: Shape[] = [
      { kind: 'box', box: { x: 10, y: 10, width: 2, height: 2 } },
      { kind: 'box', box: { x: 28, y: 18, width: 4, height: 4 } },
    ];
    expect(totalCoverage(panel, shapes)).toBe(4 + 4);
  });

  it('clips a segment to the range of it that lies on a box', () => {
    expect(clipSegment(panel, { x: 0, y: 15 }, { x: 40, y: 15 })).toEqual([0.25, 0.75]);
    expect(clipSegment(panel, { x: 0, y: 0 }, { x: 5, y: 0 })).toBeNull();
  });
});
