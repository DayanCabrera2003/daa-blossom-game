import type { Edge } from '@core/graph/types';
import type { FlowerSnapshot } from '@core/trace/replay';
import type { MiniLayout } from './miniGarden';
import { groupOf, NO_OVERLAY, type Overlay } from './overlay';

/**
 * A flower seen from inside, in a replayed day of the Codex (plan 07, phase 5; C9, the layers of
 * 5.2): touching a folded flower lights all the sprouts it holds and, in their own colour, the
 * flowers folded directly inside it, without changing the day. Nothing is lit when the flower
 * touched is not folded at the step shown.
 */

/** What a flower holds: its base, how many sprouts, and how many flowers directly inside it. */
export interface FlowerInside {
  readonly base: number;
  readonly sprouts: number;
  readonly inner: number;
}

/** The flower `chosen` among `flowers`, or null when it is not folded now. */
const find = (flowers: readonly FlowerSnapshot[], chosen: number | null): FlowerSnapshot | null =>
  flowers.find((flower) => flower.id === chosen) ?? null;

/** The marks of the flower `chosen` seen from inside: its sprouts, and the flowers inside it. */
export function layersOverlay(
  flowers: readonly FlowerSnapshot[],
  chosen: number | null,
  layout: MiniLayout,
  edges: readonly Edge[],
): Overlay {
  const flower = find(flowers, chosen);
  if (flower === null) return NO_OVERLAY;
  const inner = flowers.filter((other) => other.parent === flower.id);
  return {
    ...NO_OVERLAY,
    groups: [
      groupOf(layout.at, flower.members, edges, 'chosen'),
      ...inner.map((other) => groupOf(layout.at, other.members, edges, 'inner')),
    ],
  };
}

/** What the flower `chosen` holds, or null when it is not folded now. */
export function flowerInside(
  flowers: readonly FlowerSnapshot[],
  chosen: number | null,
): FlowerInside | null {
  const flower = find(flowers, chosen);
  if (flower === null) return null;
  return {
    base: flower.base,
    sprouts: flower.members.length,
    inner: flowers.filter((other) => other.parent === flower.id).length,
  };
}
