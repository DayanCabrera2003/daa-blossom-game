import { lanternBox } from '@levels/layoutChecks';
import { PICTURE_SIZES } from '@levels/pictureSizes';
import type { Box } from '@levels/plane';
import type { SproutKind } from '@levels/fields';
import type { Point } from '../input/target';
import type { Rect } from './boxDistance';
import type { Shape } from './coverage';
import type { GardenPicture } from './garden';
import { outlinedNameBox } from './sproutName';
import type { PondPicture } from './tangle';

/**
 * What the garden draws at one moment, as the shapes a panel should keep clear of (the post-release
 * fix of plan 09): each sprout's body with its crown and its name, each vine shown, each lantern.
 * Once the tangle of the pond separates, the garden sinks under the water and the drifted pieces
 * are what shows. The sizes are the views' own (`levels/pictureSizes.ts`). Pure.
 */

const { body, crowns, vineStroke } = PICTURE_SIZES;

/** A box of the levels' plane as a box of the canvas. */
const rectOf = (box: Box): Rect => ({
  x: box.left,
  y: box.top,
  width: box.right - box.left,
  height: box.bottom - box.top,
});

/** A sprout as a panel sees it: where it stands, its name, its species in a garden of them. */
export interface SproutSpot extends Point {
  readonly label: string;
  readonly kind: SproutKind | null;
}

/** A sprout's shapes: its body with the crown over it, then its outlined name under it. */
export function sproutShapes(sprout: SproutSpot): Shape[] {
  const reach = sprout.kind === 'flower' ? body.diamond : body.round;
  const crown = crowns[sprout.kind ?? 'sprout'];
  const left = Math.min(-reach, crown.left);
  const top = Math.min(-reach, crown.top);
  const right = Math.max(reach, crown.right);
  const bottom = Math.max(reach, crown.bottom);
  return [
    {
      kind: 'box',
      box: { x: sprout.x + left, y: sprout.y + top, width: right - left, height: bottom - top },
    },
    { kind: 'box', box: rectOf(outlinedNameBox(sprout)) },
  ];
}

/** A vine's stroke between its two sprouts. */
export const vineShape = (a: Point, b: Point): Shape => ({ kind: 'line', a, b, width: vineStroke });

/** The lantern a lit vine carries at its middle. */
export const lanternShape = (a: Point, b: Point): Shape => ({
  kind: 'box',
  box: rectOf(lanternBox(a, b)),
});

/** A point moved by `offset`. */
const moved = (point: Point, offset: Point): Point => ({
  x: point.x + offset.x,
  y: point.y + offset.y,
});

/**
 * The shapes of the tangle's pieces that `keep` keeps (by piece index; null for a pair both sides
 * light, which belongs to no piece), each where its piece has drifted: its sprouts, its strands and
 * the lantern each strand carries.
 */
export function strandShapes(pond: PondPicture, keep: (piece: number | null) => boolean): Shape[] {
  const offset = (piece: number | null): Point =>
    piece === null ? { x: 0, y: 0 } : (pond.offsets[piece] ?? { x: 0, y: 0 });
  const sprouts = pond.sprouts
    .filter((sprout) => keep(sprout.piece))
    .flatMap((sprout) => {
      const at = moved(sprout.at, offset(sprout.piece));
      return sproutShapes({ ...at, label: sprout.label, kind: null });
    });
  const strands = pond.strands
    .filter((strand) => keep(strand.piece))
    .flatMap((strand) => {
      const [a, b] = [moved(strand.a, offset(strand.piece)), moved(strand.b, offset(strand.piece))];
      return [vineShape(a, b), lanternShape(a, b)];
    });
  return [...sprouts, ...strands];
}

/**
 * Everything the garden shows now as shapes: under a separated reflection, only its drifted
 * pieces; otherwise every sprout, every vine the fog does not hide, the lantern of every lit vine,
 * and the reflection's strands and lanterns over them while it is shown.
 */
export function gardenShapes(picture: GardenPicture, pond: PondPicture | null): Shape[] {
  const shown = pond !== null && !pond.dissolved ? pond : null;
  if (shown?.separated === true) return strandShapes(shown, () => true);
  const sprouts = picture.sprouts.flatMap((sprout) => sproutShapes(sprout));
  const vines = picture.vines
    .filter((vine) => vine.visible)
    .flatMap((vine) =>
      vine.lit
        ? [vineShape(vine.a, vine.b), lanternShape(vine.a, vine.b)]
        : [vineShape(vine.a, vine.b)],
    );
  const strands =
    shown === null
      ? []
      : shown.strands.flatMap((strand) => [
          vineShape(strand.a, strand.b),
          lanternShape(strand.a, strand.b),
        ]);
  return [...sprouts, ...vines, ...strands];
}
