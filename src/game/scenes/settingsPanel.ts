import type Phaser from 'phaser';
import { setVolume, toggleMute, writeSettings, type Settings } from '@services/settings';
import type { Point } from '../input/target';
import { addGearButton } from '../view/GearButton';
import { SettingsView } from '../view/SettingsView';
import { contextOf } from './context';

/**
 * Gives a scene its settings: the gear button at `at`, which opens the settings panel, and the `M`
 * key, which mutes or unmutes at any time. Every change is kept in the shared context, saved at
 * once, handed to the audio bus and shown on the panel if it is open.
 */
export function addSettings(scene: Phaser.Scene, at: Point): void {
  const context = contextOf(scene);
  const change = (next: Settings): void => {
    context.settings = next;
    writeSettings(context.storage, next);
    context.audio.apply(next);
    view.render(next);
  };
  const view = new SettingsView(scene, context.t, {
    volume: (channel, value) => {
      const next = setVolume(context.settings, channel, value);
      // A drag reports every pixel; only a new step is worth saving.
      if (next[channel] !== context.settings[channel]) change(next);
    },
    mute: () => change(toggleMute(context.settings)),
  });
  addGearButton(scene, at, () => view.show(context.settings));
  scene.input.keyboard?.on('keydown-M', () => change(toggleMute(context.settings)));
}
