import type Phaser from 'phaser';
import type { Point } from '../input/target';
import type { Petal } from '../picture/petals';
import { PALETTE } from './palette';

/** A ring of petals and the colour they are filled with. */
function paintRing(
  g: Phaser.GameObjects.Graphics,
  petals: readonly Petal[],
  colour: number,
  alpha: number,
): void {
  // The outlines first, all of them, so neighbouring petals overlap cleanly.
  g.lineStyle(2, PALETTE.background, alpha);
  for (const petal of petals)
    g.strokePoints(petal.outline as Phaser.Types.Math.Vector2Like[], true);
  g.fillStyle(colour, alpha);
  for (const petal of petals) g.fillPoints(petal.outline as Phaser.Types.Math.Vector2Like[], true);
}

/**
 * Paints a folded flower (`picture/petals.ts`): its petals in the flower's pink with an outline
 * in the near-black of the pack, a plum heart, and, when another flower is folded inside, that
 * one smaller and paler in its middle.
 */
export function paintFlower(
  g: Phaser.GameObjects.Graphics,
  centre: Point,
  petals: readonly Petal[],
  inner: readonly Petal[] | null,
  alpha = 1,
): void {
  paintRing(g, petals, PALETTE.flower, alpha);
  g.fillStyle(PALETTE.background, alpha).fillCircle(centre.x, centre.y, 4);
  g.fillStyle(PALETTE.oddGroup, alpha).fillCircle(centre.x, centre.y, 3);
  if (inner === null) return;
  paintRing(g, inner, PALETTE.highlight, alpha);
  g.fillStyle(PALETTE.oddGroup, alpha).fillCircle(centre.x, centre.y, 1.5);
}
