import type Phaser from 'phaser';
import { CANVAS_WIDTH } from '../scale/integerZoom';
import { Button } from './Button';
import { LAYOUT } from './layout';
import { PALETTE } from './palette';
import { textStyle } from './textStyle';

/** One option as the panel shows it: what choosing it gives, and its text. */
export interface ShownOption {
  readonly value: number;
  readonly label: string;
}

/** What a question panel shows, already translated. */
export interface ShownQuestion {
  readonly prompt: string;
  /** A short instruction under the options ("Toca una respuesta."). */
  readonly footer: string;
  readonly options: readonly ShownOption[];
}

/** Space between buttons, and around the panel's contents, in canvas pixels. */
const GAP = 4;
const PAD = 6;
/** Depths: the blocker over the garden, then the panel, its text and its buttons. */
const BLOCKER_DEPTH = 150;
const PANEL_DEPTH = 250;

/**
 * The panel of a question or a bet (plan 03, phase 4): the prompt, one button per option, and a
 * dim layer over the garden that takes every touch meant for it, so no lantern moves while the
 * question is open. The top bar and the dialogue box stay usable (a hint, going back). Options
 * flow left to right and wrap, so a row of numbers and a column of written answers both fit.
 */
export class QuestionView {
  private parts: { destroy(): void }[] = [];
  private buttons = new Map<number, Button>();

  constructor(private readonly scene: Phaser.Scene) {}

  /** Whether a question is on screen. */
  get open(): boolean {
    return this.parts.length > 0;
  }

  /** Opens the panel; `onAnswer` gets the value of the option the player touches. */
  show(question: ShownQuestion, onAnswer: (value: number) => void): void {
    this.close();
    const { scene } = this;
    const { x, y, width } = LAYOUT.question;
    const blocker = scene.add
      .rectangle(0, LAYOUT.garden.y, CANVAS_WIDTH, LAYOUT.garden.height, PALETTE.fog, 0.3)
      .setOrigin(0, 0)
      .setDepth(BLOCKER_DEPTH)
      .setInteractive();
    const prompt = scene.add
      .text(x + PAD, y + PAD, question.prompt, {
        ...textStyle(8),
        wordWrap: { width: width - 2 * PAD },
      })
      .setDepth(PANEL_DEPTH + 1);
    this.parts.push(blocker, prompt);

    // Buttons flow left to right from under the prompt, wrapping at the panel's edge.
    let bx = x + PAD;
    let by = y + PAD + prompt.height + GAP + 1;
    let rowHeight = 0;
    for (const option of question.options) {
      const button = new Button(scene, 0, 0, option.label, () => onAnswer(option.value));
      button.setDepth(PANEL_DEPTH + 2);
      if (bx > x + PAD && bx + button.width > x + width - PAD) {
        bx = x + PAD;
        by += rowHeight + GAP;
      }
      button.moveTo(bx, by);
      bx += button.width + GAP;
      rowHeight = Math.max(rowHeight, button.height);
      this.buttons.set(option.value, button);
      this.parts.push(button);
    }
    const footer = scene.add
      .text(x + PAD, by + rowHeight + GAP, question.footer, textStyle(8, PALETTE.darkVine))
      .setDepth(PANEL_DEPTH + 1);
    // The panel is drawn last, once its height is known; depth keeps it under its contents.
    const panel = scene.add
      .rectangle(x, y, width, footer.y + footer.height + PAD - y, PALETTE.panel, 0.97)
      .setOrigin(0, 0)
      .setStrokeStyle(1, PALETTE.panelEdge)
      .setDepth(PANEL_DEPTH)
      .setInteractive();
    this.parts.push(footer, panel);
  }

  /** Marks an option as the one the mentor points at (a grade-3 hint). */
  mark(value: number): void {
    this.buttons.get(value)?.setActive(true);
  }

  /** Takes the panel and its blocker away. */
  close(): void {
    for (const part of this.parts) part.destroy();
    this.parts = [];
    this.buttons.clear();
  }
}
