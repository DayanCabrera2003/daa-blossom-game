import { describe, expect, it } from 'vitest';
import { gearOutline } from './gear';

const centre = { x: 10, y: 20 };
const distance = (p: { x: number; y: number }): number =>
  Math.hypot(p.x - centre.x, p.y - centre.y);

describe('the outline of the settings gear', () => {
  it('each tooth is four corners: up from the rim, across the top, down again', () => {
    const outline = gearOutline(centre, 6, 5, 3);
    expect(outline).toHaveLength(24);
    outline.forEach((point, i) => {
      const onTop = i % 4 === 1 || i % 4 === 2;
      expect(distance(point)).toBeCloseTo(onTop ? 5 : 3);
    });
  });

  it('goes once round the centre, a step further at every corner', () => {
    const outline = gearOutline(centre, 8, 5, 3);
    const angles = outline.map((p) => {
      const angle = Math.atan2(p.y - centre.y, p.x - centre.x);
      return angle < -1e-9 ? angle + 2 * Math.PI : angle;
    });
    angles.forEach((angle, i) => {
      if (i > 0) expect(angle).toBeGreaterThanOrEqual((angles[i - 1] ?? 0) - 1e-9);
    });
    expect(angles.at(-1) ?? 0).toBeLessThan(2 * Math.PI);
  });
});
