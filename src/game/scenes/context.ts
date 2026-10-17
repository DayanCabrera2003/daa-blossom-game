import type Phaser from 'phaser';
import type { Level } from '@levels/build';
import type { Translate } from '@services/i18n';
import type { LineText } from '@services/lines';
import type { PlaytestRecorder } from '@services/playtestRecorder';
import type { KeyValueStore, SaveData } from '@services/save';
import type { Settings } from '@services/settings';
import type { AudioBus } from '../audio/AudioBus';

/**
 * What every scene shares, created once in `main.ts` and kept in the game registry: the levels,
 * the texts, where progress and the playtest log are kept, and whether teacher mode is on. `save` changes
 * when a level is won, and `settings` when the player moves a volume or mutes.
 */
export interface GameContext {
  readonly catalog: readonly Level[];
  readonly t: Translate;
  readonly line: LineText;
  readonly storage: KeyValueStore;
  readonly teacherMode: boolean;
  /** A level to open straight away (teacher mode, `?level=`), or null to start at the hub. */
  readonly startLevel: string | null;
  /** The playtest log of this browser (GDD §10), and the wall clock that dates its entries. */
  readonly playtest: PlaytestRecorder;
  readonly clock: () => number;
  save: SaveData;
  /** The player's volumes and mute, read at start-up and changed in the settings panel. */
  settings: Settings;
  /** The game's three audio channels, at the gains `settings` gives them. */
  readonly audio: AudioBus;
}

const KEY = 'florecer.context';

/** Stores the shared context in the game, before any scene starts. */
export const provideContext = (game: Phaser.Game, context: GameContext): void => {
  game.registry.set(KEY, context);
};

/** The shared context, from any scene. */
export const contextOf = (scene: Phaser.Scene): GameContext =>
  scene.registry.get(KEY) as GameContext;
