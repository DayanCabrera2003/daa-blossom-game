import type Phaser from 'phaser';
import { OutlinedText } from './OutlinedText';
import { textStyle } from './textStyle';

/**
 * A sprout's name with its dark outline (`picture/sproutName.ts`, drawn by `OutlinedText`), centred
 * under the point it is placed at.
 */
export class OutlinedName {
  private readonly text: OutlinedText;

  constructor(scene: Phaser.Scene, depth: number) {
    this.text = new OutlinedText(scene, 0, 0, '', textStyle(8)).setOrigin(0.5, 0).setDepth(depth);
  }

  /** Every text it draws, the outline's first: to put them into a container in this order. */
  get parts(): readonly Phaser.GameObjects.Text[] {
    return this.text.parts;
  }

  /** Writes `name` with the top middle of its letters at (x, y). */
  show(name: string, x: number, y: number): this {
    this.text.setText(name).setPosition(x, y);
    return this;
  }

  setVisible(visible: boolean): this {
    this.text.setVisible(visible);
    return this;
  }
}
