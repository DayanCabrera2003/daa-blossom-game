import type { Point } from '../input/target';
import type { FlowerPicture } from './garden';

/**
 * The petals of a folded flower (GDD §4.1: "flores plegadas: 32 × 32 con el número de pétalos
 * visible como pétalos reales"): as many petals as sprouts its cycle folds, evenly round its
 * middle with the first one pointing up, each an oval from the flower's heart to its tip. A flower
 * with another folded inside shows that one smaller in its middle (the nested flowers of chapter 5).
 */

/** One petal: its tip, its middle, the way it points, how wide it is and its outline. */
export interface Petal {
  readonly tip: Point;
  readonly middle: Point;
  /** The direction from the flower's middle to the tip, in radians (y grows downwards). */
  readonly angle: number;
  readonly width: number;
  readonly outline: readonly Point[];
}

/** A flower on top as drawn: its petals and, when another is folded inside, that one's petals. */
export interface FlowerLook {
  readonly id: number;
  readonly centre: Point;
  readonly petals: readonly Petal[];
  readonly inner: readonly Petal[] | null;
}

/** From the middle to a petal's tip: a flower fills its 32 × 32 square. */
export const FLOWER_REACH = 14;
/** The same for the smaller flower drawn in the middle of one that holds it. */
export const INNER_REACH = 6;

/** Where the petals start, leaving a heart in the middle, for each size of flower. */
export const FLOWER_HEART = 5;
export const INNER_HEART = 2;

/** How many points go round each petal's oval. */
const OUTLINE_POINTS = 10;
/** A petal is at most this wide for its length, and fills at most this share of its slice. */
const SLENDER = 0.7;
const SLICE_SHARE = 0.9;

/**
 * `count` petals round `centre`, from `heart` away from it to their tips `reach` away, the first
 * one pointing up.
 */
export function petalRing(centre: Point, count: number, reach: number, heart: number): Petal[] {
  const length = reach - heart;
  const fromCentre = heart + length / 2;
  const width = Math.min(
    length * SLENDER,
    2 * fromCentre * Math.sin(Math.PI / count) * SLICE_SHARE,
  );
  return Array.from({ length: count }, (_, i): Petal => {
    const angle = -Math.PI / 2 + (2 * Math.PI * i) / count;
    const along = { x: Math.cos(angle), y: Math.sin(angle) };
    const middle = { x: centre.x + along.x * fromCentre, y: centre.y + along.y * fromCentre };
    // An oval round the petal's middle: half its length along the petal, half its width across.
    const outline = Array.from({ length: OUTLINE_POINTS }, (_, j): Point => {
      const t = (2 * Math.PI * j) / OUTLINE_POINTS;
      const a = (Math.cos(t) * length) / 2;
      const b = (Math.sin(t) * width) / 2;
      return { x: middle.x + a * along.x - b * along.y, y: middle.y + a * along.y + b * along.x };
    });
    return {
      tip: { x: centre.x + along.x * reach, y: centre.y + along.y * reach },
      middle,
      angle,
      width,
      outline,
    };
  });
}

/** The petals a flower is drawn with: its own ring and, with one nested in it, that one's ring. */
export interface FlowerPetals {
  readonly petals: readonly Petal[];
  readonly inner: readonly Petal[] | null;
}

/**
 * The petals of a flower of `petals` petals at `centre`, with a flower of `inner` petals folded
 * inside it (null with none), as the garden draws it once folded.
 */
function drawnPetals(centre: Point, petals: number, inner: number | null): FlowerPetals {
  return {
    petals: petalRing(centre, petals, FLOWER_REACH, FLOWER_HEART),
    inner: inner === null ? null : petalRing(centre, inner, INNER_REACH, INNER_HEART),
  };
}

/**
 * The petals of a flower as it folds or opens (`foldFrames.ts`): from the first frame to the last,
 * the size the garden draws the folded flower at (`flowerLooks`), so the petals never start wider
 * than the flower they become; the frames move the sprouts and fade the flower in or out.
 */
export function foldPetals(shape: {
  readonly centre: Point;
  readonly petals: number;
  readonly inner: number | null;
}): FlowerPetals {
  return drawnPetals(shape.centre, shape.petals, shape.inner);
}

/**
 * The flowers on top (depth 0) among `flowers`, listed outermost first with each one's nested
 * flowers right after it (as `gardenPicture` lists them), each with the first flower folded
 * directly inside it drawn small in its middle.
 */
export function flowerLooks(flowers: readonly FlowerPicture[]): FlowerLook[] {
  return flowers.flatMap((flower, i): FlowerLook[] => {
    if (flower.depth !== 0) return [];
    const rest = flowers.slice(i + 1);
    const end = rest.findIndex((other) => other.depth === 0);
    const nested = (end === -1 ? rest : rest.slice(0, end)).find((other) => other.depth === 1);
    return [
      {
        id: flower.id,
        centre: flower.centre,
        ...drawnPetals(flower.centre, flower.petals, nested?.petals ?? null),
      },
    ];
  });
}
