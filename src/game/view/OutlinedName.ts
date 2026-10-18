import type Phaser from 'phaser';
import { NAME_OUTLINE } from '../picture/sproutName';
import { PALETTE } from './palette';
import { textStyle } from './textStyle';

/**
 * A sprout's name with its dark outline (`picture/sproutName.ts`): the name written once in the
 * outline's colour at each of the outline's offsets, and the light letters over them, all centred
 * under the point it is placed at. Pixel copies rather than a canvas stroke, which would round the
 * corners and smear them between pixels.
 */
export class OutlinedName {
  private readonly outline: Phaser.GameObjects.Text[];
  private readonly letters: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, depth: number) {
    const dark = textStyle(8, PALETTE[NAME_OUTLINE.colour]);
    this.outline = NAME_OUTLINE.offsets.map(() =>
      scene.add.text(0, 0, '', dark).setOrigin(0.5, 0).setDepth(depth),
    );
    this.letters = scene.add.text(0, 0, '', textStyle(8)).setOrigin(0.5, 0).setDepth(depth);
  }

  /** Every text it draws, the outline's first: to put them into a container in this order. */
  get parts(): readonly Phaser.GameObjects.Text[] {
    return [...this.outline, this.letters];
  }

  /** Writes `name` with the top middle of its letters at (x, y). */
  show(name: string, x: number, y: number): this {
    this.outline.forEach((copy, i) => {
      const offset = NAME_OUTLINE.offsets[i] ?? { x: 0, y: 0 };
      copy.setText(name).setPosition(x + offset.x, y + offset.y);
    });
    this.letters.setText(name).setPosition(x, y);
    return this;
  }

  setVisible(visible: boolean): this {
    for (const copy of this.outline) copy.setVisible(visible);
    this.letters.setVisible(visible);
    return this;
  }
}
