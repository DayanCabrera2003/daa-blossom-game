import { describe, expect, it } from 'vitest';
import { centroid } from '../input/flowerShape';
import type { Point } from '../input/target';
import { STONE_DROP, STONE_FALL_MS, STONE_SETTLE_MS, groupsApart, stoneFall } from './stoneSplit';

const square = (x: number, y: number): Point[] => [
  { x, y },
  { x: x + 10, y },
  { x: x + 10, y: y + 10 },
  { x, y: y + 10 },
];
const groups = [square(0, 0), square(100, 0), square(50, 80)];
const DURATION = 640;

describe('a stone set down (GDD §4.1, key animation 4)', () => {
  it('drops from above, faster and faster, onto its sprout', () => {
    expect(stoneFall(0)).toEqual({ height: STONE_DROP, scaleX: 1, scaleY: 1 });
    const early = stoneFall(STONE_FALL_MS / 4)?.height ?? 0;
    const late = stoneFall((3 * STONE_FALL_MS) / 4)?.height ?? 0;
    expect(STONE_DROP - early).toBeLessThan(early - late);
    expect(stoneFall(STONE_FALL_MS)?.height).toBe(0);
  });

  it('squashes as it hits, keeping its area, and settles back to its own size', () => {
    const hit = stoneFall(STONE_FALL_MS + 1);
    expect(hit?.scaleY).toBeLessThan(1);
    expect((hit?.scaleX ?? 0) * (hit?.scaleY ?? 0)).toBeCloseTo(1);
    const settled = stoneFall(STONE_FALL_MS + STONE_SETTLE_MS - 0.001);
    expect(settled?.scaleY).toBeCloseTo(1, 2);
    expect(stoneFall(STONE_FALL_MS + STONE_SETTLE_MS)).toBeNull();
    expect(stoneFall(-5)).toEqual(stoneFall(0));
  });
});

describe('the garden parting into groups round the stone', () => {
  it('shows nothing before the stone lands, nor once the step is over', () => {
    expect(groupsApart(groups, 0, DURATION)).toEqual([]);
    expect(groupsApart(groups, STONE_FALL_MS, DURATION)).toEqual([]);
    expect(groupsApart(groups, DURATION, DURATION)).toEqual([]);
  });

  it('pushes the groups away from each other and lets them come back to their place', () => {
    const middle = STONE_FALL_MS + (DURATION - STONE_FALL_MS) / 2;
    const apart = groupsApart(groups, middle, DURATION);
    expect(apart).toHaveLength(3);
    const gap = (list: readonly (readonly Point[])[], i: number, j: number): number => {
      const [a, b] = [centroid(list[i] ?? []), centroid(list[j] ?? [])];
      return Math.hypot(a.x - b.x, a.y - b.y);
    };
    const outlines = apart.map((group) => group.outline);
    for (const [i, j] of [
      [0, 1],
      [0, 2],
      [1, 2],
    ] as const)
      expect(gap(outlines, i, j)).toBeGreaterThan(gap(groups, i, j));
    for (const group of apart) expect(group.alpha).toBeCloseTo(1);
    // Near the end they are almost back where the garden draws them, and fading.
    const back = groupsApart(groups, DURATION - 1, DURATION);
    expect(
      gap(
        back.map((group) => group.outline),
        0,
        1,
      ),
    ).toBeCloseTo(gap(groups, 0, 1), 0);
    for (const group of back) expect(group.alpha).toBeLessThan(0.1);
  });

  it('keeps a lone group where it is', () => {
    const [only] = groupsApart([square(0, 0)], 300, DURATION);
    expect(only?.outline).toEqual(square(0, 0));
  });
});
