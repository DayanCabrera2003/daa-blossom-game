import type Phaser from 'phaser';
import { itemAt } from '@core/shared/itemAt';
import type { Translate } from '@services/i18n';
import type { ToolId } from '../input/tools';
import { toolbarRow } from '../picture/bottomRows';
import { Button } from './Button';
import { LAYOUT } from './layout';

/** The tools unlocked so far, in their own row above the buttons; the one in hand is lit. */
export class ToolbarView {
  private buttons: { tool: ToolId; button: Button }[] = [];
  private shown = '';

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly t: Translate,
    private readonly choose: (tool: ToolId) => void,
  ) {}

  render(tools: readonly ToolId[], inHand: ToolId): void {
    const key = tools.join(',');
    if (key !== this.shown) {
      for (const { button } of this.buttons) button.destroy();
      this.buttons = tools.map((tool) => ({
        tool,
        button: new Button(this.scene, 0, LAYOUT.toolbarY, this.t(`tool.${tool}`), () =>
          this.choose(tool),
        ),
      }));
      const lefts = toolbarRow(this.buttons.map(({ button }) => button.width));
      this.buttons.forEach(({ button }, i) => button.moveTo(itemAt(lefts, i), LAYOUT.toolbarY));
      this.shown = key;
    }
    for (const { tool, button } of this.buttons) button.setActive(tool === inHand);
  }
}
