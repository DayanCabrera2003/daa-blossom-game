import type Phaser from 'phaser';
import { FRAMES, frameRect } from '../assets/frames';
import type { Point } from '../input/target';
import { PORTRAIT_BOX, type FaceStroke, type Portrait } from '../picture/portrait';
import { PALETTE } from './palette';

/** How high the gnome's portrait hops as he speaks, and how long the hop lasts each way. */
const HOP = { height: 2, duration: 90 };

/** The colour of each stroke of the oak's face: dark eyes and mouth, mossy brows. */
const STROKE_COLOUR: Readonly<Record<FaceStroke['part'], number>> = {
  eye: PALETTE.ink,
  brow: PALETTE.moss,
  mouth: PALETTE.ink,
};

/**
 * The portrait of whoever speaks, in the pack's faceset frame on the left of the dialogue box
 * (plan 06, section 1.3). What it is made of comes from `picture/portrait.ts`; this draws it, and
 * makes the gnome's portrait hop when a line of his starts. A picture not loaded is left out.
 */
export class PortraitView {
  private parts: { destroy(): void }[] = [];
  /** What is drawn inside the frame, which hops. */
  private inside: Phaser.GameObjects.Container | null = null;
  private hops = false;
  /** The portrait shown, to draw it again where its box moves. */
  private shown: Portrait | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    private at: Point,
    private readonly depth: number,
  ) {}

  /** Moves the frame's top-left corner to `at` (the dialogue box dragged), drawing it again there. */
  moveTo(at: Point): void {
    this.at = at;
    this.show(this.shown);
  }

  /** Shows `portrait` in its frame, or nothing for a speaker with none. */
  show(portrait: Portrait | null): void {
    this.clear();
    this.shown = portrait;
    if (portrait === null) return;
    const { scene, at, depth } = this;
    if (scene.textures.exists(PORTRAIT_BOX.texture)) {
      this.parts.push(
        scene.add.image(at.x, at.y, PORTRAIT_BOX.texture).setOrigin(0, 0).setDepth(depth),
      );
    }
    const inner = { x: at.x + PORTRAIT_BOX.inset, y: at.y + PORTRAIT_BOX.inset };
    const inside = scene.add.container(inner.x, inner.y).setDepth(depth + 1);
    // The portrait never spills over its frame, not even as it hops.
    const mask = scene.make
      .graphics({}, false)
      .fillRect(inner.x, inner.y, PORTRAIT_BOX.inner, PORTRAIT_BOX.inner);
    inside.setMask(mask.createGeometryMask());
    this.parts.push(inside, mask);
    this.inside = inside;
    if (portrait.kind === 'faceset') {
      this.hops = portrait.hops;
      if (scene.textures.exists(portrait.texture)) {
        inside.add(scene.add.image(0, 0, portrait.texture).setOrigin(0, 0));
      }
      return;
    }
    this.hops = false;
    // The tree is a frame of its tileset, added to the sheet's texture the first time.
    const key = FRAMES[portrait.tree].sheet;
    if (scene.textures.exists(key)) {
      const rect = frameRect(portrait.tree);
      const name = `portrait:${portrait.tree}`;
      const sheet = scene.textures.get(key);
      if (!sheet.has(name)) sheet.add(name, 0, rect.x, rect.y, rect.width, rect.height);
      inside.add(scene.add.image(portrait.at.x, portrait.at.y, key, name).setOrigin(0, 0));
    }
    const face = scene.add.graphics();
    for (const stroke of portrait.face) {
      face
        .fillStyle(STROKE_COLOUR[stroke.part])
        .fillRect(portrait.at.x + stroke.x, portrait.at.y + stroke.y, stroke.width, stroke.height);
    }
    inside.add(face);
  }

  /** A line of the speaker starts: the gnome hops; everyone else stays still. */
  speak(): void {
    const { inside } = this;
    if (!this.hops || inside === null) return;
    const y = this.at.y + PORTRAIT_BOX.inset;
    this.scene.tweens.killTweensOf(inside);
    inside.y = y;
    this.scene.tweens.add({
      targets: inside,
      y: y - HOP.height,
      duration: HOP.duration,
      yoyo: true,
      ease: 'Quad.easeOut',
    });
  }

  /** Takes the portrait away. */
  clear(): void {
    if (this.inside !== null) this.scene.tweens.killTweensOf(this.inside);
    for (const part of this.parts) part.destroy();
    this.parts = [];
    this.inside = null;
    this.shown = null;
  }
}
