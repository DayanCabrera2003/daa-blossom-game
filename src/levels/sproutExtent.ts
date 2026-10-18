import type { SproutKind } from './fields';
import { PICTURE_SIZES } from './pictureSizes';
import { boxesNear, boxNearCircle, boxNearDiamond, type Box, type Point } from './plane';

/**
 * The room a sprout's picture takes, by its species (plan 06, section 1.4): its body with the dark
 * outline, round or a flower's diamond, and the crown over it, a plain sprout's leaves, a bee's
 * wings or a flower's petals, which rise above the body into the name of a sprout standing above.
 */

/** A sprout as its picture is drawn: where it sits, and bee or flower in such gardens only. */
export interface SproutAt extends Point {
  readonly kind?: SproutKind | undefined;
}

const { body, crowns } = PICTURE_SIZES;

/** The box of `sprout`'s crown, where it stands. */
function crownBox(sprout: SproutAt): Box {
  const crown = crowns[sprout.kind ?? 'sprout'];
  return {
    left: sprout.x + crown.left,
    right: sprout.x + crown.right,
    top: sprout.y + crown.top,
    bottom: sprout.y + crown.bottom,
  };
}

/** Whether anything painted for `sprout` reaches into `box` or the `clearance` pixels around it. */
export function boxNearSprout(box: Box, sprout: SproutAt, clearance: number): boolean {
  const touchesBody =
    sprout.kind === 'flower'
      ? boxNearDiamond(box, sprout, body.diamond, clearance)
      : boxNearCircle(box, sprout, body.round, clearance);
  return touchesBody || boxesNear(box, crownBox(sprout), clearance);
}
