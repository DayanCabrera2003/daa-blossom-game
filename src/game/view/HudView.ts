import type Phaser from 'phaser';
import type { Translate } from '@services/i18n';
import type { HudPicture } from '../picture/hud';
import { CANVAS_WIDTH } from '../scale/integerZoom';
import { Button } from './Button';
import { LAYOUT } from './layout';
import { textStyle } from './textStyle';

/** What the HUD buttons do; the level scene decides. */
export interface HudActions {
  readonly done: () => void;
  readonly undo: () => void;
  readonly redo: () => void;
  readonly hint: () => void;
  readonly back: () => void;
}

/**
 * The greybox HUD: the goal (or the question, when it is hidden), lanterns lit and water spent on
 * top; "Terminé", undo, redo, hint and back at the bottom right, greyed out when not available.
 */
export class HudView {
  private readonly goal: Phaser.GameObjects.Text;
  private readonly status: Phaser.GameObjects.Text;
  private readonly buttons: Record<'done' | 'undo' | 'redo' | 'hint' | 'back', Button>;

  constructor(
    scene: Phaser.Scene,
    private readonly t: Translate,
    actions: HudActions,
  ) {
    this.goal = scene.add.text(LAYOUT.margin, LAYOUT.topY, '', textStyle()).setDepth(100);
    this.status = scene.add.text(LAYOUT.margin, LAYOUT.secondY, '', textStyle(8)).setDepth(100);
    const order = ['back', 'hint', 'redo', 'undo', 'done'] as const;
    let x = CANVAS_WIDTH - LAYOUT.margin;
    const made: Partial<Record<(typeof order)[number], Button>> = {};
    for (const name of order) {
      const label = t(name === 'done' ? 'hud.done' : `hud.${name}`);
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
  }
}
