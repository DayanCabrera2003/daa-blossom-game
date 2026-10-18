import { describe, expect, it } from 'vitest';
import { BADGE_BOX, BADGE_SIZE, badgePixels, type BadgeKind, type BadgePixel } from './badges';

const KINDS: readonly BadgeKind[] = ['sun', 'moon', 'split'];
const key = (x: number, y: number): string => `${x},${y}`;
const filled = (pixels: readonly BadgePixel[]): Set<string> =>
  new Set(pixels.filter((p) => p.ink !== 'outline').map((p) => key(p.x, p.y)));
const NEIGHBOURS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
] as const;

describe('the sun and moon badges', () => {
  it('fills an 8 × 8 square inside a box one pixel wider each side for the outline', () => {
    expect(BADGE_SIZE).toBe(8);
    expect(BADGE_BOX).toBe(10);
    for (const kind of KINDS) {
      for (const p of badgePixels(kind)) {
        expect(p.x >= 0 && p.x < BADGE_BOX && p.y >= 0 && p.y < BADGE_BOX).toBe(true);
        if (p.ink !== 'outline')
          expect(p.x >= 1 && p.x <= BADGE_SIZE && p.y >= 1 && p.y <= BADGE_SIZE).toBe(true);
      }
    }
  });

  it('outlines every badge by one pixel all round, and only round it', () => {
    for (const kind of KINDS) {
      const pixels = badgePixels(kind);
      const ink = new Map(pixels.map((p) => [key(p.x, p.y), p.ink]));
      for (const p of pixels) {
        const around = NEIGHBOURS.map(([dx, dy]) => ink.get(key(p.x + dx, p.y + dy)));
        if (p.ink === 'outline')
          expect(around.some((i) => i !== undefined && i !== 'outline')).toBe(true);
        else expect(around.every((i) => i !== undefined)).toBe(true);
      }
      // No pixel is listed twice.
      expect(ink.size).toBe(pixels.length);
    }
  });

  it('tells sun from moon by shape, not only by colour (GDD §4.1)', () => {
    const sun = filled(badgePixels('sun'));
    const moon = filled(badgePixels('moon'));
    const same = [...sun].filter((p) => moon.has(p)).length;
    // Seen in one colour, most of either shape is not in the other.
    expect(same).toBeLessThan(Math.min(sun.size, moon.size) / 2);
    // A sun is round on both sides, a moon is a crescent open to the right.
    expect(sun.has(key(8, 4)) || sun.has(key(8, 5))).toBe(true);
    expect(moon.has(key(8, 4)) || moon.has(key(8, 5))).toBe(false);
  });

  it('inks each badge in its own colour', () => {
    expect(new Set(badgePixels('sun').map((p) => p.ink))).toEqual(new Set(['sun', 'outline']));
    expect(new Set(badgePixels('moon').map((p) => p.ink))).toEqual(new Set(['moon', 'outline']));
  });

  it('splits in half: the left half of the sun, a crescent turned the other way on the right', () => {
    const split = badgePixels('split').filter((p) => p.ink !== 'outline');
    for (const p of split) expect(p.ink).toBe(p.x <= BADGE_SIZE / 2 ? 'sun' : 'moon');
    const sun = filled(badgePixels('sun'));
    for (const p of split.filter((q) => q.ink === 'sun')) expect(sun.has(key(p.x, p.y))).toBe(true);
    const moon = filled(badgePixels('moon'));
    for (const p of split.filter((q) => q.ink === 'moon'))
      expect(moon.has(key(BADGE_SIZE + 1 - p.x, p.y))).toBe(true);
  });
});
