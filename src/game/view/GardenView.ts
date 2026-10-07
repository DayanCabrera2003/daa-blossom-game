import type Phaser from 'phaser';
import type { Point } from '../input/target';
import type { GardenPicture, SproutPicture } from '../picture/garden';
import { PALETTE } from './palette';
import { textStyle } from './textStyle';

/** Radius of a sprout's circle (GDD §4.1: 16 × 16 sprouts). */
export const SPROUT_RADIUS = 7;

/**
 * Half the diagonal of a flower's diamond: a point wider than a sprout's radius, so the two shapes
 * look about the same size, and still inside the selection ring.
 */
const DIAMOND_REACH = SPROUT_RADIUS + 1;

/**
 * Fills a sprout's body at `(x, y)`, `grow` pixels larger than the sprout itself: a diamond for a
 * flower, a circle for a bee or a sprout that is neither. The shape, not the colour, tells bees
 * from flowers, so they still read in greyscale (GDD §4.1).
 */
function fillBody(
  graphics: Phaser.GameObjects.Graphics,
  sprout: SproutPicture,
  grow: number,
): void {
  const { x, y } = sprout;
  if (sprout.kind !== 'flower') {
    graphics.fillCircle(x, y, SPROUT_RADIUS + grow);
    return;
  }
  const r = DIAMOND_REACH + grow;
  graphics.fillPoints(
    [
      { x, y: y - r },
      { x: x + r, y },
      { x, y: y + r },
      { x: x - r, y },
    ],
    true,
  );
}

/** Draws a dotted segment: dark vines are dotted, lit ones solid (GDD §4.1). */
function dotted(graphics: Phaser.GameObjects.Graphics, a: Point, b: Point): void {
  const length = Math.hypot(b.x - a.x, b.y - a.y);
  for (let s = 0; s < length; s += 4) {
    const t0 = s / length;
    const t1 = Math.min(length, s + 2) / length;
    graphics.lineBetween(
      a.x + t0 * (b.x - a.x),
      a.y + t0 * (b.y - a.y),
      a.x + t1 * (b.x - a.x),
      a.y + t1 * (b.y - a.y),
    );
  }
}

/**
 * The garden itself in greybox: vines (dotted when dark, solid amber when lit, unseen under fog),
 * sprouts (cold blue in the dark, warm amber with a lantern; flowers as diamonds, bees and every
 * other sprout as circles), their names, the rings of what the player points at, and the chain
 * being dragged with what it would gain. Hit-testing still takes every sprout as a circle.
 */
export class GardenView {
  private readonly vines: Phaser.GameObjects.Graphics;
  private readonly sprouts: Phaser.GameObjects.Graphics;
  private readonly labels: Phaser.GameObjects.Text[] = [];

  constructor(private readonly scene: Phaser.Scene) {
    this.vines = scene.add.graphics().setDepth(20);
    this.sprouts = scene.add.graphics().setDepth(30);
  }

  render(picture: GardenPicture): void {
    this.drawVines(picture);
    this.drawSprouts(picture.sprouts);
    this.drawChain(picture.chain);
    this.drawLabels(picture.sprouts);
  }

  private drawVines(picture: GardenPicture): void {
    const g = this.vines.clear();
    for (const vine of picture.vines) {
      if (!vine.visible) continue;
      if (vine.lit) {
        g.lineStyle(2, PALETTE.lit, vine.inFlower ? 0.6 : 1).lineBetween(
          vine.a.x,
          vine.a.y,
          vine.b.x,
          vine.b.y,
        );
      } else {
        g.lineStyle(1, PALETTE.darkVine, vine.inFlower ? 0.5 : 1);
        dotted(g, vine.a, vine.b);
      }
    }
  }

  private drawSprouts(sprouts: readonly SproutPicture[]): void {
    const g = this.sprouts.clear();
    for (const s of sprouts) {
      if (s.lit) fillBody(g.fillStyle(PALETTE.litGlow, 0.25), s, 3);
      fillBody(g.fillStyle(s.lit ? PALETTE.lit : PALETTE.dark), s, 0);
      if (s.selected) g.lineStyle(1, PALETTE.selected).strokeCircle(s.x, s.y, SPROUT_RADIUS + 2);
      if (s.highlighted)
        g.lineStyle(1, PALETTE.highlight).strokeCircle(s.x, s.y, SPROUT_RADIUS + 4);
      if (s.inChain) g.lineStyle(1, PALETTE.chainGain).strokeCircle(s.x, s.y, SPROUT_RADIUS + 1);
    }
  }

  private drawChain(chain: GardenPicture['chain']): void {
    if (chain === null || chain.points.length < 2) return;
    const colour =
      chain.gain === 1
        ? PALETTE.chainGain
        : chain.gain === 0
          ? PALETTE.chainNone
          : PALETTE.chainWrong;
    this.vines
      .lineStyle(3, colour, 0.8)
      .strokePoints(chain.points as Phaser.Types.Math.Vector2Like[], false);
  }

  private drawLabels(sprouts: readonly SproutPicture[]): void {
    while (this.labels.length < sprouts.length) {
      this.labels.push(this.scene.add.text(0, 0, '', textStyle(8)).setOrigin(0.5, 0).setDepth(31));
    }
    sprouts.forEach((s, i) =>
      this.labels[i]?.setText(s.label).setPosition(s.x, s.y + SPROUT_RADIUS + 1),
    );
  }
}
