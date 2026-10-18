import type Phaser from 'phaser';
import type { Level } from '@levels/build';
import type { Bus } from '@services/bus';
import type { BusEvents } from '@services/busEvents';
import type { Translate } from '@services/i18n';
import type { LineText } from '@services/lines';
import type { PlaytestRecorder } from '@services/playtestRecorder';
import type { KeyValueStore } from '@services/save';
import type { SandboxStore } from '@services/sandboxStore';
import type { SaveStore } from '@services/saveStore';
import type { Settings } from '@services/settings';
import type { AudioBus } from '../audio/AudioBus';
import type { MusicPlayer } from '../audio/MusicPlayer';

/**
 * What every scene shares, created once in `main.ts` and kept in the game registry: the levels,
 * the texts, where progress and the playtest log are kept, and whether teacher mode is on. The
 * progress lives in `saves`, the store shared with the books; `settings` changes when the player
 * moves a volume or mutes.
 */
export interface GameContext {
  readonly catalog: readonly Level[];
  readonly t: Translate;
  readonly line: LineText;
  readonly storage: KeyValueStore;
  readonly teacherMode: boolean;
  /** A level to open straight away (teacher mode, `?level=`), or null to start at the hub. */
  readonly startLevel: string | null;
  /** A garden code to open the free mode with straight away (a shared link's `?garden=`), or null. */
  readonly startGarden: string | null;
  /** The last garden designed in the free mode, kept apart from the progress. */
  readonly sandbox: SandboxStore;
  /** The playtest log of this browser (GDD §10), and the wall clock that dates its entries. */
  readonly playtest: PlaytestRecorder;
  readonly clock: () => number;
  /** The typed bus shared with the DOM overlays (books, epilogue, teacher panel). */
  readonly bus: Bus<BusEvents>;
  /** The player's progress, read and changed only through this store, which writes it at once. */
  readonly saves: SaveStore;
  /** The player's volumes and mute, read at start-up and changed in the settings panel. */
  settings: Settings;
  /** The game's three audio channels, at the gains `settings` gives them. */
  readonly audio: AudioBus;
  /** The music, on the bus's music channel, carried from one screen to the next. */
  readonly music: MusicPlayer;
}

const KEY = 'florecer.context';

/** Stores the shared context in the game, before any scene starts. */
export const provideContext = (game: Phaser.Game, context: GameContext): void => {
  game.registry.set(KEY, context);
};

/** The shared context, from any scene. */
export const contextOf = (scene: Phaser.Scene): GameContext =>
  scene.registry.get(KEY) as GameContext;
