import type { Design, DesignPair } from '@levels/sandbox/design';
import { MIN_SPACING } from '@levels/sandbox/limits';
import { designHit, type DesignPointer } from '../input/designIntent';
import type { Point } from '../input/target';
import type { GardenPicture, SproutPicture, VinePicture } from './garden';

/**
 * The free mode's design as the garden's own views draw it (plan 08, phase 11): `GardenView` paints
 * the picture a level's garden gives, so a designed garden looks exactly like one to play, its
 * sprouts named, bees and flowers in their shapes, lanterns on their vines. On top, what the hand
 * is doing: the sprout chosen for a vine, a sprout dragged to a new place (its vines follow, and
 * the sprouts it would be too close to are ringed before it is let go), or a vine being drawn from
 * a sprout to the hand, green once it reaches another sprout. Pure: the editor scene paints it.
 */

/** What of the pointer the picture shows: the tool, the sprout chosen and the press held. */
export type DesignPointing = Pick<DesignPointer, 'tool' | 'selected' | 'press'>;

/** Whether a pair joins the sprouts `u` and `v`, in either order. */
const joins = (pair: DesignPair, u: string, v: string): boolean =>
  (pair[0] === u && pair[1] === v) || (pair[0] === v && pair[1] === u);

/** The sprout dragged to a new place and where it is now, or null. */
function draggedSprout(pointing: DesignPointing): { label: string; at: Point } | null {
  const { press, tool } = pointing;
  if (press === null || !press.dragging || press.target.kind !== 'sprout') return null;
  if (tool !== 'sprout' && tool !== 'move') return null;
  return {
    label: press.target.label,
    at: { x: Math.round(press.at.x), y: Math.round(press.at.y) },
  };
}

/** The picture of `design` with what `pointing` is doing over it. */
export function designPicture(design: Design, pointing: DesignPointing): GardenPicture {
  const dragged = draggedSprout(pointing);
  const placeOf = (label: string, x: number, y: number): Point =>
    dragged !== null && dragged.label === label ? dragged.at : { x, y };
  const places = new Map(design.sprouts.map((s) => [s.label, placeOf(s.label, s.x, s.y)]));
  const at = (label: string): Point => places.get(label) ?? { x: 0, y: 0 };
  const lit = new Set(design.lanterns.flat());
  /** Whether a sprout sits too close to where the dragged one is now. */
  const crowded = (label: string, point: Point): boolean =>
    dragged !== null &&
    dragged.label !== label &&
    Math.hypot(point.x - dragged.at.x, point.y - dragged.at.y) < MIN_SPACING;
  const chain = drawnVine(design, pointing);
  const inChain = new Set(chain?.ends ?? []);

  const sprouts = design.sprouts.map((sprout, vertex): SproutPicture => {
    const point = at(sprout.label);
    return {
      vertex,
      x: point.x,
      y: point.y,
      label: sprout.label,
      kind: sprout.kind ?? null,
      lit: lit.has(sprout.label),
      mark: null,
      selected: pointing.selected === sprout.label,
      highlighted: crowded(sprout.label, point),
      inChain: inChain.has(sprout.label),
      scarecrow: false,
      stone: false,
    };
  });
  const index = new Map(design.sprouts.map((s, vertex) => [s.label, vertex]));
  const vines = design.vines.map(([u, v]): VinePicture => ({
    u: index.get(u) ?? -1,
    v: index.get(v) ?? -1,
    a: at(u),
    b: at(v),
    lit: design.lanterns.some((lantern) => joins(lantern, u, v)),
    visible: true,
    inFlower: false,
    glowing: false,
  }));
  return {
    sprouts,
    vines,
    flowers: [],
    oddGroups: [],
    fog: null,
    chain: chain === null ? null : { points: chain.points, preview: chain.preview },
  };
}

/**
 * The vine being drawn with the vine tool: from the sprout pressed to the hand, in grey; once the
 * hand is over another sprout, onto its middle in green (letting go there grows or cuts that vine).
 */
function drawnVine(
  design: Design,
  pointing: DesignPointing,
): { points: Point[]; preview: 'gain0' | 'gain1'; ends: string[] } | null {
  const { press, tool } = pointing;
  if (tool !== 'vine' || press === null || !press.dragging || press.target.kind !== 'sprout') {
    return null;
  }
  const from = press.target.label;
  const start = design.sprouts.find((sprout) => sprout.label === from);
  if (start === undefined) return null;
  const over = designHit(design, press.at);
  const end =
    over.kind === 'sprout' && over.label !== from
      ? design.sprouts.find((sprout) => sprout.label === over.label)
      : undefined;
  const origin = { x: start.x, y: start.y };
  return end === undefined
    ? { points: [origin, press.at], preview: 'gain0', ends: [from] }
    : { points: [origin, { x: end.x, y: end.y }], preview: 'gain1', ends: [from, end.label] };
}
