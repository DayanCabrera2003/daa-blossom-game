import type Phaser from 'phaser';
import { playUiSound } from '../audio/uiSound';
import { CANVAS_WIDTH } from '../scale/integerZoom';
import { Button } from './Button';
import { itemAt } from '@core/shared/itemAt';
import { innerWidth, QUESTION_PANEL, questionLayout } from '../picture/panelLayout';
import { WOOD_PANEL } from '../picture/wood';
import { LAYOUT } from './layout';
import { PALETTE } from './palette';
import { textStyle } from './textStyle';
import { WoodFrame } from './WoodFrame';

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

/** Depths: the blocker over the garden, then the panel, its text and its buttons. */
const BLOCKER_DEPTH = 150;
const PANEL_DEPTH = 250;

/**
 * The wooden panel of a question or a bet (plan 03, phase 4; laid out by `picture/panelLayout.ts`): the prompt, one button per option, and a
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

  /**
   * Opens the panel; `onAnswer` gets the value of the option the player touches. A panel opening
   * sounds its wood (plan 06, section 1.8); one already open just shows the new question.
   */
  show(question: ShownQuestion, onAnswer: (value: number) => void): void {
    const reopening = this.open;
    this.clear();
    const { scene } = this;
    if (!reopening) playUiSound(scene, 'sfx.panelOpen');
    const { x, y, width } = QUESTION_PANEL;
    const blocker = scene.add
      .rectangle(0, LAYOUT.garden.y, CANVAS_WIDTH, LAYOUT.garden.height, PALETTE.fog, 0.3)
      .setOrigin(0, 0)
      .setDepth(BLOCKER_DEPTH)
      .setInteractive();
    const ink = PALETTE[WOOD_PANEL.text];
    const prompt = scene.add
      .text(0, 0, question.prompt, {
        ...textStyle(8, ink),
        wordWrap: { width: innerWidth(width) },
      })
      .setDepth(PANEL_DEPTH + 1);
    const buttons = question.options.map((option) => {
      const button = new Button(scene, 0, 0, option.label, () => onAnswer(option.value));
      this.buttons.set(option.value, button.setDepth(PANEL_DEPTH + 2));
      return button;
    });
    // Laid out once every text is measured: the options flow and wrap under the prompt.
    const layout = questionLayout(
      prompt.height,
      buttons.map((button) => button.width),
    );
    prompt.setPosition(layout.prompt.x, layout.prompt.y);
    buttons.forEach((button, i) => {
      const at = itemAt(layout.buttons, i);
      button.moveTo(at.x, at.y + 1);
    });
    const footer = scene.add
      .text(layout.footer.x, layout.footer.y, question.footer, textStyle(8, ink))
      .setDepth(PANEL_DEPTH + 1);
    const panel = new WoodFrame(
      scene,
      WOOD_PANEL,
      { x, y, width, height: layout.height },
      PANEL_DEPTH,
    );
    panel.zone.setInteractive();
    this.parts.push(blocker, prompt, ...buttons, footer, panel);
  }

  /** Marks an option as the one the mentor points at (a grade-3 hint). */
  mark(value: number): void {
    this.buttons.get(value)?.setActive(true);
  }

  /** Takes the panel and its blocker away, sounding its wood if it was open. */
  close(): void {
    if (this.open) playUiSound(this.scene, 'sfx.panelClose');
    this.clear();
  }

  /** Takes the panel and its blocker away, silently. */
  private clear(): void {
    for (const part of this.parts) part.destroy();
    this.parts = [];
    this.buttons.clear();
  }
}
