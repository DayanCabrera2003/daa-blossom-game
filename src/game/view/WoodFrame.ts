import type Phaser from 'phaser';
import type { PixelRect } from '../assets/frames';
import { assetEntry } from '../assets/keys';
import { nineSlice } from '../picture/nineSlice';
import type { WoodPiece } from '../picture/wood';
import { PALETTE } from './palette';

/** What a piece is drawn with: its patches, or the flat panel that stands in. */
type Part = Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle;

/**
 * A wooden piece of the interface (`picture/wood.ts`) stretched over a rectangle as a 9-slice
 * (`picture/nineSlice.ts`), drawn with one plain image per patch so it shows under either renderer.
 * Until its picture has loaded (or if it failed to), a flat panel of the old greybox stands in. It
 * draws, nothing more: a piece that takes touches asks for its `zone`.
 */
export class WoodFrame {
  private parts: Part[] = [];
  private zoneObject: Phaser.GameObjects.Zone | null = null;
  private depth: number;
  private visible = true;

  constructor(
    private readonly scene: Phaser.Scene,
    private piece: WoodPiece,
    private rect: PixelRect,
    depth: number,
    /** The colour of the flat panel that stands in for a picture not loaded. */
    private readonly fallback: number = PALETTE.panel,
  ) {
    this.depth = depth;
    this.draw();
  }

  /** The rectangle the piece covers. */
  get bounds(): PixelRect {
    return this.rect;
  }

  /** An invisible area over the piece that takes touches, made on first use. */
  get zone(): Phaser.GameObjects.Zone {
    if (this.zoneObject === null) {
      this.zoneObject = this.scene.add.zone(0, 0, 1, 1).setOrigin(0, 0);
      this.placeZone();
    }
    return this.zoneObject;
  }

  /** Draws another piece (another look of a button) over the same rectangle. */
  setPiece(piece: WoodPiece): this {
    if (piece !== this.piece) {
      this.piece = piece;
      this.draw();
    }
    return this;
  }

  /** Moves or resizes the piece. */
  setRect(rect: PixelRect): this {
    this.rect = rect;
    this.draw();
    this.placeZone();
    return this;
  }

  setDepth(depth: number): this {
    this.depth = depth;
    for (const part of this.parts) part.setDepth(depth);
    this.zoneObject?.setDepth(depth);
    return this;
  }

  setVisible(visible: boolean): this {
    this.visible = visible;
    for (const part of this.parts) part.setVisible(visible);
    this.zoneObject?.setVisible(visible);
    return this;
  }

  destroy(): void {
    this.clear();
    this.zoneObject?.destroy();
    this.zoneObject = null;
  }

  private placeZone(): void {
    const { x, y, width, height } = this.rect;
    this.zoneObject?.setPosition(x, y).setSize(width, height).setDepth(this.depth);
    // A resized zone keeps its old hit area unless it is told again.
    if (this.zoneObject?.input) this.zoneObject.input.hitArea.setSize(width, height);
  }

  private clear(): void {
    for (const part of this.parts) part.destroy();
    this.parts = [];
  }

  /** Draws the patches of the piece, or the flat panel when its picture is not there. */
  private draw(): void {
    this.clear();
    const { scene, rect, piece } = this;
    const key = piece.texture;
    if (!scene.textures.exists(key)) {
      const flat = scene.add
        .rectangle(rect.x, rect.y, rect.width, rect.height, this.fallback)
        .setOrigin(0, 0)
        .setStrokeStyle(1, PALETTE.panelEdge);
      this.parts = [flat];
    } else {
      const texture = scene.textures.get(key);
      const size = assetEntry(key).image ?? { width: rect.width, height: rect.height };
      this.parts = nineSlice(size, piece.slices, rect).map(({ src, dst }) => {
        // Each patch is a frame of the texture, named by where it is cut, added once.
        const name = `nine:${src.x},${src.y},${src.width},${src.height}`;
        if (!texture.has(name)) texture.add(name, 0, src.x, src.y, src.width, src.height);
        return scene.add
          .image(dst.x, dst.y, key, name)
          .setOrigin(0, 0)
          .setDisplaySize(dst.width, dst.height);
      });
    }
    for (const part of this.parts) {
      part.setDepth(this.depth).setVisible(this.visible);
    }
  }
}
