import type Phaser from 'phaser';
import type { Level } from '@levels/build';
import type { Translate } from '@services/i18n';
import type { LineText } from '@services/lines';
import type { KeyValueStore, SaveData } from '@services/save';

/**
 * What every scene shares, created once in `main.ts` and kept in the game registry: the levels,
 * the texts, where progress is kept, and whether teacher mode is on. `save` is the only part that
 * changes, when a level is won.
 */
export interface GameContext {
  readonly catalog: readonly Level[];
  readonly t: Translate;
  readonly line: LineText;
  readonly storage: KeyValueStore;
  readonly teacherMode: boolean;
  /** A level to open straight away (teacher mode, `?level=`), or null to start at the hub. */
  readonly startLevel: string | null;
  save: SaveData;
}

const KEY = 'florecer.context';

/** Stores the shared context in the game, before any scene starts. */
export const provideContext = (game: Phaser.Game, context: GameContext): void => {
  game.registry.set(KEY, context);
};

/** The shared context, from any scene. */
export const contextOf = (scene: Phaser.Scene): GameContext =>
  scene.registry.get(KEY) as GameContext;
