import { PICTURE_SIZES } from './pictureSizes';
import { boxesNear, boxNearCircle, segmentsCross, type Box, type Point } from './plane';
import type { LevelData } from './schema';

/** Something in a level's layout that makes its garden hard to read. */
export type LayoutProblem =
  | {
      readonly code: 'vinesCross';
      readonly vines: readonly [readonly [string, string], readonly [string, string]];
    }
  | { readonly code: 'labelOnSprout'; readonly label: string; readonly sprout: string }
  | { readonly code: 'labelOnLabel'; readonly labels: readonly [string, string] }
  | {
      readonly code: 'labelOnLantern';
      readonly label: string;
      readonly vine: readonly [string, string];
    }
  | { readonly code: 'labelsDifferByCase'; readonly labels: readonly [string, string] };

/** A sprout as the layout sees it: its name and where it sits. */
interface Placed extends Point {
  readonly label: string;
}

/** The part of a level its layout is read from. */
interface Layout {
  readonly sprouts: readonly Placed[];
  readonly vines: readonly (readonly [string, string])[];
}

const {
  sproutRadius,
  labelGap,
  glyph,
  tailedLetters,
  lantern,
  labelClearance: clearance,
} = PICTURE_SIZES;

/**
 * The box the letters of a sprout's name fill: centred under the sprout, from the top of a capital
 * to the baseline, or down to the end of the descent when a letter hangs a tail below it.
 */
export function labelBox({ label, x, y }: Placed): Box {
  const top = y + sproutRadius + labelGap;
  const tailed = [...label].some((letter) => tailedLetters.includes(letter));
  const half = (glyph.advance * label.length) / 2;
  return {
    left: x - half,
    right: x + half,
    top: top + glyph.ascent - glyph.capHeight,
    bottom: top + glyph.ascent + (tailed ? glyph.descent : 0),
  };
}

/** The box of the lantern any vine may carry, hung at its middle rounded to a whole pixel. */
export function lanternBox(a: Point, b: Point): Box {
  const [x, y] = [Math.round((a.x + b.x) / 2), Math.round((a.y + b.y) / 2)];
  return {
    left: x + lantern.left,
    right: x + lantern.right,
    top: y + lantern.top,
    bottom: y + lantern.bottom,
  };
}

/** The vines whose two sprouts are known, with where their ends sit. */
function placedVines(level: Layout): { vine: readonly [string, string]; a: Point; b: Point }[] {
  const at = new Map(level.sprouts.map((sprout) => [sprout.label, sprout]));
  return level.vines.flatMap((vine) => {
    const [a, b] = [at.get(vine[0]), at.get(vine[1])];
    // A name the garden does not know is refused by the garden builder on its own.
    return a === undefined || b === undefined ? [] : [{ vine, a, b }];
  });
}

/**
 * Every pair of vines that cross away from the sprouts they share, each pair once in file order.
 * The garden is still sound, but a crossing makes a reader follow the wrong vine.
 */
export function vineCrossings(level: Layout): LayoutProblem[] {
  const vines = placedVines(level);
  return vines.flatMap((one, i) =>
    vines
      .slice(i + 1)
      .filter((other) => segmentsCross(one.a, one.b, other.a, other.b))
      .map((other): LayoutProblem => ({ code: 'vinesCross', vines: [one.vine, other.vine] })),
  );
}

/**
 * The names drawn over something else, with the sizes the views draw them at: another sprout,
 * another name (each pair once) or the lantern any vine may carry, lit now or later.
 */
function crowdedLabels(level: Layout): LayoutProblem[] {
  const vines = placedVines(level);
  return level.sprouts.flatMap((sprout, i): LayoutProblem[] => {
    const box = labelBox(sprout);
    const others = level.sprouts.filter((other) => other !== sprout);
    return [
      ...others
        .filter((other) => boxNearCircle(box, other, sproutRadius, clearance))
        .map((other): LayoutProblem => ({
          code: 'labelOnSprout',
          label: sprout.label,
          sprout: other.label,
        })),
      ...level.sprouts
        .slice(i + 1)
        .filter((other) => boxesNear(box, labelBox(other), clearance))
        .map((other): LayoutProblem => ({
          code: 'labelOnLabel',
          labels: [sprout.label, other.label],
        })),
      ...vines
        .filter(({ a, b }) => boxesNear(box, lanternBox(a, b), clearance))
        .map(({ vine }): LayoutProblem => ({ code: 'labelOnLantern', label: sprout.label, vine })),
    ];
  });
}

/** The pairs of names that differ only by case: the pixel font tells `c` from `C` by size alone. */
function caseTwins(level: Layout): LayoutProblem[] {
  const labels = level.sprouts.map((sprout) => sprout.label);
  return labels.flatMap((label, i) =>
    labels
      .slice(i + 1)
      .filter((other) => other !== label && other.toLowerCase() === label.toLowerCase())
      .map((other): LayoutProblem => ({ code: 'labelsDifferByCase', labels: [label, other] })),
  );
}

/**
 * The layout problems of a level, laid out by hand: every name must be readable on its own and
 * unlike the others, and a secret flower, being a puzzle of looking, has no crossing vines. Other
 * levels may keep crossings their design needs; `vineCrossings` reports them.
 */
export function checkLayout(
  level: Layout & { readonly secret?: LevelData['secret'] },
): LayoutProblem[] {
  return [
    ...(level.secret === undefined ? [] : vineCrossings(level)),
    ...crowdedLabels(level),
    ...caseTwins(level),
  ];
}
