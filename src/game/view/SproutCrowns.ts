import type Phaser from 'phaser';
import { FRAMES, frameIndex } from '../assets/frames';
import type { SproutSpecies } from '../picture/sproutLook';

/** What crowns one sprout: where its body is, how big, and which species it is. */
export interface Crown {
  readonly x: number;
  readonly y: number;
  readonly radius: number;
  readonly species: SproutSpecies;
}

/**
 * The sprites on top of the sprouts' bodies (plan 06, section 1.4): the two-leaf sprout of
 * `TilesetFloorDetail` on a sprout, its stem sunk into the top of the body, and the petals of the
 * first frame of the animated flower on a chapter 3 flower. A bee has wings, drawn with its body,
 * so it wears no sprite. The images are kept and reused from one render to the next; those left
 * over are hidden. Without the sheets loaded nothing is shown.
 */
export class SproutCrowns {
  private readonly images: Phaser.GameObjects.Image[] = [];

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly depth: number,
    /** A container the images go into (the pond's layer), or null for the scene itself. */
    private readonly into: Phaser.GameObjects.Container | null = null,
  ) {}

  /** Shows the crowns of `crowns`, and hides the images left over. */
  render(crowns: readonly Crown[], alpha = 1): void {
    let used = 0;
    for (const crown of crowns) {
      const image = this.place(crown, used);
      if (image === null) continue;
      image.setAlpha(alpha);
      used++;
    }
    this.images.forEach((image, i) => image.setVisible(i < used));
  }

  /** Places image number `i` on `crown`, making it if needed; null when nothing crowns it. */
  private place(crown: Crown, i: number): Phaser.GameObjects.Image | null {
    const name =
      crown.species === 'sprout'
        ? 'sproutLeaves'
        : crown.species === 'flower'
          ? 'flowerHead'
          : null;
    if (name === null) return null;
    const { sheet } = FRAMES[name];
    if (!this.scene.textures.exists(sheet)) return null;
    let image = this.images[i];
    if (image === undefined) {
      image = this.scene.add.image(0, 0, sheet).setDepth(this.depth);
      this.into?.add(image);
      this.images.push(image);
    }
    image.setTexture(sheet, frameIndex(name)).setVisible(true);
    if (name === 'sproutLeaves') {
      // The stem's foot (row 12 of the 16 × 16 tile) sinks 5 pixels into the top of the body.
      image.setOrigin(0.5, 13 / 16).setPosition(crown.x, crown.y - crown.radius + 5);
    } else {
      // The petals sit on the diamond's top corner.
      image.setOrigin(0.5, 0.75).setPosition(crown.x, crown.y - crown.radius);
    }
    return image;
  }

  destroy(): void {
    for (const image of this.images) image.destroy();
    this.images.length = 0;
  }
}
