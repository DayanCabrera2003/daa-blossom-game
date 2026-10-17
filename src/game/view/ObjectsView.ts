import type Phaser from 'phaser';
import { FRAMES, frameIndex, type FrameName } from '../assets/frames';
import type { AssetKey } from '../assets/keys';
import type { GardenPicture, SproutPicture } from '../picture/garden';
import { SPROUT_RADIUS } from './paintSprout';
import { PALETTE } from './palette';

/** Depths: odd groups under the vines; stones and scarecrows over the sprouts. */
const GROUP_DEPTH = 12;
const OBJECT_DEPTH = 35;

/** The puff of dust of a stone set down: the six frames of the pack's smoke. */
const DUST: AssetKey = 'fx.smoke';
const DUST_ANIMATION = 'piece.dust';
const DUST_FRAMES = 6;
const DUST_FPS = 16;

/** Where a scarecrow stands: beside its sprout, to the right, so the sprout still shows. */
const SCARECROW_SIDE = SPROUT_RADIUS + 5;

/**
 * Keeps one image per piece of a kind on the sprouts that wear it, reusing them from one render to
 * the next and hiding those left over; without the sheet loaded, nothing is shown.
 */
class PiecePool {
  private readonly images: Phaser.GameObjects.Image[] = [];

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly frame: FrameName,
  ) {}

  /** Shows the piece at each of `spots`, its feet at the bottom of the spot's cell. */
  render(spots: readonly { x: number; y: number }[]): void {
    const { sheet } = FRAMES[this.frame];
    const loaded = this.scene.textures.exists(sheet);
    while (loaded && this.images.length < spots.length) {
      const image = this.scene.add.image(0, 0, sheet, frameIndex(this.frame));
      this.images.push(image.setDepth(OBJECT_DEPTH));
    }
    this.images.forEach((image, i) => {
      const spot = spots[i];
      image.setVisible(spot !== undefined);
      if (spot !== undefined) image.setPosition(Math.round(spot.x), Math.round(spot.y));
    });
  }
}

/**
 * What sits on sprouts (plan 06, section 1.4): a lifted sprout turns into the small grey rock of
 * `TilesetNature`, set down with a puff of the pack's dust; a scarecrow, the post of
 * `TilesetElement` with a straw hat and arms drawn on it, stands guard beside its sprout; and,
 * with stones lifted, the outline of each odd group the garden falls into (GDD §4.1, key
 * animation 4). Without the sheets loaded, a grey square and a cross stand in for them.
 */
export class ObjectsView {
  private readonly groups: Phaser.GameObjects.Graphics;
  private readonly drawn: Phaser.GameObjects.Graphics;
  private readonly stones: PiecePool;
  private readonly posts: PiecePool;
  /** The stones painted last, so a new one is set down with dust; null before the first picture. */
  private lifted: Set<number> | null = null;

  constructor(private readonly scene: Phaser.Scene) {
    this.groups = scene.add.graphics().setDepth(GROUP_DEPTH);
    this.stones = new PiecePool(scene, 'stoneSmall');
    this.posts = new PiecePool(scene, 'scarecrowPost');
    this.drawn = scene.add.graphics().setDepth(OBJECT_DEPTH + 1);
    if (scene.textures.exists(DUST) && !scene.anims.exists(DUST_ANIMATION)) {
      scene.anims.create({
        key: DUST_ANIMATION,
        frames: scene.anims.generateFrameNumbers(DUST, { start: 0, end: DUST_FRAMES - 1 }),
        frameRate: DUST_FPS,
      });
    }
  }

  render(picture: GardenPicture): void {
    const groups = this.groups.clear().lineStyle(1, PALETTE.oddGroup);
    for (const outline of picture.oddGroups)
      groups.strokePoints(outline as Phaser.Types.Math.Vector2Like[], true);

    const stones = picture.sprouts.filter((s) => s.stone);
    const scarecrows = picture.sprouts.filter((s) => s.scarecrow);
    this.stones.render(stones);
    this.posts.render(scarecrows.map((s) => ({ x: s.x + SCARECROW_SIDE, y: s.y })));
    const g = this.drawn.clear();
    const textured = (frame: FrameName): boolean => this.scene.textures.exists(FRAMES[frame].sheet);
    if (!textured('stoneSmall')) for (const s of stones) this.plainStone(g, s);
    for (const s of scarecrows) this.scarecrow(g, s, textured('scarecrowPost'));
    this.dust(stones);
  }

  /** A puff of dust on every stone set down since the last picture. */
  private dust(stones: readonly SproutPicture[]): void {
    const now = new Set(stones.map((s) => s.vertex));
    const before = this.lifted;
    this.lifted = now;
    if (before === null || !this.scene.anims.exists(DUST_ANIMATION)) return;
    for (const s of stones) {
      if (before.has(s.vertex)) continue;
      const puff = this.scene.add.sprite(s.x, s.y + 2, DUST).setDepth(OBJECT_DEPTH + 2);
      puff.once('animationcomplete', () => puff.destroy());
      puff.play(DUST_ANIMATION);
    }
  }

  /** A grey square, for when the rock's sheet is not loaded. */
  private plainStone(g: Phaser.GameObjects.Graphics, s: SproutPicture): void {
    const side = 2 * SPROUT_RADIUS;
    g.fillStyle(PALETTE.stone).fillRect(s.x - SPROUT_RADIUS, s.y - SPROUT_RADIUS, side, side);
  }

  /**
   * The parts of a scarecrow drawn on its post: arms of a stick across it with straw at the hands,
   * and a wide straw hat on top. Without the post's sheet, the old cross over the sprout.
   */
  private scarecrow(g: Phaser.GameObjects.Graphics, s: SproutPicture, post: boolean): void {
    if (!post) {
      const r = SPROUT_RADIUS + 2;
      g.lineStyle(2, PALETTE.scarecrow)
        .lineBetween(s.x - r, s.y - r, s.x + r, s.y + r)
        .lineBetween(s.x - r, s.y + r, s.x + r, s.y - r);
      return;
    }
    const x = Math.round(s.x + SCARECROW_SIDE);
    // The top of the post's cell: the pole shows from a few pixels below it down to its foot.
    const top = Math.round(s.y) - 8;
    // The arms: a stick outlined in near-black across the pole, with a tuft of straw at each end.
    g.fillStyle(PALETTE.background).fillRect(x - 8, top + 4, 17, 3);
    g.fillStyle(PALETTE.panel).fillRect(x - 7, top + 5, 15, 1);
    g.fillStyle(PALETTE.sun)
      .fillRect(x - 9, top + 4, 2, 3)
      .fillRect(x + 8, top + 4, 2, 3);
    // The hat on the pole's top: a wide brim and a crown, in the scarecrow's straw.
    g.fillStyle(PALETTE.background)
      .fillRect(x - 6, top - 1, 13, 3)
      .fillRect(x - 3, top - 5, 7, 5);
    g.fillStyle(PALETTE.scarecrow)
      .fillRect(x - 5, top, 11, 1)
      .fillRect(x - 2, top - 4, 5, 4);
    g.fillStyle(PALETTE.panel).fillRect(x - 2, top - 1, 5, 1);
  }
}
