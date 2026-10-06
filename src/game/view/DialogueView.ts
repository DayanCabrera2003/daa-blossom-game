import type Phaser from 'phaser';
import { LAYOUT } from './layout';
import { PALETTE } from './palette';
import { textStyle } from './textStyle';

/**
 * The dialogue box: lines shown one at a time, advancing with a touch. In the greybox most lines
 * are not written yet and show as their id (`⟨ch4.1.sauce.01⟩`), so playtesters see where each
 * line will be spoken. While open, it takes the touches meant for it, not the garden.
 */
export class DialogueView {
  private readonly panel: Phaser.GameObjects.Rectangle;
  private readonly text: Phaser.GameObjects.Text;
  private readonly hint: Phaser.GameObjects.Text;
  private queue: string[] = [];

  constructor(scene: Phaser.Scene, continueLabel: string) {
    const { x, y, width, height } = LAYOUT.dialogue;
    this.panel = scene.add
      .rectangle(x, y, width, height, PALETTE.panel, 0.95)
      .setOrigin(0, 0)
      .setStrokeStyle(1, PALETTE.panelEdge)
      .setDepth(200)
      .setInteractive()
      .on(
        'pointerdown',
        (_: Phaser.Input.Pointer, __: number, ___: number, event: Phaser.Types.Input.EventData) => {
          event.stopPropagation();
          this.advance();
        },
      );
    this.text = scene.add
      .text(x + 6, y + 5, '', { ...textStyle(8), wordWrap: { width: width - 12 } })
      .setDepth(201);
    this.hint = scene.add
      .text(x + width - 4, y + height - 3, continueLabel, textStyle(6))
      .setOrigin(1, 1)
      .setDepth(201);
    this.setVisible(false);
  }

  /** Whether the box is showing a line (and so taking touches). */
  get open(): boolean {
    return this.panel.visible;
  }

  /** Queues lines to show after the current one. */
  say(lines: readonly string[]): void {
    this.queue.push(...lines);
    if (!this.open) this.advance();
  }

  private advance(): void {
    const next = this.queue.shift();
    if (next === undefined) {
      this.setVisible(false);
      return;
    }
    this.text.setText(next);
    this.setVisible(true);
  }

  private setVisible(visible: boolean): void {
    this.panel.setVisible(visible);
    this.text.setVisible(visible);
    this.hint.setVisible(visible);
  }
}
