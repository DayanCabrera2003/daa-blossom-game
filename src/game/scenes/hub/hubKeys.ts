import type Phaser from 'phaser';
import { escapeAction } from '../../input/escape';
import { FocusController } from '../focus/FocusController';
import type { SettingsPanel } from '../settingsPanel';

/**
 * The hub's keyboard (plan 09, phase 4): its focus, which walks the signs, the gear, the flowers and
 * the buttons of the levels (and the settings panel's controls while it is open over them), and its
 * Escape, which closes the innermost thing open by the rule of every screen (`input/escape.ts`);
 * the hub has nowhere to go back to, so with nothing open Escape only takes the focus away.
 */
export function bindHubKeys(scene: Phaser.Scene, settings: SettingsPanel): FocusController {
  const focus = new FocusController(scene, {
    screen: () => (settings.open() ? 'settings' : 'hub'),
  });
  scene.input.keyboard?.on('keydown-ESC', () => {
    const action = escapeAction({ settingsOpen: settings.open(), canLeave: false });
    if (action === 'closeSettings') settings.close();
    else focus.blur();
  });
  return focus;
}
