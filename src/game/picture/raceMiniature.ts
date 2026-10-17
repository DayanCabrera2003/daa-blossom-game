import { raceGarden } from '@core/generators/raceGarden';
import { itemAt } from '@core/shared/itemAt';
import type { RaceSpec } from '@levels/races';
import type { Point } from '../input/target';

/**
 * The garden of a race seen from far away (GDD 6.5: "vista alejada, brotes en miniatura"): its
 * sprouts tiny on a ring, its vines as thin lines. The garden is the very one the core raced, grown
 * again from its family and seed; it has no places of its own, so the ring gives them.
 */

/** A box on the canvas, in canvas pixels. */
export interface Box {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** The miniature: where each sprout sits, by id, and each vine as its two ends. */
export interface Miniature {
  readonly sprouts: readonly Point[];
  readonly vines: readonly (readonly [Point, Point])[];
}

/** Room left between the ring and the edges of its box, for the sprouts' dots. */
const MARGIN = 3;

/** The garden of a race in miniature, on a ring centred in `box`, its first sprout at the top. */
export function miniatureOf(spec: Pick<RaceSpec, 'family' | 'size' | 'seed'>, box: Box): Miniature {
  const garden = raceGarden(spec.family, spec.size, spec.seed);
  const radius = Math.max(0, Math.min(box.width, box.height) / 2 - MARGIN);
  const [cx, cy] = [box.x + box.width / 2, box.y + box.height / 2];
  const sprouts = Array.from({ length: garden.n }, (_, i): Point => {
    const angle = (2 * Math.PI * i) / garden.n - Math.PI / 2;
    return { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
  });
  const vines = garden.edges.map(([u, v]): readonly [Point, Point] => [
    itemAt(sprouts, u),
    itemAt(sprouts, v),
  ]);
  return { sprouts, vines };
}
