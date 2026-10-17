import type Phaser from 'phaser';
import type { Translate } from '@services/i18n';
import { dialogueBox, type DialogueBoxLayout } from '../picture/dialogueBox';
import { portraitOf } from '../picture/portrait';
import { WOOD_DIALOGUE } from '../picture/wood';
import type { SpokenLine } from '../systems/speaker';
import { PALETTE } from './palette';
import { PortraitView } from './PortraitView';
import { textStyle } from './textStyle';
import { WoodFrame } from './WoodFrame';

/** The box's depth: over the garden and the HUD, under the panels of questions and cards. */
const DEPTH = 200;

/**
 * The dialogue box: lines shown one at a time, advancing with a touch, on the wooden box of the
 * pack (`picture/dialogueBox.ts` lays it out), with the speaker's name on its tab and the portrait
 * of a speaker who has one on the left of the page, the text wrapping in the room it leaves. In the
 * greybox most lines are not written yet and show as their id (`‹ch4.1.sauce.01›`), so playtesters
 * see where each line will be spoken. While open, it takes the touches meant for it, not the garden.
 */
export class DialogueView {
  private readonly wood: WoodFrame;
  private readonly name: Phaser.GameObjects.Text;
  private readonly text: Phaser.GameObjects.Text;
  private readonly hint: Phaser.GameObjects.Text;
  private readonly portrait: PortraitView;
  private readonly layouts: Readonly<Record<'plain' | 'portrayed', DialogueBoxLayout>>;
  private queue: SpokenLine[] = [];
  /** Called once when the box closes after the lines it was given with. */
  private onClosed: (() => void) | null = null;
  private shown = false;

  constructor(
    scene: Phaser.Scene,
    private readonly t: Translate,
  ) {
    this.layouts = { plain: dialogueBox(false), portrayed: dialogueBox(true) };
    const { box, tab, text, hint, portrait } = this.layouts.portrayed;
    this.wood = new WoodFrame(scene, WOOD_DIALOGUE, box, DEPTH);
    this.wood.zone
      .setInteractive()
      .on(
        'pointerdown',
        (_: Phaser.Input.Pointer, __: number, ___: number, event: Phaser.Types.Input.EventData) => {
          event.stopPropagation();
          this.advance();
        },
      );
    this.name = scene.add
      .text(tab.x + tab.width / 2, tab.y, '', textStyle(8, PALETTE[WOOD_DIALOGUE.tab.text]))
      .setOrigin(0.5, 0)
      .setDepth(DEPTH + 1);
    this.text = scene.add
      .text(text.x, text.y, '', {
        ...textStyle(8, PALETTE[WOOD_DIALOGUE.text]),
        wordWrap: { width: text.width },
      })
      .setDepth(DEPTH + 1);
    this.hint = scene.add
      .text(hint.x, hint.y, t('dialogue.continue'), textStyle(8, PALETTE.dark))
      .setOrigin(1, 1)
      .setDepth(DEPTH + 1);
    this.portrait = new PortraitView(scene, portrait ?? { x: box.x, y: box.y }, DEPTH + 1);
    this.setVisible(false);
  }

  /** Whether the box is showing a line (and so taking touches). */
  get open(): boolean {
    return this.shown;
  }

  /**
   * Queues lines to show after the current one; `onClosed` runs once the box closes after the last
   * of them (it replaces any earlier callback still pending).
   */
  say(lines: readonly SpokenLine[], onClosed: (() => void) | null = null): void {
    this.queue.push(...lines);
    this.onClosed = onClosed;
    if (!this.open) this.advance();
  }

  private advance(): void {
    const next = this.queue.shift();
    if (next === undefined) {
      this.setVisible(false);
      const closed = this.onClosed;
      this.onClosed = null;
      closed?.();
      return;
    }
    this.setVisible(true);
    this.show(next);
  }

  /** Writes a line beside its speaker's portrait, or across the page for one who has none. */
  private show(line: SpokenLine): void {
    const portrait = portraitOf(line.speaker);
    const { text } = this.layouts[portrait === null ? 'plain' : 'portrayed'];
    this.name.setText(this.t(`speaker.${line.speaker}`));
    this.text.setPosition(text.x, text.y).setWordWrapWidth(text.width).setText(line.text);
    this.portrait.show(portrait);
    this.portrait.speak();
  }

  private setVisible(visible: boolean): void {
    this.shown = visible;
    this.wood.setVisible(visible);
    this.name.setVisible(visible);
    this.text.setVisible(visible);
    this.hint.setVisible(visible);
    if (!visible) this.portrait.clear();
  }
}
