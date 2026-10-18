import type Phaser from 'phaser';
import type { AssetKey } from '../assets/keys';
import { clearingPixels } from '../picture/fogDither';
import type { GardenPicture } from '../picture/garden';
import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../scale/integerZoom';
import { everyFrame } from './everyFrame';
import { PALETTE } from './palette';
import { fogShift } from '../picture/fogShift';
import { LOOK } from '../picture/look';

/** The clouds of Ninja Adventure, tiled over the veil. */
const CLOUDS: AssetKey = 'fx.fog';
/** The radius of an inspected sprout's clearing once it has opened, and how long it takes. */
const CLEARING_RADIUS = 24;
const OPEN_MS = 600;
/** Clearings are cut from textures made for this many radii, up to the full one. */
const CLEARING_STEPS = 8;
/** How much the clouds show. */
const CLOUD_ALPHA = LOOK.fogCloudAlpha;

/** The key of the clearing texture of step `step` (1 to `CLEARING_STEPS`). */
const clearingKey = (step: number): string => `piece.fogClearing${step}`;

/** The radius of step `step`. */
const radiusOf = (step: number): number => (CLEARING_RADIUS * step) / CLEARING_STEPS;

/** Makes the clearing textures: white where `fogDither` opens the fog, clear elsewhere. */
function makeClearings(textures: Phaser.Textures.TextureManager): void {
  for (let step = 1; step <= CLEARING_STEPS; step++) {
    if (textures.exists(clearingKey(step))) continue;
    const size = 2 * CLEARING_RADIUS + 1;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d');
    if (context === null) return;
    context.fillStyle = '#ffffff';
    for (const { x, y } of clearingPixels(radiusOf(step)))
      context.fillRect(x + CLEARING_RADIUS, y + CLEARING_RADIUS, 1, 1);
    textures.addCanvas(clearingKey(step), canvas);
  }
}

/**
 * Night fog of the greenhouse (chapter 3, GDD §4.1): a veil over the ground of the garden, with
 * the pack's clouds drifting slowly across it, and round each inspected sprout a clearing with a
 * dithered rim (`picture/fogDither.ts`) that opens in a circle when the sprout is inspected. It
 * lies under the vines and sprouts; vines hidden by the fog are simply not drawn by the garden
 * view. The veil is a texture of the logical canvas, so its dither keeps to the pixel grid.
 */
export class FogView {
  private readonly veil: Phaser.GameObjects.RenderTexture;
  private picture: GardenPicture | null = null;
  /** When each sprout's clearing began to open; those revealed in the first picture start open. */
  private openedAt = new Map<number, number>();
  private seen = false;

  /** `still` says whether to hold the clouds still (less motion, plan 09 phase 6). */
  constructor(
    private readonly scene: Phaser.Scene,
    private readonly still: () => boolean = () => false,
  ) {
    makeClearings(scene.textures);
    this.veil = scene.add
      .renderTexture(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
      .setOrigin(0, 0)
      .setDepth(5)
      .setVisible(false);
    everyFrame(scene, (now) => this.draw(now));
  }

  render(picture: GardenPicture): void {
    const now = this.scene.time.now;
    const fog = picture.fog;
    if (fog === null) {
      this.picture = null;
      this.openedAt.clear();
      this.seen = false;
      this.veil.setVisible(false);
      return;
    }
    fog.revealed.forEach((open, vertex) => {
      if (!open) this.openedAt.delete(vertex);
      else if (!this.openedAt.has(vertex)) this.openedAt.set(vertex, this.seen ? now : -OPEN_MS);
    });
    this.seen = true;
    this.picture = picture;
    this.draw(now);
  }

  /** Paints the veil at `now`: the drifting clouds and every clearing as far as it has opened. */
  private draw(now: number): void {
    const { picture } = this;
    if (picture === null) return;
    const rt = this.veil.setVisible(true).clear();
    rt.fill(PALETTE.fog, 0.6);
    if (this.scene.textures.exists(CLOUDS)) {
      const { width, height } = this.scene.textures.get(CLOUDS).getSourceImage();
      const shift = fogShift(now, width, this.still());
      for (let y = 0; y < CANVAS_HEIGHT; y += height)
        for (let x = -shift; x < CANVAS_WIDTH; x += width)
          rt.draw(CLOUDS, Math.round(x), y, CLOUD_ALPHA, PALETTE.fogClear);
    }
    for (const sprout of picture.sprouts) {
      const since = this.openedAt.get(sprout.vertex);
      if (since === undefined) continue;
      const opened = Math.min(1, Math.max(0, (now - since) / OPEN_MS));
      const step = Math.max(1, Math.round(opened * CLEARING_STEPS));
      rt.erase(clearingKey(step), sprout.x - CLEARING_RADIUS, sprout.y - CLEARING_RADIUS);
    }
  }
}
