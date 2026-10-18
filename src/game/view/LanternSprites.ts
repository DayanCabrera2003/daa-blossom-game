import type Phaser from 'phaser';
import type { Point } from '../input/target';
import { lanternFlicker } from '../picture/lanternFlicker';
import { PALETTE } from './palette';
import { PIECE_TEXTURES } from './pieceTextures';

/** Which lantern: the player's amber one, or the silvery one of the pond's reflection. */
export type LanternTone = 'amber' | 'silver';

/** The colours of each tone's halo: the inner ring, then the wide pale one. */
const HALO_COLOURS: Readonly<Record<LanternTone, readonly [number, number]>> = {
  amber: [PALETTE.lit, PALETTE.litGlow],
  silver: [PALETTE.moon, PALETTE.mirror],
};

/**
 * The lanterns hung on lit vines (plan 06, section 1.4): the back frame of the pack's paper
 * lantern, recoloured amber (or silver in the pond), at the middle of each vine, over a halo of
 * two tones that flickers in three frames (`picture/lanternFlicker.ts`), each lantern out of step
 * with the others. Sprites are reused between renders; `tick` moves the flicker on. Without the
 * lantern's texture only the halo and a dot of its colour are drawn.
 */
export class LanternSprites {
  private readonly halo: Phaser.GameObjects.Graphics;
  private readonly sprites: Phaser.GameObjects.Image[] = [];
  private spots: readonly Point[] = [];

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly tone: LanternTone,
    /** The depth of the lanterns; their halo goes just under the vines (`haloDepth`). */
    private readonly depth: number,
    haloDepth: number,
    private readonly into: Phaser.GameObjects.Container | null = null,
  ) {
    // Added onto what lies under it, the halo brightens the ground as light does instead of
    // veiling it.
    this.halo = scene.add.graphics().setDepth(haloDepth).setBlendMode('ADD');
    into?.add(this.halo);
  }

  private get texture(): string {
    return this.tone === 'amber' ? PIECE_TEXTURES.amberLantern : PIECE_TEXTURES.silverLantern;
  }

  /** Hangs a lantern at each of `spots` (the middles of the lit vines), at the instant `now`. */
  render(spots: readonly Point[], now: number): void {
    this.spots = spots;
    const textured = this.scene.textures.exists(this.texture);
    while (textured && this.sprites.length < spots.length) {
      const sprite = this.scene.add.image(0, 0, this.texture).setDepth(this.depth);
      this.into?.add(sprite);
      this.sprites.push(sprite);
    }
    this.sprites.forEach((sprite, i) => {
      const spot = spots[i];
      sprite.setVisible(spot !== undefined);
      if (spot !== undefined) sprite.setPosition(Math.round(spot.x), Math.round(spot.y));
    });
    this.tick(now);
  }

  /** Moves the flicker of the halos on to the instant `now`. */
  tick(now: number): void {
    const g = this.halo.clear();
    const [inner, outer] = HALO_COLOURS[this.tone];
    const textured = this.scene.textures.exists(this.texture);
    this.spots.forEach((spot, i) => {
      const { halo } = lanternFlicker(now, i);
      g.fillStyle(outer, halo.outer.alpha).fillCircle(spot.x, spot.y, halo.outer.radius);
      g.fillStyle(inner, halo.inner.alpha).fillCircle(spot.x, spot.y, halo.inner.radius);
      if (!textured) g.fillStyle(inner, 1).fillCircle(spot.x, spot.y, 3);
    });
  }

  /** Hides every lantern. */
  clear(): void {
    this.render([], 0);
  }
}
