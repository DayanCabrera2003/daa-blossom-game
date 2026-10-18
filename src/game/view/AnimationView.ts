import type Phaser from 'phaser';
import type { VertexId } from '@core/graph/types';
import { itemAt } from '@core/shared/itemAt';
import { chainLandings, type ChainLanding } from '../animation/landings';
import { stepAt, totalDuration, type AnimationStep } from '../animation/plan';
import type { AssetKey } from '../assets/keys';
import type { Point } from '../input/target';
import type { AnimationGarden } from '../picture/animationGarden';
import { BURST_MS, burstAt } from '../picture/burst';
import { conflictBlink } from '../picture/conflictBlink';
import { foldFrameAt, foldFrames, unfoldFrames } from '../picture/foldFrames';
import { closingPetals } from '../picture/petals';
import { hopPose } from '../picture/squash';
import { groupsApart } from '../picture/stoneSplit';
import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../scale/integerZoom';
import { paintFlower } from './paintFlower';
import { SPROUT_RADIUS } from './paintSprout';
import { PALETTE } from './palette';
import { PIECE_TEXTURES } from './pieceTextures';

/** Over the garden and its pieces: the overlay, then the hopping lantern, then the bursts. */
const OVERLAY_DEPTH = 60;
const LANTERN_DEPTH = 61;
const BURST_DEPTH = 62;

/** The pack's sprites a burst is made of. */
const SPARK: AssetKey = 'fx.spark';
const PETAL: AssetKey = 'fx.leafPink';

/** Where the hopping lantern's feet rest on a sprout: on top of its head. */
const LANTERN_FEET = SPROUT_RADIUS - 1;

/** A garden with nothing to draw on, before the first plan. */
const NO_GARDEN: AnimationGarden = { positions: [], flowers: new Map(), groups: [] };

/**
 * Plays an animation plan over the garden, which already shows the final state: the view only
 * catches up (the logic is instant). Each frame asks `stepAt` which step is playing and how far,
 * and the pure pictures what it looks like then (GDD §4.1, key animations): the lantern hops from
 * sprout to sprout with squash and stretch, and where a chain lands its new lantern bursts into a
 * sparkle and pink petals; a flower folds and opens in eight frames; the conflict of sun and moon
 * blinks; a stone set down parts the garden into its groups. A new move by the player stops it all
 * at once. Without the pack's sprites, plain shapes stand in for them.
 */
export class AnimationView {
  private readonly overlay: Phaser.GameObjects.Graphics;
  private lantern: Phaser.GameObjects.Image | null = null;
  private readonly sparks: Phaser.GameObjects.Image[] = [];
  private readonly petals: Phaser.GameObjects.Image[] = [];
  private steps: readonly AnimationStep[] = [];
  private landings: readonly ChainLanding[] = [];
  private garden: AnimationGarden = NO_GARDEN;
  private startedAt = 0;

  constructor(private readonly scene: Phaser.Scene) {
    this.overlay = scene.add.graphics().setDepth(OVERLAY_DEPTH);
  }

  /** Whether a plan, or the burst at its end, is still playing. */
  get playing(): boolean {
    return this.steps.length > 0 || this.landings.length > 0;
  }

  play(steps: readonly AnimationStep[], garden: AnimationGarden, now: number): void {
    this.steps = totalDuration(steps) > 0 ? steps : [];
    this.landings = chainLandings(this.steps);
    this.garden = garden;
    this.startedAt = now;
  }

  /** Skips to the end: the garden view already shows it. */
  finish(): void {
    this.steps = [];
    this.landings = [];
    this.overlay.clear();
    this.hideSprites();
  }

  update(now: number): void {
    const g = this.overlay.clear();
    this.hideSprites();
    const elapsed = now - this.startedAt;
    this.bursts(g, elapsed);
    const at = stepAt(this.steps, elapsed);
    if (at === null) {
      this.steps = [];
      return;
    }
    this.step(g, itemAt(this.steps, at.index), at.progress);
  }

  private at(v: VertexId): Point {
    return itemAt(this.garden.positions, v);
  }

  /** The step playing, `progress` (0 to 1) of the way through it. */
  private step(g: Phaser.GameObjects.Graphics, step: AnimationStep, progress: number): void {
    const p = (v: VertexId): Point => this.at(v);
    const pulse = 1 - progress;
    switch (step.kind) {
      case 'hop':
        this.hop(g, p(step.from), p(step.to), progress);
        break;
      case 'light':
      case 'putOut':
        g.lineStyle(3, PALETTE.litGlow, pulse).lineBetween(
          p(step.u).x,
          p(step.u).y,
          p(step.v).x,
          p(step.v).y,
        );
        break;
      case 'conflict': {
        // Sun and moon by turns, on the vine and on both its sprouts: a question, not an error.
        const blink = conflictBlink(progress);
        const colour = blink.tone === 'sun' ? PALETTE.sun : PALETTE.moon;
        const [u, v] = [p(step.u), p(step.v)];
        g.lineStyle(3, colour, blink.alpha).lineBetween(u.x, u.y, v.x, v.y);
        g.lineStyle(2, colour, blink.alpha)
          .strokeCircle(u.x, u.y, SPROUT_RADIUS + 3)
          .strokeCircle(v.x, v.y, SPROUT_RADIUS + 3);
        break;
      }
      case 'place':
        if (step.object === 'stone' && step.placed) {
          // The stone falls in the garden's own view; here the garden parts round it.
          this.groupsApart(g, progress * step.duration, step.duration);
          break;
        }
        this.ring(g, p(step.vertex), progress);
        break;
      case 'mark':
      case 'reveal':
        this.ring(g, p(step.vertex), progress);
        break;
      case 'chain':
        g.lineStyle(3, PALETTE.chainGain, pulse).strokePoints(
          step.path.map(p) as Phaser.Types.Math.Vector2Like[],
          false,
        );
        break;
      case 'fold':
      case 'unfold':
        this.fold(g, step.kind, step.blossom, progress);
        break;
      case 'clear':
        this.wash(g, PALETTE.background, pulse);
        break;
    }
  }

  /** A ring spreading out of a sprout: a mark, an inspection, a piece set down or taken off. */
  private ring(g: Phaser.GameObjects.Graphics, c: Point, progress: number): void {
    g.lineStyle(1, PALETTE.highlight, 1 - progress).strokeCircle(
      c.x,
      c.y,
      SPROUT_RADIUS + 2 + 10 * progress,
    );
  }

  /** A faint wash over the whole garden, fading as the step ends. */
  private wash(g: Phaser.GameObjects.Graphics, colour: number, strength: number): void {
    g.fillStyle(colour, 0.25 * strength).fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }

  /** The lantern on its hop from `from` to `to`, squashed and stretched (`picture/squash.ts`). */
  private hop(g: Phaser.GameObjects.Graphics, from: Point, to: Point, progress: number): void {
    const pose = hopPose(from, to, progress);
    const feet = { x: pose.x, y: pose.y - LANTERN_FEET - pose.height };
    // Its glow stays on the ground under it.
    g.fillStyle(PALETTE.litGlow, 0.35).fillCircle(pose.x, pose.y, 5);
    const lantern = this.lanternImage();
    if (lantern === null) {
      g.fillStyle(PALETTE.lit).fillEllipse(
        feet.x,
        feet.y - 4 * pose.scaleY,
        8 * pose.scaleX,
        8 * pose.scaleY,
      );
      return;
    }
    lantern
      .setPosition(Math.round(feet.x), Math.round(feet.y))
      .setScale(pose.scaleX, pose.scaleY)
      .setVisible(true);
  }

  /** The hopping lantern's image, made the first time its texture is there; null without it. */
  private lanternImage(): Phaser.GameObjects.Image | null {
    if (this.lantern === null && this.scene.textures.exists(PIECE_TEXTURES.amberLantern)) {
      this.lantern = this.scene.add
        .image(0, 0, PIECE_TEXTURES.amberLantern)
        .setOrigin(0.5, 1)
        .setDepth(LANTERN_DEPTH);
    }
    return this.lantern;
  }

  /**
   * A flower folding or opening in its eight frames (`picture/foldFrames.ts`): the sprouts of its
   * cycle drift to its middle as its petals close down onto it, or the other way round. A flower
   * whose shape is unknown just washes the garden in its pink.
   */
  private fold(
    g: Phaser.GameObjects.Graphics,
    kind: 'fold' | 'unfold',
    blossom: number,
    progress: number,
  ): void {
    const shape = this.garden.flowers.get(blossom);
    if (shape === undefined) {
      this.wash(g, PALETTE.flower, 1 - progress);
      return;
    }
    const frames = (kind === 'fold' ? foldFrames : unfoldFrames)(shape.open, shape.centre);
    const frame = foldFrameAt(frames, progress);
    g.fillStyle(PALETTE.flower, 0.8 * (1 - frame.closed));
    for (const sprout of frame.positions)
      g.fillCircle(sprout.x, sprout.y, SPROUT_RADIUS * (1 - 0.5 * frame.closed));
    const petals = closingPetals(shape.centre, shape.open, frame.closed);
    paintFlower(g, shape.centre, petals, null, 0.35 + 0.5 * frame.closed);
  }

  /** The odd groups parting for a moment round a stone just set down (`picture/stoneSplit.ts`). */
  private groupsApart(g: Phaser.GameObjects.Graphics, elapsed: number, duration: number): void {
    for (const group of groupsApart(this.garden.groups, elapsed, duration)) {
      g.lineStyle(2, PALETTE.oddGroup, group.alpha).strokePoints(
        group.outline as Phaser.Types.Math.Vector2Like[],
        true,
      );
    }
  }

  /**
   * The bursts of the chains landed so far (`picture/burst.ts`): the spark over each new lantern,
   * at the middle of its vine, and its pink petals; they outlive the plan by a little.
   */
  private bursts(g: Phaser.GameObjects.Graphics, elapsed: number): void {
    if (this.landings.every((landing) => elapsed - landing.at >= BURST_MS)) {
      this.landings = [];
      return;
    }
    let sparks = 0;
    let petals = 0;
    for (const landing of this.landings) {
      const [u, v] = [this.at(landing.u), this.at(landing.v)];
      const middle = { x: (u.x + v.x) / 2, y: (u.y + v.y) / 2 };
      const burst = burstAt(middle, elapsed - landing.at, landing.u * 31 + landing.v);
      if (burst === null) continue;
      for (const petal of burst.petals) {
        const image = this.pooled(this.petals, petals++, PETAL);
        if (image === null)
          g.fillStyle(PALETTE.flower, petal.alpha).fillRect(petal.x, petal.y, 2, 2);
        else image.setFrame(petal.frame).setPosition(petal.x, petal.y).setAlpha(petal.alpha);
      }
      if (burst.spark === null) continue;
      const image = this.pooled(this.sparks, sparks++, SPARK);
      if (image === null) g.fillStyle(PALETTE.litGlow).fillCircle(middle.x, middle.y, 4);
      else image.setFrame(burst.spark).setPosition(middle.x, middle.y - 4);
    }
  }

  /** The `index`th image of `pool`, shown and made if need be; null without its sprite loaded. */
  private pooled(
    pool: Phaser.GameObjects.Image[],
    index: number,
    key: AssetKey,
  ): Phaser.GameObjects.Image | null {
    if (!this.scene.textures.exists(key)) return null;
    while (pool.length <= index)
      pool.push(this.scene.add.image(0, 0, key, 0).setDepth(BURST_DEPTH).setVisible(false));
    return itemAt(pool, index).setVisible(true);
  }

  /** Hides the lantern and the bursts; each frame shows again what is still playing. */
  private hideSprites(): void {
    this.lantern?.setVisible(false);
    for (const image of [...this.sparks, ...this.petals]) image.setVisible(false);
  }
}
