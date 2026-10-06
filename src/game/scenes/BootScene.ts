import Phaser from 'phaser';
import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../scale/integerZoom';

/**
 * First scene. In the greybox it only proves that the canvas is crisp and correctly scaled: a
 * sprout in the dark and a lit pair, drawn with plain shapes. Later it hands over to the hub.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  create(): void {
    const midY = CANVAS_HEIGHT / 2;
    const midX = CANVAS_WIDTH / 2;
    // A dark sprout (cold blue) and a lit pair (warm amber) joined by a solid vine.
    this.add.circle(midX - 80, midY, 8, 0x4a6fa5);
    this.add.line(0, 0, midX + 20, midY, midX + 80, midY, 0xf2a541).setOrigin(0, 0);
    this.add.circle(midX + 20, midY, 8, 0xf2a541);
    this.add.circle(midX + 80, midY, 8, 0xf2a541);
  }
}
