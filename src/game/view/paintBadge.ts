import type Phaser from 'phaser';
import { BADGE_BOX, badgePixels, type BadgeInk, type BadgeKind } from '../picture/badges';
import { PALETTE } from './palette';

/** The colour of each ink of a badge. */
const INK: Readonly<Record<BadgeInk, number>> = {
  sun: PALETTE.sun,
  moon: PALETTE.moon,
  outline: PALETTE.background,
};

/** Each badge's pixels, worked out once. */
const PIXELS: Readonly<Record<BadgeKind, ReturnType<typeof badgePixels>>> = {
  sun: badgePixels('sun'),
  moon: badgePixels('moon'),
  split: badgePixels('split'),
};

/**
 * Paints a badge (`picture/badges.ts`) pixel by pixel on `g`, its box centred on (x, y) and
 * snapped to the pixel grid, `scale` logical pixels to each of its pixels.
 */
export function paintBadge(
  g: Phaser.GameObjects.Graphics,
  kind: BadgeKind,
  x: number,
  y: number,
  scale = 1,
): void {
  const left = Math.round(x - (BADGE_BOX * scale) / 2);
  const top = Math.round(y - (BADGE_BOX * scale) / 2);
  for (const pixel of PIXELS[kind]) {
    g.fillStyle(INK[pixel.ink]).fillRect(
      left + pixel.x * scale,
      top + pixel.y * scale,
      scale,
      scale,
    );
  }
}
