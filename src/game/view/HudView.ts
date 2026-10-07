import type Phaser from 'phaser';
import type { Translate } from '@services/i18n';
import type { HudPicture } from '../picture/hud';
import { CANVAS_WIDTH } from '../scale/integerZoom';
import { Button } from './Button';
import { LAYOUT } from './layout';
import { PALETTE } from './palette';
import { textStyle } from './textStyle';

/** What the HUD buttons do; the level scene decides. */
export interface HudActions {
  readonly done: () => void;
  readonly undo: () => void;
  readonly redo: () => void;
  readonly hint: () => void;
  readonly back: () => void;
  /** Opens again the mechanic cards of what the level has open ("?"). */
  readonly help: () => void;
  /** Checks the reflection drawn in the mirror challenge. */
  readonly checkMirror: () => void;
}

/**
 * The greybox HUD: the goal (or the question, when it is hidden), lanterns lit and water spent on
 * top; "Terminé", undo, redo, hint, "?" (the mechanic cards again) and back at the bottom right,
 * greyed out when not available, and "Comprobar" beside them in the mirror challenge.
 */
export class HudView {
  private readonly goal: Phaser.GameObjects.Text;
  private readonly status: Phaser.GameObjects.Text;
  /** What a waiting script step expects (drag the sun, touch a sprout…), centred under the goal. */
  private readonly prompt: Phaser.GameObjects.Text;
  private readonly buttons: Record<
    'done' | 'undo' | 'redo' | 'hint' | 'help' | 'back' | 'checkMirror',
    Button
  >;

  constructor(
    scene: Phaser.Scene,
    private readonly t: Translate,
    actions: HudActions,
  ) {
    this.goal = scene.add.text(LAYOUT.margin, LAYOUT.topY, '', textStyle()).setDepth(100);
    this.status = scene.add.text(LAYOUT.margin, LAYOUT.secondY, '', textStyle(8)).setDepth(100);
    this.prompt = scene.add
      .text(CANVAS_WIDTH / 2, LAYOUT.secondY, '', textStyle(8, PALETTE.sun))
      .setOrigin(0.5, 0)
      .setDepth(100);
    const order = ['back', 'help', 'hint', 'redo', 'undo', 'done', 'checkMirror'] as const;
    let x = CANVAS_WIDTH - LAYOUT.margin;
    const made: Partial<Record<(typeof order)[number], Button>> = {};
    for (const name of order) {
      const label = t(`hud.${name}`);
      const button = new Button(scene, 0, LAYOUT.bottomY, label, actions[name]);
      x -= button.width + 3;
      made[name] = button.moveTo(x, LAYOUT.bottomY);
    }
    this.buttons = made as Record<(typeof order)[number], Button>;
  }

  render(hud: HudPicture): void {
    this.goal.setText(this.t(hud.goal.key, hud.goal.params));
    const lanterns = this.t('hud.lanterns', { count: hud.lanterns });
    const water =
      hud.water === null
        ? ''
        : hud.water.budget === null
          ? this.t('hud.waterNoBudget', { used: hud.water.used })
          : this.t('hud.water', { used: hud.water.used, budget: hud.water.budget });
    this.status.setText(water === '' ? lanterns : `${lanterns}   ${water}`);
    this.buttons.undo.setEnabled(hud.canUndo);
    this.buttons.redo.setEnabled(hud.canRedo);
    this.buttons.hint.setEnabled(hud.hintAvailable);
    this.buttons.done.setVisible(hud.canDeclareDone);
    this.buttons.checkMirror.setVisible(hud.canCheckMirror);
    this.prompt.setText(hud.prompt === null ? '' : this.t(hud.prompt.key, hud.prompt.params));
  }
}
