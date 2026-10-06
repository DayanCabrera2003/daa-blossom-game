import type Phaser from 'phaser';
import { CANVAS_WIDTH } from '../scale/integerZoom';
import { LAYOUT } from './layout';
import { PALETTE } from './palette';
import { textStyle } from './textStyle';

/** Under the question panel and its blocker, over the garden and its marks. */
const VEIL_DEPTH = 140;

/**
 * The veil of a bet with a preview (plan 03, phase 4; 1.6): once the garden has been shown for a
 * moment, it is covered while the player bets, so the bet is a guess from memory, and uncovered as
 * soon as the bet is made. The bars above and below stay in view.
 */
export class VeilView {
  private readonly cloth: Phaser.GameObjects.Rectangle;
  private readonly text: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    const { y, height } = LAYOUT.garden;
    this.cloth = scene.add
      .rectangle(0, y, CANVAS_WIDTH, height, PALETTE.fog, 1)
      .setOrigin(0, 0)
      .setDepth(VEIL_DEPTH);
    this.text = scene.add
      .text(CANVAS_WIDTH / 2, y + height - 60, '', textStyle(8, PALETTE.darkVine))
      .setOrigin(0.5, 0.5)
      .setDepth(VEIL_DEPTH + 1);
    this.uncover();
  }

  /** Covers the garden, with a short line on the veil. */
  cover(line: string): void {
    this.text.setText(line);
    this.cloth.setVisible(true);
    this.text.setVisible(true);
  }

  /** Shows the garden again. */
  uncover(): void {
    this.cloth.setVisible(false);
    this.text.setVisible(false);
  }
}
