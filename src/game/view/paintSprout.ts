import type Phaser from 'phaser';
import type { SproutLook } from '../picture/sproutLook';
import { PALETTE } from './palette';

/** Radius of a sprout's body (GDD §4.1: 16 × 16 sprouts; 14 px with its 1 px outline round it). */
export const SPROUT_RADIUS = 7;

/** Below this radius (the tiny gardens of the cards) a face is only two eyes. */
const FULL_FACE_RADIUS = 6;

/** How a sprout is painted: its look, lit or dark, its size and how opaque. */
export interface SproutPaint {
  readonly x: number;
  readonly y: number;
  readonly radius: number;
  readonly lit: boolean;
  readonly look: SproutLook;
  readonly alpha?: number;
}

/** The corners of a flower's diamond, `reach` from its middle. */
const diamond = (x: number, y: number, reach: number): Phaser.Types.Math.Vector2Like[] => [
  { x, y: y - reach },
  { x: x + reach, y },
  { x, y: y + reach },
  { x: x - reach, y },
];

/**
 * Fills a body `grow` pixels larger than the sprout: a diamond for a flower, a circle for a bee or
 * a plain sprout. The shape, not the colour, tells bees from flowers, so they read in greyscale.
 */
function fillBody(g: Phaser.GameObjects.Graphics, paint: SproutPaint, grow: number): void {
  const { x, y, radius, look } = paint;
  // A diamond's slanted sides need one and a half times the grow to show the same outline.
  if (look.species === 'flower') g.fillPoints(diamond(x, y, radius + 1 + 1.5 * grow), true);
  else g.fillCircle(x, y, radius + grow);
}

/** A small block of pixels of the face at (x, y), snapped to the pixel grid. */
const dot = (g: Phaser.GameObjects.Graphics, x: number, y: number, w = 1, h = 1): void => {
  g.fillRect(Math.round(x), Math.round(y), w, h);
};

/**
 * The little face (plan 06, section 1.4): asleep in the dark, eyes shut and a sad mouth; happy
 * with a lantern, eyes open, a smile and pink cheeks; a blink shuts the open eyes for a moment.
 */
function paintFace(g: Phaser.GameObjects.Graphics, paint: SproutPaint, alpha: number): void {
  const { x, y, radius, look } = paint;
  g.fillStyle(PALETTE.background, alpha);
  const shut = look.face === 'asleep' || look.blinking;
  if (radius < FULL_FACE_RADIUS) {
    dot(g, x - 2, y - 1, 1, shut ? 1 : 2);
    dot(g, x + 1, y - 1, 1, shut ? 1 : 2);
    return;
  }
  // Eyes: two pixels tall when open, a line of two when shut.
  if (shut) {
    dot(g, x - 3, y, 2, 1);
    dot(g, x + 2, y, 2, 1);
  } else {
    dot(g, x - 3, y - 1, 1, 2);
    dot(g, x + 2, y - 1, 1, 2);
  }
  if (look.face === 'happy') {
    // A smile, and the cheeks of a sprout glad of its lantern.
    dot(g, x - 1, y + 3, 3, 1);
    dot(g, x - 2, y + 2);
    dot(g, x + 2, y + 2);
    g.fillStyle(PALETTE.flower, alpha);
    dot(g, x - 5, y + 2, 2, 1);
    dot(g, x + 4, y + 2, 2, 1);
  } else {
    // A small sad mouth.
    dot(g, x - 1, y + 3, 3, 1);
    dot(g, x - 2, y + 4);
    dot(g, x + 2, y + 4);
  }
}

/** A bee's two wings, behind its body on either side of its back (plan 06, section 1.4). */
function paintWings(g: Phaser.GameObjects.Graphics, paint: SproutPaint, alpha: number): void {
  const { x, y, radius } = paint;
  for (const side of [-1, 1]) {
    const wx = x + side * (radius - 1);
    const wy = y - radius + 1;
    g.fillStyle(PALETTE.background, alpha).fillEllipse(wx, wy, 7, 6);
    g.fillStyle(PALETTE.label, 0.85 * alpha).fillEllipse(wx, wy, 5, 4);
  }
}

/** A bee's two stripes, across the top of its body, above its eyes. */
function paintStripes(g: Phaser.GameObjects.Graphics, paint: SproutPaint, alpha: number): void {
  const { x, y, radius } = paint;
  g.fillStyle(PALETTE.background, alpha);
  g.fillRect(x - radius + 2, y - 3, 2 * radius - 3, 1);
  g.fillRect(x - radius + 3, y - 5, 2 * radius - 5, 1);
}

/**
 * Paints a sprout's body on `g`: a 1 px outline in the near-black of the Ninja Adventure sprites,
 * the body cold blue in the dark or warm amber with a lantern (GDD §4.1), a glint, a bee's wings
 * and stripes (on full-size sprouts), and the face. Leaves and a flower's petals are sprites,
 * placed by `SproutCrowns`.
 */
export function paintSprout(g: Phaser.GameObjects.Graphics, paint: SproutPaint): void {
  const alpha = paint.alpha ?? 1;
  const { x, y, radius, lit, look } = paint;
  const bee = look.species === 'bee' && radius >= FULL_FACE_RADIUS;
  if (bee) paintWings(g, paint, alpha);
  fillBody(g.fillStyle(PALETTE.background, alpha), paint, 1);
  fillBody(g.fillStyle(lit ? PALETTE.lit : PALETTE.dark, alpha), paint, 0);
  // A glint on the upper left, the light the sprite styles of the pack all share.
  g.fillStyle(lit ? PALETTE.litGlow : PALETTE.moon, 0.7 * alpha);
  dot(g, x - radius + 2, y - radius + 3, 2, 1);
  if (bee) paintStripes(g, paint, alpha);
  paintFace(g, paint, alpha);
}
