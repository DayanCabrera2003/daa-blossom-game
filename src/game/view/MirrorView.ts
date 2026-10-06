import type Phaser from 'phaser';
import type { Translate } from '@services/i18n';
import type { Point } from '../input/target';
import type { PondPicture } from '../picture/tangle';
import { CANVAS_WIDTH } from '../scale/integerZoom';
import { SPROUT_RADIUS } from './GardenView';
import { LAYOUT } from './layout';
import { PALETTE } from './palette';
import { textStyle } from './textStyle';

/** How long the pieces take to drift apart, and the reflection to dissolve (milliseconds). */
const SEPARATE_MS = 900;
const DISSOLVE_MS = 1200;

/** Over the garden's vines and under its sprouts while the tangle lies on the garden. */
const ON_GARDEN_DEPTH = 25;
/** Over the whole garden once the pieces drift apart on the water; under questions and the veil. */
const ON_WATER_DEPTH = 36;

/** How far from 0 to 1 a change begun at `since` has gone at `now`, for one that lasts `ms`. */
const progress = (since: number | null, now: number, ms: number): number =>
  since === null ? 0 : Math.min(1, Math.max(0, (now - since) / ms));

/**
 * The reflection in the pond (plan 03, phase 7), in greybox: over the garden, your strands of the
 * tangle in amber, the reflection's in silver, the pairs both light faded out; the strands of the
 * sprout touched to explore above it. When the tangle separates, the garden sinks under the water
 * and each piece, sprouts and all, drifts to where the picture puts it; when you tie, the whole
 * reflection fades away. It paints the picture and times these two changes, nothing more.
 */
export class MirrorView {
  private readonly layer: Phaser.GameObjects.Container;
  private readonly water: Phaser.GameObjects.Rectangle;
  private readonly lines: Phaser.GameObjects.Graphics;
  private readonly labels: Phaser.GameObjects.Text[] = [];
  private readonly degree: Phaser.GameObjects.Text;
  private picture: PondPicture | null = null;
  /** When the pieces began to drift apart, and when the reflection began to dissolve. */
  private separatedAt: number | null = null;
  private dissolvedAt: number | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly t: Translate,
  ) {
    const { y, height } = LAYOUT.garden;
    this.water = scene.add
      .rectangle(0, y, CANVAS_WIDTH, height, PALETTE.water, 0.85)
      .setOrigin(0, 0);
    this.lines = scene.add.graphics();
    this.degree = scene.add.text(0, 0, '', textStyle(8, PALETTE.highlight)).setOrigin(0.5, 1);
    this.layer = scene.add.container(0, 0, [this.water, this.lines, this.degree]);
    this.layer.setVisible(false);
  }

  /** Shows the picture (null hides the reflection); a change of stage starts its animation at `now`. */
  render(picture: PondPicture | null, now: number): void {
    if (picture?.separated !== true) this.separatedAt = null;
    else this.separatedAt ??= now;
    if (picture?.dissolved !== true) this.dissolvedAt = null;
    else this.dissolvedAt ??= now;
    this.picture = picture;
    this.draw(now);
  }

  /** Moves the drift and the dissolve on; called every frame by the scene. */
  update(now: number): void {
    const separating = progress(this.separatedAt, now, SEPARATE_MS) < 1;
    const dissolving = progress(this.dissolvedAt, now, DISSOLVE_MS) < 1;
    if (this.picture !== null && (separating || dissolving)) this.draw(now);
  }

  private draw(now: number): void {
    const { picture } = this;
    const fade = 1 - progress(this.dissolvedAt, now, DISSOLVE_MS);
    if (picture === null || fade === 0) {
      this.layer.setVisible(false);
      return;
    }
    const drift = progress(this.separatedAt, now, SEPARATE_MS);
    // Where a point of piece `piece` stands now: drifting towards its offset as the tangle separates.
    const moved = (point: Point, piece: number | null): Point => {
      const offset = piece === null ? undefined : picture.offsets[piece];
      return offset === undefined
        ? point
        : { x: point.x + offset.x * drift, y: point.y + offset.y * drift };
    };

    this.layer
      .setVisible(true)
      .setAlpha(fade)
      .setDepth(picture.separated ? ON_WATER_DEPTH : ON_GARDEN_DEPTH);
    this.water.setVisible(picture.separated);
    const g = this.lines.clear();
    for (const strand of picture.strands) {
      const a = moved(strand.a, strand.piece);
      const b = moved(strand.b, strand.piece);
      if (strand.side === 'shared') {
        // Lit on both sides: it cancels out, so it is covered and left as a faint trace.
        if (!picture.separated)
          g.lineStyle(4, PALETTE.background, 1).lineBetween(a.x, a.y, b.x, b.y);
        g.lineStyle(1, PALETTE.mirror, 0.25).lineBetween(a.x, a.y, b.x, b.y);
      } else {
        const colour = strand.side === 'yours' ? PALETTE.lit : PALETTE.mirror;
        g.lineStyle(3, colour, 1).lineBetween(a.x, a.y, b.x, b.y);
      }
    }
    this.drawSprouts(picture, moved);
    const { degree } = picture;
    this.degree.setVisible(degree !== null);
    if (degree !== null) {
      const at = moved(degree.at, degree.piece);
      this.degree
        .setText(this.t(degree.text.key, degree.text.params))
        .setPosition(at.x, at.y - SPROUT_RADIUS - 3);
    }
  }

  /** On the water, the sprouts of each piece drift with it; on the garden, the garden's own show. */
  private drawSprouts(
    picture: PondPicture,
    moved: (point: Point, piece: number | null) => Point,
  ): void {
    const shown = picture.separated ? picture.sprouts : [];
    while (this.labels.length < shown.length) {
      const label = this.scene.add.text(0, 0, '', textStyle(8)).setOrigin(0.5, 0);
      this.labels.push(label);
      this.layer.addAt(label, this.layer.length - 1);
    }
    this.labels.forEach((label, i) => label.setVisible(i < shown.length));
    shown.forEach((sprout, i) => {
      const at = moved(sprout.at, sprout.piece);
      this.lines
        .fillStyle(sprout.lit ? PALETTE.lit : PALETTE.dark)
        .fillCircle(at.x, at.y, SPROUT_RADIUS);
      this.labels[i]?.setText(sprout.label).setPosition(at.x, at.y + SPROUT_RADIUS + 1);
    });
  }
}
