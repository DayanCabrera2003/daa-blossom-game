import type Phaser from 'phaser';
import type { Translate } from '@services/i18n';
import type { ToolId } from '../input/tools';
import { Button } from './Button';
import { LAYOUT } from './layout';

/** The tools unlocked so far, at the bottom left; the one in hand is lit. */
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
      let x = LAYOUT.margin + 2;
      this.buttons = tools.map((tool) => {
        const button = new Button(this.scene, x, LAYOUT.bottomY, this.t(`tool.${tool}`), () =>
          this.choose(tool),
        );
        x += button.width + 3;
        return { tool, button };
      });
      this.shown = key;
    }
    for (const { tool, button } of this.buttons) button.setActive(tool === inHand);
  }
}
