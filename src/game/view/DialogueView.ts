import type Phaser from 'phaser';
import type { Translate } from '@services/i18n';
import { BabblePlayer } from '../audio/BabblePlayer';
import { playUiSound } from '../audio/uiSound';
import { dialogueBox, type DialogueBoxLayout } from '../picture/dialogueBox';
import { portraitOf } from '../picture/portrait';
import { WOOD_DIALOGUE } from '../picture/wood';
import type { VoicedLine } from '../systems/lineVoice';
import type { SpokenLine } from '../systems/speaker';
import { everyFrame } from './everyFrame';
import { addFocusable, coverWith } from './focusables';
import { PALETTE } from './palette';
import { PortraitView } from './PortraitView';
import { textStyle } from './textStyle';
import { WoodFrame } from './WoodFrame';

/** The box's depth: over the garden and the HUD, under the panels of questions and cards. */
const DEPTH = 200;

/** How the box speaks a line: given by the scene (`systems/lineVoice.ts`), as views only draw. */
export type LineVoice = (line: SpokenLine) => VoicedLine;

/** A line being typed: its characters, how it is spoken, and when it started. */
interface Typing {
  readonly chars: readonly string[];
  readonly voiced: VoicedLine;
  readonly start: number;
}

/**
 * The dialogue box: lines shown one at a time, advancing with a touch, on the wooden box of the
 * pack (`picture/dialogueBox.ts` lays it out), with the speaker's name on its tab and the portrait
 * of a speaker who has one on the left of the page, the text wrapping in the room it leaves. In the
 * greybox most lines are not written yet and show as their id (`‹ch4.1.sauce.01›`), so playtesters
 * see where each line will be spoken. While open, it takes the touches meant for it, not the garden,
 * and Enter or Space move it on as a touch does.
 *
 * A line is typed letter by letter at its speaker's pace while he babbles (plan 06, phase 7); the
 * first touch completes the line and silences him, the next one moves on. The text is broken into
 * rows before it is typed, so a word never jumps to the next row halfway through. A screen reader
 * is told each line once, whole, with who says it, as it starts (`sayAloud`), never letter by
 * letter.
 */
export class DialogueView {
  private readonly wood: WoodFrame;
  private readonly name: Phaser.GameObjects.Text;
  private readonly text: Phaser.GameObjects.Text;
  private readonly hint: Phaser.GameObjects.Text;
  private readonly portrait: PortraitView;
  private readonly layouts: Readonly<Record<'plain' | 'portrayed', DialogueBoxLayout>>;
  private readonly babble: BabblePlayer;
  private queue: SpokenLine[] = [];
  /** The line being typed, or null once it is all on the page. */
  private typing: Typing | null = null;
  /** Called once when the box closes after the lines it was given with. */
  private onClosed: (() => void) | null = null;
  private shown = false;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly t: Translate,
    private readonly voice: LineVoice,
    private readonly sayAloud: (line: SpokenLine) => void = () => undefined,
  ) {
    this.layouts = { plain: dialogueBox(false), portrayed: dialogueBox(true) };
    const { box, tab, text, hint, portrait } = this.layouts.portrayed;
    this.wood = new WoodFrame(scene, WOOD_DIALOGUE, box, DEPTH);
    coverWith(this.wood.zone)
      .setInteractive()
      .on(
        'pointerdown',
        (_: Phaser.Input.Pointer, __: number, ___: number, event: Phaser.Types.Input.EventData) => {
          event.stopPropagation();
          this.touch();
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
    this.babble = new BabblePlayer(scene);
    everyFrame(scene, () => this.type());
    this.setVisible(false);
    // The keyboard's focus reaches the box while it is open: Enter does what a touch does.
    addFocusable(scene, {
      box: () => this.wood.bounds,
      depth: () => DEPTH,
      live: () => this.shown,
      press: () => this.touch(),
    });
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

  /**
   * A touch on the box (or Enter, Space): completes the line being typed, or moves on to the next
   * one; nothing while the box is closed.
   */
  touch(): void {
    if (!this.shown) return;
    if (this.typing !== null) {
      this.complete();
      return;
    }
    playUiSound(this.scene, 'sfx.advance');
    this.advance();
  }

  private advance(): void {
    this.babble.stop();
    this.typing = null;
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
    this.text.setPosition(text.x, text.y).setWordWrapWidth(text.width);
    // Typed already broken into rows: a prefix of these rows wraps exactly as the whole line does.
    const rows = this.text.getWrappedText(line.text).join('\n');
    const voiced = this.voice({ ...line, text: rows });
    this.typing = { chars: Array.from(rows), voiced, start: this.scene.time.now };
    this.text.setText('');
    this.hint.setVisible(false);
    this.portrait.show(portrait);
    this.portrait.speak();
    this.babble.play(voiced.syllables);
    this.sayAloud(line);
    this.type();
  }

  /** Every frame while a line is typed: shows the characters that have appeared by now. */
  private type(): void {
    const { typing } = this;
    if (typing === null) return;
    const count = typing.voiced.visibleAt(this.scene.time.now - typing.start);
    this.text.setText(typing.chars.slice(0, count).join(''));
    // The babble has no syllable left after the last letter: it ends on its own.
    if (count === typing.chars.length) this.finish();
  }

  /** The first touch on a line still typing: all of it at once, and the speaker falls silent. */
  private complete(): void {
    const { typing } = this;
    if (typing === null) return;
    this.babble.stop();
    this.text.setText(typing.chars.join(''));
    this.finish();
  }

  /** The line is all on the page: the box waits for a touch to move on. */
  private finish(): void {
    this.typing = null;
    this.hint.setVisible(true);
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
