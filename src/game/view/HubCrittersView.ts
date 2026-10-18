import type Phaser from 'phaser';
import type { Rect } from '../picture/boxDistance';
import { firefliesAt } from '../picture/fireflies';
import type { CosmeticHomes } from '../picture/hubCosmeticHomes';
import { critterPose, type CritterId } from '../picture/hubCritters';
import { seedlingFrame } from '../picture/seedlings';
import { signpostGlow } from '../picture/signpostGlow';
import { everyFrame } from './everyFrame';
import { PALETTE } from './palette';

/** The sheet of the plants of the seeds. */
const PLANT_SHEET = 'deco.plant';

/**
 * Over the hub's ground and garden (depth -10 to -8), under everything the player reads or
 * presses (the signposts, the flowers, the titles and the buttons, from depth 0): the glow of the
 * signposts' lanterns lowest, then the plants, the animals and the fireflies.
 */
const LANTERN_DEPTH = -7;
const PLANT_DEPTH = -6;
const CRITTER_DEPTH = -5;
const FIREFLY_DEPTH = -4;

/**
 * The cosmetics of the hub (plan 08, phase 7) in the homes `picture/hubCosmeticHomes.ts` found for
 * them: the animals and the plants of the seeds from their sheets, the fireflies as points of
 * light, and a lantern's small flickering glow lit under each chapter's signpost. They take no
 * touch. Each instant's pose comes from the pure pictures; with `moving` false (the player asked
 * the system for less motion) everything is drawn once, at rest.
 */
export class HubCrittersView {
  private readonly critters: {
    readonly sprite: Phaser.GameObjects.Image;
    readonly id: CritterId;
    readonly home: Rect;
  }[];
  private readonly plants: Phaser.GameObjects.Image[];
  private readonly lights: Phaser.GameObjects.Graphics;
  private readonly glow: Phaser.GameObjects.Graphics;

  constructor(
    scene: Phaser.Scene,
    private readonly homes: CosmeticHomes,
    /** The signposts of the chapters, each lit by a lantern once the lanterns come. */
    private readonly signs: readonly Rect[],
    moving: boolean,
  ) {
    const { textures } = scene;
    this.critters = homes.critters.flatMap(({ id, home }) => {
      const { sheet } = critterPose(id, home, 0);
      if (!textures.exists(sheet)) return [];
      const sprite = scene.add.image(0, 0, sheet, 0).setOrigin(0, 0).setDepth(CRITTER_DEPTH);
      return [{ sprite, home, id }];
    });
    this.plants = textures.exists(PLANT_SHEET)
      ? homes.seedlings.map((spot) =>
          scene.add.image(spot.x, spot.y, PLANT_SHEET, 0).setOrigin(0, 0).setDepth(PLANT_DEPTH),
        )
      : [];
    this.lights = scene.add.graphics().setDepth(FIREFLY_DEPTH);
    // Added onto the ground under it, the glow brightens it as light does instead of veiling it.
    this.glow = scene.add.graphics().setDepth(LANTERN_DEPTH).setBlendMode('ADD');
    this.tick(0);
    if (moving) everyFrame(scene, (now) => this.tick(now));
  }

  /** Moves every cosmetic on to the instant `now`. */
  private tick(now: number): void {
    for (const { sprite, id, home } of this.critters) {
      const pose = critterPose(id, home, now);
      sprite.setPosition(pose.x, pose.y).setFrame(pose.frame).setFlipX(pose.flipX);
    }
    this.plants.forEach((plant, i) => plant.setFrame(seedlingFrame(i, now)));
    const lights = this.lights.clear();
    if (this.homes.fireflies !== null) {
      for (const { x, y, alpha } of firefliesAt(this.homes.fireflies, now)) {
        lights.fillStyle(PALETTE.litGlow, alpha).fillRect(x, y, 1, 1);
      }
    }
    const glow = this.glow.clear();
    if (!this.homes.lanterns) return;
    this.signs.forEach((sign, i) => {
      // Small and faint, inside the signpost's own box: never over the flower nor the title.
      const { x, y, inner, outer } = signpostGlow(sign, now, i);
      glow.fillStyle(PALETTE.litGlow, outer.alpha).fillCircle(x, y, outer.radius);
      glow.fillStyle(PALETTE.lit, inner.alpha).fillCircle(x, y, inner.radius);
    });
  }
}
