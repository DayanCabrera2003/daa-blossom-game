import type Phaser from 'phaser';
import { itemAt } from '@core/shared/itemAt';
import { GENERATORS, type GeneratorId } from '@levels/sandbox/generators';
import type { Translate } from '@services/i18n';
import { generateDrawer } from '../../picture/generateDrawer';
import { WOOD_PANEL } from '../../picture/wood';
import { canGrow, canReseed, canShrink, type GenerateChoice } from '../../systems/generateChoice';
import { Button } from '../../view/Button';
import { PALETTE } from '../../view/palette';
import { textStyle } from '../../view/textStyle';
import { WoodFrame } from '../../view/WoodFrame';
import { coverWith } from '../../view/focusables';

/** Over the garden and the editor's bar, under the toast. */
const DRAWER_DEPTH = 120;

/** What the menu's buttons ask the editor for. */
export interface GenerateMenuActions {
  readonly pick: (id: GeneratorId) => void;
  readonly resize: (step: -1 | 1) => void;
  readonly another: () => void;
  readonly done: () => void;
}

/**
 * The free mode's generate menu (plan 08, section 1.3): a wooden drawer across the bottom, over
 * the editor's bar, laid out by `picture/generateDrawer.ts`. A button for each generator (the one
 * picked sunken), "−", the size and "+", "Otro al azar" for the random ones, and "Listo". Each
 * press goes to the editor, which grows the garden at once above the drawer; what each button
 * offers comes from `systems/generateChoice.ts`.
 */
export class GenerateMenu {
  private readonly parts: { setVisible(visible: boolean): unknown }[] = [];
  private readonly generators: readonly Button[];
  private readonly smaller: Button;
  private readonly larger: Button;
  private readonly another: Button;
  private readonly size: Phaser.GameObjects.Text;
  private shown = false;
  private readonly panelTop: number;

  constructor(
    scene: Phaser.Scene,
    private readonly t: Translate,
    actions: GenerateMenuActions,
  ) {
    const button = (key: string, onPress: () => void): Button =>
      new Button(scene, 0, 0, t(key), onPress).setDepth(DRAWER_DEPTH + 1);
    this.generators = GENERATORS.map((generator) =>
      button(generator.textKey, () => actions.pick(generator.id)),
    );
    this.smaller = button('sandbox.gen.smaller', () => actions.resize(-1));
    this.larger = button('sandbox.gen.larger', () => actions.resize(1));
    this.another = button('sandbox.gen.another', actions.another);
    const done = button('sandbox.gen.done', actions.done);
    const ink = PALETTE[WOOD_PANEL.text];
    this.size = scene.add.text(0, 0, '', textStyle(8, ink)).setDepth(DRAWER_DEPTH + 2);
    // The size's room is measured at its widest, so nothing moves as it changes.
    const widest = Math.max(...GENERATORS.map((generator) => generator.max));
    const sizeWidth = this.size.setText(t('sandbox.gen.size', { size: widest })).width;
    const layout = generateDrawer({
      generators: this.generators.map((view) => view.width),
      smaller: this.smaller.width,
      size: sizeWidth,
      larger: this.larger.width,
      another: this.another.width,
      done: done.width,
    });
    const panel = new WoodFrame(scene, WOOD_PANEL, layout.panel, DRAWER_DEPTH);
    this.panelTop = layout.panel.y;
    // The drawer's wood takes the touches that land on it, so none reaches the garden below.
    coverWith(panel.zone.setInteractive());
    this.generators.forEach((view, i) => {
      const at = itemAt(layout.generators, i);
      view.moveTo(at.x, at.y);
    });
    this.smaller.moveTo(layout.smaller.x, layout.smaller.y);
    this.size.setPosition(layout.size.x, layout.size.y);
    this.larger.moveTo(layout.larger.x, layout.larger.y);
    this.another.moveTo(layout.another.x, layout.another.y);
    done.moveTo(layout.done.x, layout.done.y);
    this.parts.push(panel, ...this.generators, this.smaller, this.larger, this.another, done);
    this.parts.push(this.size);
    this.setVisible(false);
  }

  /** The top of the drawer's wood: a notice shown while it is open goes above it. */
  get top(): number {
    return this.panelTop;
  }

  /** Whether the drawer is open. */
  get open(): boolean {
    return this.shown;
  }

  /** Opens the drawer, or closes it. */
  setVisible(visible: boolean): void {
    this.shown = visible;
    for (const part of this.parts) part.setVisible(visible);
  }

  /** Shows the choice: the generator picked, its size, and what can be pressed now. */
  render(choice: GenerateChoice): void {
    this.generators.forEach((view, i) => view.setActive(itemAt(GENERATORS, i).id === choice.id));
    this.smaller.setEnabled(canShrink(choice));
    this.larger.setEnabled(canGrow(choice));
    this.another.setEnabled(canReseed(choice));
    this.size.setText(choice.id === null ? '' : this.t('sandbox.gen.size', { size: choice.size }));
  }
}
