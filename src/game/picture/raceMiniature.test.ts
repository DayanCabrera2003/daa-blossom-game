import { raceGarden } from '@core/generators/raceGarden';
import { describe, expect, it } from 'vitest';
import { miniatureOf } from './raceMiniature';

const box = { x: 10, y: 20, width: 100, height: 80 };
const spec = { family: 'half', size: 16, seed: 26 } as const;

describe('the zoomed-out garden of a race (6.5)', () => {
  it('sets every sprout on a ring inside its box, the first at the top', () => {
    const { sprouts } = miniatureOf(spec, box);
    expect(sprouts).toHaveLength(16);
    for (const { x, y } of sprouts) {
      expect(x).toBeGreaterThanOrEqual(box.x);
      expect(x).toBeLessThanOrEqual(box.x + box.width);
      expect(y).toBeGreaterThanOrEqual(box.y);
      expect(y).toBeLessThanOrEqual(box.y + box.height);
    }
    expect(sprouts[0]?.x).toBeCloseTo(60);
    expect(sprouts[0]?.y).toBeLessThan(sprouts[8]?.y ?? 0);
  });

  it('draws the very vines of the garden the race was run on', () => {
    const { sprouts, vines } = miniatureOf(spec, box);
    const garden = raceGarden('half', 16, 26);
    expect(vines).toHaveLength(garden.edges.length);
    const [u, v] = garden.edges[0] ?? [0, 0];
    expect(vines[0]).toEqual([sprouts[u], sprouts[v]]);
  });
});
