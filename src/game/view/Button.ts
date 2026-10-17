import type Phaser from 'phaser';
import { playUiSound } from '../audio/uiSound';
import { ICON_GAP, type ButtonIcon } from '../picture/buttonIcon';
import { WOOD_BUTTON, type ButtonState } from '../picture/wood';
import { css, PALETTE } from './palette';
import { textStyle } from './textStyle';
import { WoodFrame } from './WoodFrame';

/**
 * A small button of the HUD and the panels: a label, maybe after an icon, on a wooden button of the
 * pack (`picture/wood.ts`), at rest, in hand or switched off, its letters in the colour that reads
 * on each look. A press clicks, unless the button is switched off.
 */
export class Button {
  private readonly wood: WoodFrame;
  private readonly text: Phaser.GameObjects.Text;
  private readonly icon: Phaser.GameObjects.Image | null;
  private enabled = true;
  private active = false;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    label: string,
    onPress: () => void,
    icon: ButtonIcon | null = null,
  ) {
    this.icon =
      icon !== null && scene.textures.exists(icon.texture)
        ? scene.add.image(0, 0, icon.texture).setOrigin(0, 0).setScale(icon.scale).setDepth(101)
        : null;
    this.text = scene.add.text(0, 0, label, textStyle()).setOrigin(0, 0).setDepth(101);
    const iconRoom = this.icon === null ? 0 : this.icon.displayWidth + ICON_GAP;
    this.wood = new WoodFrame(
      scene,
      WOOD_BUTTON.idle,
      { x: x - 2, y: y - 1, width: iconRoom + this.text.width + 4, height: this.text.height + 2 },
      100,
      PALETTE.button,
    );
    this.wood.zone
      .setInteractive({ useHandCursor: true })
      .on(
        'pointerdown',
        (_: Phaser.Input.Pointer, __: number, ___: number, event: Phaser.Types.Input.EventData) => {
          event.stopPropagation();
          if (!this.enabled) return;
          playUiSound(scene, 'sfx.button');
          onPress();
        },
      );
    this.moveTo(x, y);
    this.restyle();
  }

  /** Width on the canvas, to lay buttons out side by side. */
  get width(): number {
    return this.wood.bounds.width;
  }

  /** Height on the canvas, to lay rows of buttons out. */
  get height(): number {
    return this.wood.bounds.height;
  }

  /** Moves the button so that its panel's top-left corner is at (x, y). */
  moveTo(x: number, y: number): this {
    const { width, height } = this.wood.bounds;
    this.wood.setRect({ x, y: y - 1, width, height });
    // The icon is centred on the button's height, the label after it.
    let left = x + 2;
    if (this.icon !== null) {
      this.icon.setPosition(left, Math.round(y - 1 + (height - this.icon.displayHeight) / 2));
      left += this.icon.displayWidth + ICON_GAP;
    }
    this.text.setPosition(left, y);
    return this;
  }

  /** Puts the button above other layers (panels drawn on top of the HUD). */
  setDepth(depth: number): this {
    this.wood.setDepth(depth);
    this.icon?.setDepth(depth + 1);
    this.text.setDepth(depth + 1);
    return this;
  }

  /** Switches the button off when its action is not available now. */
  setEnabled(enabled: boolean): this {
    this.enabled = enabled;
    return this.restyle();
  }

  /** Marks the button as the one in use (the tool in hand). */
  setActive(active: boolean): this {
    this.active = active;
    return this.restyle();
  }

  setVisible(visible: boolean): this {
    this.wood.setVisible(visible);
    this.icon?.setVisible(visible);
    this.text.setVisible(visible);
    return this;
  }

  destroy(): void {
    this.wood.destroy();
    this.icon?.destroy();
    this.text.destroy();
  }

  /** The look of the button now: off before in hand, in hand before at rest. */
  private get state(): ButtonState {
    if (!this.enabled) return 'off';
    return this.active ? 'active' : 'idle';
  }

  /** Draws the wood of the button's look and writes its label in the colour that reads on it. */
  private restyle(): this {
    const piece = WOOD_BUTTON[this.state];
    this.wood.setPiece(piece);
    this.text.setColor(css(PALETTE[piece.text]));
    this.icon?.setAlpha(this.enabled ? 1 : 0.5);
    return this;
  }
}
