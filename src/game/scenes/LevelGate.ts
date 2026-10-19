import Phaser from 'phaser';
import type { LevelSceneData } from '../systems/levelScreenOf';
import { fitCamera } from '../view/fitCamera';
import { contextOf } from './context';
import { SANDBOX_GATE, type SandboxSceneData } from './SandboxGate';

/** The key of the gate, the scene the game starts to open a level. */
export const LEVEL_GATE = 'levelGate';

/** The key of the level's own scene, added by the gate once its code has loaded. */
export const LEVEL_SCENE = 'level';

/**
 * The thin gate of the level screen, the only part of it in the initial script, like the free
 * mode's and the credits': the first screen is the hub, so the level scene with its views, its
 * cards and its presenter loads on demand. Started, it shows the bare background a level shows
 * while its chapter's music loads, loads the level scene with import() (its own chunk), adds it to
 * the game the first time and hands it the level asked for. If the chunk cannot load (offline, or
 * gone after a new version), the player is back where the level would have led them (the hub, or
 * the free mode's editor with its design) and the page says so kindly. It imports nothing of the
 * level scene but through that import().
 */
export class LevelGate extends Phaser.Scene {
  constructor() {
    super(LEVEL_GATE);
  }

  create(data: LevelSceneData): void {
    fitCamera(this);
    import('./LevelScene')
      .then(({ LevelScene }) => {
        // Left while loading (nothing here takes input, but the game may have moved on).
        if (!this.sys.isActive()) return;
        if (this.game.scene.keys[LEVEL_SCENE] === undefined) {
          this.scene.add(LEVEL_SCENE, LevelScene, false);
        }
        this.scene.start(LEVEL_SCENE, data);
      })
      .catch((error: unknown) => {
        // A level that does not load never strands the player: back to the hub, or to the editor
        // a garden of the free mode was played from, and the page says why (`load.failed`).
        contextOf(this).bus.emit('load.failed', { part: 'level', error });
        if (!this.sys.isActive()) return;
        if ('sandbox' in data) {
          const back: SandboxSceneData = { garden: null, returning: true };
          this.scene.start(SANDBOX_GATE, back);
        } else this.scene.start('hub');
      });
  }
}

/**
 * Opens a level (of the catalog, or a garden of the free mode) from `from`, the scene that is up:
 * it stops and the gate starts in its place, which goes on to the level scene once it has loaded.
 */
export function openLevel(from: Phaser.Scene, data: LevelSceneData): void {
  from.scene.start(LEVEL_GATE, data);
}
