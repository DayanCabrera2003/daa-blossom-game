import Phaser from 'phaser';
import { PALETTE } from './palette';
import { textStyle } from './textStyle';

/** A small text button of the greybox HUD: a label on a panel, active, idle or switched off. */
export class Button {
  private readonly panel: Phaser.GameObjects.Rectangle;
  private readonly text: Phaser.GameObjects.Text;
  private enabled = true;

  constructor(scene: Phaser.Scene, x: number, y: number, label: string, onPress: () => void) {
    this.text = scene.add.text(x, y, label, textStyle()).setOrigin(0, 0).setDepth(101);
    this.panel = scene.add
      .rectangle(x - 2, y - 1, this.text.width + 4, this.text.height + 2, PALETTE.button)
      .setOrigin(0, 0)
      .setStrokeStyle(1, PALETTE.panelEdge)
      .setDepth(100)
      .setInteractive({ useHandCursor: true })
      .on(
        'pointerdown',
        (_: Phaser.Input.Pointer, __: number, ___: number, event: Phaser.Types.Input.EventData) => {
          event.stopPropagation();
          if (this.enabled) onPress();
        },
      );
  }

  /** Width on the canvas, to lay buttons out side by side. */
  get width(): number {
    return this.panel.width;
  }

  /** Moves the button so that its panel's top-left corner is at (x, y). */
  moveTo(x: number, y: number): this {
    this.panel.setPosition(x, y - 1);
    this.text.setPosition(x + 2, y);
    return this;
  }

  /** Greys the button out when its action is not available now. */
  setEnabled(enabled: boolean): this {
    this.enabled = enabled;
    this.panel.setFillStyle(enabled ? PALETTE.button : PALETTE.buttonOff);
    this.text.setAlpha(enabled ? 1 : 0.4);
    return this;
  }

  /** Marks the button as the one in use (the tool in hand). */
  setActive(active: boolean): this {
    this.panel.setFillStyle(active ? PALETTE.buttonActive : PALETTE.button);
    return this;
  }

  setVisible(visible: boolean): this {
    this.panel.setVisible(visible);
    this.text.setVisible(visible);
    return this;
  }

  destroy(): void {
    this.panel.destroy();
    this.text.destroy();
  }
}
