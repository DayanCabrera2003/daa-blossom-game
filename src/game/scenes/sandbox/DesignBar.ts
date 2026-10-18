import type Phaser from 'phaser';
import type { Translate } from '@services/i18n';
import {
  DESIGN_BUTTON_TEXT,
  DESIGN_BUTTONS,
  designToolbar,
  type DesignBarState,
  type DesignButton,
} from '../../picture/designToolbar';
import { Button } from '../../view/Button';

/**
 * The bar of the free mode's editor: a wooden button for each tool and order, where
 * `picture/designToolbar.ts` lays them out once they are measured; the tool in hand sunken, and
 * what cannot be done now switched off. It draws and forwards presses, nothing more.
 */
export class DesignBar {
  private readonly buttons: ReadonlyMap<DesignButton, Button>;

  constructor(scene: Phaser.Scene, t: Translate, press: (button: DesignButton) => void) {
    const buttons = new Map<DesignButton, Button>();
    for (const button of DESIGN_BUTTONS) {
      buttons.set(
        button,
        new Button(scene, 0, 0, t(DESIGN_BUTTON_TEXT[button]), () => press(button)),
      );
    }
    this.buttons = buttons;
    const widths = Object.fromEntries(
      DESIGN_BUTTONS.map((button) => [button, buttons.get(button)?.width ?? 0]),
    ) as Record<DesignButton, number>;
    const places = designToolbar(widths);
    for (const [button, view] of buttons) view.moveTo(places[button].x, places[button].y);
  }

  /** Shows the bar's state: the tool in hand, and which buttons may be pressed. */
  render(state: DesignBarState): void {
    for (const [button, view] of this.buttons) {
      view.setActive(button === state.active).setEnabled(state.enabled[button]);
    }
  }

  /** Hides the bar while the generate menu lies over it, and shows it again. */
  setVisible(visible: boolean): void {
    for (const view of this.buttons.values()) view.setVisible(visible);
  }
}
