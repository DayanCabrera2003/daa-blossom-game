import type Phaser from 'phaser';
import { download } from '@services/download';
import { exportLog } from '@services/exportLog';
import {
  nudgeVolume,
  setMotion,
  setVolume,
  toggleMute,
  writeSettings,
  type Settings,
} from '@services/settings';
import { helpLines, type KeyScreen } from '../input/keyBindings';
import type { Point } from '../input/target';
import { addGearButton } from '../view/GearButton';
import { KeysCard } from '../view/KeysCard';
import { SettingsView } from '../view/SettingsView';
import { contextOf } from './context';

/** The settings panel of a scene, as the scene's keys see it. */
export interface SettingsPanel {
  /** Whether the panel is showing. */
  readonly open: () => boolean;
  /** Closes the panel, if it is showing. */
  readonly close: () => void;
  /** Whether the card of the keys is showing over the panel. */
  readonly keysOpen: () => boolean;
  /** Closes the card of the keys, if it is showing. */
  readonly closeKeys: () => void;
}

/**
 * Gives a scene its settings: the gear button at `at`, which opens the settings panel, and the `M`
 * key, which mutes or unmutes at any time. Every change is kept in the shared context, saved at
 * once, handed to the audio bus and shown on the panel if it is open; the panel also downloads the
 * playtest log, opens the credits and the card of the keys of `screen` (the hub's or a level's,
 * `input/keyBindings.ts`). The panel and its card are returned, so the scene's Escape can close them.
 */
export function addSettings(scene: Phaser.Scene, at: Point, screen: KeyScreen): SettingsPanel {
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
    nudge: (channel, direction) => change(nudgeVolume(context.settings, channel, direction)),
    mute: () => change(toggleMute(context.settings)),
    // The game reads the setting as it moves; the page's styles hear of it on the bus.
    motion: (motion) => {
      change(setMotion(context.settings, motion));
      context.bus.emit('motion.changed', { motion });
    },
    // Playtesters send this file back; nothing leaves the browser otherwise (GDD §10).
    exportLog: () => download(exportLog(context.playtest.current(), context.clock())),
    // The credits open over this scene, which sleeps with its panel open until they end.
    credits: () => context.bus.emit('credits.open'),
    keys: () => {
      const { t } = context;
      card.show({
        title: t('keys.title'),
        lines: [
          ...helpLines(screen, context.teacherMode).map((line) => t(`keys.${line}`)),
          t('keys.pointer'),
        ],
        close: t('keys.close'),
      });
    },
  });
  const card = new KeysCard(scene);
  addGearButton(scene, at, () => view.show(context.settings));
  scene.input.keyboard?.on('keydown-M', () => change(toggleMute(context.settings)));
  return {
    open: () => view.open,
    close: () => view.close(),
    keysOpen: () => card.open,
    closeKeys: () => card.close(),
  };
}
