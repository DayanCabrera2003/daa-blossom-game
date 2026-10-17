import type Phaser from 'phaser';
import { BACKDROP } from '../picture/backdrop';
import { multiplyColours } from '../picture/dayTint';
import { driftAt } from '../picture/drift';
import type { Drift, Ornament, OrnamentPart, SheetCut } from '../picture/seasons';
import { TILE } from '../picture/seasons';
import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../scale/integerZoom';
import { PALETTE } from './palette';
import { cutFrame } from './sheetCuts';

/** Under everything else on the screen, the fog of the greenhouse included. */
const BACKDROP_DEPTH = -10;

/** How long each frame of a waving flag or a ripple shows, in milliseconds. */
const ANIMATION_MS = 220;

/** What a backdrop is painted from: its ground tile by tile and its ornaments set down. */
export interface BackdropPaint {
  readonly tiles: readonly SheetCut[];
  readonly ornaments: readonly {
    readonly ornament: Ornament;
    readonly x: number;
    readonly y: number;
  }[];
}

/** An animated piece on screen, with its frames and its own tint. */
interface Moving {
  readonly image: Phaser.GameObjects.Image;
  readonly frames: readonly string[];
  readonly part: OrnamentPart;
  readonly phase: number;
}

/**
 * Paints a backdrop (`picture/backdrop.ts` for a level, `picture/hubGarden.ts` for the hub) under
 * the garden: the ground and the still ornaments once into one texture, the waving flags and the
 * ripples as frames that turn, the leaves and snow where `picture/drift.ts` says, and the candle of
 * the cabin as an untinted light. The whole is drawn faint and multiplied by the tint of its
 * season and hour; nothing in the garden is ever tinted. A sheet that failed to load is left out.
 */
export class BackdropView {
  private readonly still: Phaser.GameObjects.RenderTexture;
  private readonly glows: Phaser.GameObjects.Graphics;
  private moving: Moving[] = [];
  private particles: Phaser.GameObjects.Image[] = [];
  private drift: {
    readonly drift: Drift;
    readonly seed: number;
    readonly frames: string[];
  } | null = null;
  private tinted: number | null = null;

  constructor(private readonly scene: Phaser.Scene) {
    this.still = scene.add
      .renderTexture(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
      .setOrigin(0, 0)
      .setDepth(BACKDROP_DEPTH)
      .setAlpha(BACKDROP.alpha);
    this.glows = scene.add.graphics().setDepth(BACKDROP_DEPTH + 2);
  }

  /** The frame of `cut` in its sheet's texture; null when the sheet did not load. */
  private frameOf(cut: SheetCut): string | null {
    return cutFrame(this.scene.textures, cut);
  }

  /** Paints the ground and the ornaments, replacing whatever was painted before. */
  paint(picture: BackdropPaint): void {
    this.still.clear();
    this.glows.clear();
    for (const { image } of this.moving) image.destroy();
    this.moving = [];
    picture.tiles.forEach((cut, k) => {
      const frame = this.frameOf(cut);
      const [col, row] = [k % BACKDROP.cols, Math.floor(k / BACKDROP.cols)];
      if (frame !== null) this.still.drawFrame(cut.sheet, frame, col * TILE, row * TILE);
    });
    picture.ornaments.forEach(({ ornament, x, y }, k) => {
      for (const part of ornament.parts) this.paintPart(part, x + part.dx, y + part.dy, k);
      const { glow } = ornament;
      if (glow === null) return;
      // The candle's light, in two rings, shining through the tint.
      this.glows
        .fillStyle(PALETTE.litGlow, 0.25)
        .fillCircle(x + glow.x, y + glow.y, glow.radius + 3)
        .fillStyle(PALETTE.litGlow, 0.6)
        .fillCircle(x + glow.x, y + glow.y, glow.radius - 3);
    });
    this.tinted = null;
  }

  /** One piece of an ornament: into the still texture, or as an image whose frames turn. */
  private paintPart(part: OrnamentPart, x: number, y: number, phase: number): void {
    const { cut } = part;
    const frames = Array.from({ length: part.frames }, (_, k) =>
      this.frameOf({ ...cut, x: cut.x + k * cut.width }),
    ).filter((frame): frame is string => frame !== null);
    const first = frames[0];
    if (first === undefined) return;
    if (part.frames === 1) {
      this.still.drawFrame(cut.sheet, first, x, y, part.alpha, part.tint);
      return;
    }
    const image = this.scene.add
      .image(x, y, cut.sheet, first)
      .setOrigin(0, 0)
      .setDepth(BACKDROP_DEPTH + 1)
      .setAlpha(BACKDROP.alpha * part.alpha);
    this.moving.push({ image, frames, part, phase });
  }

  /** Lets `drift` fall across the backdrop, on paths drawn from `seed`; null for none. */
  setDrift(drift: Drift | null, seed: number): void {
    for (const particle of this.particles) particle.destroy();
    this.particles = [];
    this.drift = null;
    if (drift === null || !this.scene.textures.exists(drift.image)) return;
    const frames = Array.from({ length: drift.frames }, (_, k) =>
      this.frameOf({
        sheet: drift.image,
        x: k * drift.width,
        y: 0,
        width: drift.width,
        height: drift.height,
      }),
    ).filter((frame): frame is string => frame !== null);
    this.drift = { drift, seed, frames };
    this.particles = Array.from({ length: drift.count }, () =>
      this.scene.add
        .image(0, 0, drift.image, frames[0])
        .setOrigin(0, 0)
        .setDepth(BACKDROP_DEPTH + 1)
        .setAlpha(BACKDROP.alpha),
    );
    this.tinted = null;
  }

  /** Multiplies the backdrop by `colour` (the season's tint at the sun's hour). */
  tint(colour: number): void {
    if (colour === this.tinted) return;
    this.tinted = colour;
    this.still.setTint(colour);
    for (const { image, part } of this.moving) image.setTint(multiplyColours(colour, part.tint));
    for (const particle of this.particles) particle.setTint(colour);
  }

  /** Turns the frames of what moves and lets the particles drift on. */
  update(time: number): void {
    const step = Math.floor(time / ANIMATION_MS);
    for (const { image, frames, phase } of this.moving) {
      const frame = frames[(step + phase) % frames.length];
      if (frame !== undefined) image.setFrame(frame);
    }
    if (this.drift === null) return;
    const { drift, seed, frames } = this.drift;
    driftAt(drift, seed, time).forEach(({ x, y, frame }, k) => {
      const particle = this.particles[k];
      const name = frames[frame];
      if (particle === undefined || name === undefined) return;
      particle.setPosition(x, y).setFrame(name);
    });
  }
}
