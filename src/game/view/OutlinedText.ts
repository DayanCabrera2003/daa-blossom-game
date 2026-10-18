import type Phaser from 'phaser';
import { NAME_OUTLINE } from '../picture/sproutName';
import { css, PALETTE } from './palette';

/**
 * A text with the dark outline of the sprouts' names (`picture/sproutName.ts`): the words written
 * once in the outline's colour at each of the outline's offsets, and the letters over them. Text
 * drawn straight on a backdrop (the HUD's lines, the hub's titles and counter) sits on grass, water
 * or snow of every brightness, so it carries its own dark ground and reads on any of them
 * (`picture/textContrast.ts`). Pixel copies rather than a canvas stroke, which would round the
 * corners and smear them between pixels. It answers what the views ask of a text: its words, its
 * place and size (those of the letters), its origin, depth and visibility.
 */
export class OutlinedText {
  private readonly outline: Phaser.GameObjects.Text[];
  private readonly letters: Phaser.GameObjects.Text;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    text: string,
    style: Phaser.Types.GameObjects.Text.TextStyle,
  ) {
    const dark = { ...style, color: css(PALETTE[NAME_OUTLINE.colour]) };
    this.outline = NAME_OUTLINE.offsets.map((offset) =>
      scene.add.text(x + offset.x, y + offset.y, text, dark),
    );
    this.letters = scene.add.text(x, y, text, style);
  }

  /** Every text it draws, the outline's first: to put them into a container in this order. */
  get parts(): readonly Phaser.GameObjects.Text[] {
    return [...this.outline, this.letters];
  }

  get x(): number {
    return this.letters.x;
  }

  get y(): number {
    return this.letters.y;
  }

  /** The width of the letters, as a plain text's: the outline reaches a pixel past them. */
  get width(): number {
    return this.letters.width;
  }

  get height(): number {
    return this.letters.height;
  }

  /** Each copy of the words, in the outline's then the letters', with its offset from the letters. */
  private each(apply: (text: Phaser.GameObjects.Text, dx: number, dy: number) => void): void {
    this.outline.forEach((copy, i) => {
      const offset = NAME_OUTLINE.offsets[i] ?? { x: 0, y: 0 };
      apply(copy, offset.x, offset.y);
    });
    apply(this.letters, 0, 0);
  }

  setText(text: string): this {
    this.each((copy) => copy.setText(text));
    return this;
  }

  setPosition(x: number, y: number): this {
    this.each((copy, dx, dy) => copy.setPosition(x + dx, y + dy));
    return this;
  }

  setX(x: number): this {
    return this.setPosition(x, this.y);
  }

  setY(y: number): this {
    return this.setPosition(this.x, y);
  }

  setOrigin(x: number, y: number = x): this {
    this.each((copy) => copy.setOrigin(x, y));
    return this;
  }

  setDepth(depth: number): this {
    this.each((copy) => copy.setDepth(depth));
    return this;
  }

  setVisible(visible: boolean): this {
    this.each((copy) => copy.setVisible(visible));
    return this;
  }

  setWordWrapWidth(width: number): this {
    this.each((copy) => copy.setWordWrapWidth(width));
    return this;
  }

  destroy(): void {
    this.each((copy) => copy.destroy());
  }
}
