import type Phaser from 'phaser';
import type { Point } from '../input/target';
import type { GardenPicture, SproutPicture } from '../picture/garden';
import { sproutLook } from '../picture/sproutLook';
import { everyFrame } from './everyFrame';
import { LanternSprites } from './LanternSprites';
import { paintSprout, SPROUT_RADIUS } from './paintSprout';
import { PALETTE } from './palette';
import { ensurePieceTextures } from './pieceTextures';
import { SproutCrowns } from './SproutCrowns';
import { textStyle } from './textStyle';

/** Depths of the garden's layers: the lanterns' halo under the vines, the lanterns over them. */
const HALO_DEPTH = 19;
const VINE_DEPTH = 20;
const LANTERN_DEPTH = 22;
const SPROUT_DEPTH = 30;

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

/** The middle of a vine, where its lantern hangs. */
const middle = (a: Point, b: Point): Point => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

/**
 * The garden itself (plan 06, section 1.4): vines (dotted when dark, solid amber with a glow when
 * lit, unseen under fog, with a glow under the one a hint points at), the lantern hung on each lit
 * vine, the sprouts composed from code and the pack (an outlined round body, cold blue in the dark
 * and warm amber with a lantern, the two-leaf sprout on top, a little face asleep or smiling that
 * blinks now and then; a chapter 3 flower as a diamond with petals, a bee with wings and stripes),
 * their names, the rings of what the player points at, and the chain being dragged with what it
 * would gain. Pieces keep the sizes of the greybox, so hit-testing still takes every sprout as a
 * circle of `SPROUT_RADIUS`.
 */
export class GardenView {
  private readonly vines: Phaser.GameObjects.Graphics;
  private readonly sprouts: Phaser.GameObjects.Graphics;
  private readonly rings: Phaser.GameObjects.Graphics;
  private readonly crowns: SproutCrowns;
  private readonly lanterns: LanternSprites;
  private readonly labels: Phaser.GameObjects.Text[] = [];
  /** The sprouts painted last, repainted every frame so that they blink. */
  private shown: readonly SproutPicture[] = [];

  constructor(private readonly scene: Phaser.Scene) {
    ensurePieceTextures(scene.textures);
    this.vines = scene.add.graphics().setDepth(VINE_DEPTH);
    this.lanterns = new LanternSprites(scene, 'amber', LANTERN_DEPTH, HALO_DEPTH);
    this.sprouts = scene.add.graphics().setDepth(SPROUT_DEPTH);
    // Leaves over the bodies, and the rings of what is pointed at over the leaves.
    this.crowns = new SproutCrowns(scene, SPROUT_DEPTH + 0.1);
    this.rings = scene.add.graphics().setDepth(SPROUT_DEPTH + 0.2);
    everyFrame(scene, (now) => this.tick(now));
  }

  render(picture: GardenPicture): void {
    const now = this.scene.time.now;
    this.drawVines(picture);
    this.lanterns.render(
      picture.vines
        .filter((vine) => vine.visible && vine.lit)
        .map((vine) => middle(vine.a, vine.b)),
      now,
    );
    this.shown = picture.sprouts;
    this.drawSprouts(now);
    this.drawRings(picture.sprouts);
    this.drawChain(picture.chain);
    this.drawLabels(picture.sprouts);
  }

  /** Moves the blinks and the lanterns' flicker on. */
  private tick(now: number): void {
    this.drawSprouts(now);
    this.lanterns.tick(now);
  }

  private drawVines(picture: GardenPicture): void {
    const g = this.vines.clear();
    for (const vine of picture.vines) {
      if (!vine.visible) continue;
      // A vine a hint points at glows under its own stroke.
      if (vine.glowing)
        g.lineStyle(5, PALETTE.highlight, 0.6).lineBetween(vine.a.x, vine.a.y, vine.b.x, vine.b.y);
      const fade = vine.inFlower ? 0.6 : 1;
      if (vine.lit) {
        // Solid amber over a soft glow of its light.
        g.lineStyle(4, PALETTE.litGlow, 0.25 * fade).lineBetween(
          vine.a.x,
          vine.a.y,
          vine.b.x,
          vine.b.y,
        );
        g.lineStyle(2, PALETTE.lit, fade).lineBetween(vine.a.x, vine.a.y, vine.b.x, vine.b.y);
      } else {
        g.lineStyle(1, PALETTE.darkVine, vine.inFlower ? 0.5 : 1);
        dotted(g, vine.a, vine.b);
      }
    }
  }

  /** The bodies and faces of the sprouts as they look at `now`, and the leaves on top. */
  private drawSprouts(now: number): void {
    const g = this.sprouts.clear();
    const crowns = [];
    for (const s of this.shown) {
      const look = sproutLook(s, now);
      paintSprout(g, { x: s.x, y: s.y, radius: SPROUT_RADIUS, lit: s.lit, look });
      // A lifted sprout is a stone (ObjectsView), with no leaves left showing over it.
      if (!s.stone) crowns.push({ x: s.x, y: s.y, radius: SPROUT_RADIUS, species: look.species });
    }
    this.crowns.render(crowns);
  }

  private drawRings(sprouts: readonly SproutPicture[]): void {
    const g = this.rings.clear();
    for (const s of sprouts) {
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
      this.labels.push(
        this.scene.add
          .text(0, 0, '', textStyle(8))
          .setOrigin(0.5, 0)
          .setDepth(SPROUT_DEPTH + 1),
      );
    }
    // Inside a flower of the layers fewer sprouts show: the names left over are hidden.
    this.labels.forEach((label, i) => {
      const s = sprouts[i];
      label.setVisible(s !== undefined);
      if (s !== undefined) label.setText(s.label).setPosition(s.x, s.y + SPROUT_RADIUS + 1);
    });
  }
}
