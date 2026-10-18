import Phaser from 'phaser';
import { fitCamera } from '../view/fitCamera';
import { contextOf } from './context';
import { paintHubGround } from '../view/hubGround';

/** The key of the gate, the scene the game starts to open the free mode. */
export const SANDBOX_GATE = 'sandboxGate';

/** The key of the free mode's own scene, added by the gate once its code has loaded. */
export const SANDBOX_SCENE = 'sandbox';

/** What the free mode opens with. */
export interface SandboxSceneData {
  /** A shared link's garden code, not yet read (it may be broken), or null for the last design kept. */
  readonly garden: string | null;
  /**
   * Whether the editor opens back from playing its design: then it goes on where it was, with the
   * design and its undo history as they were when "Jugar" was pressed.
   */
  readonly returning: boolean;
}

/**
 * The thin gate of the free mode (plan 08, phase 10), the only part of it in the initial script:
 * the game registers it from the start, so it can announce the free mode without carrying it.
 * Started, it shows the hub's bare grass, loads the free mode's scene with import() (its own chunk,
 * like the books), adds it to the game the first time and hands it the garden asked for. If the
 * chunk cannot load (offline, or gone after a new version), the player is back at the hub and the
 * page says so kindly. It imports nothing of the free mode but through that import().
 */
export class SandboxGate extends Phaser.Scene {
  constructor() {
    super(SANDBOX_GATE);
  }

  create(data: Partial<SandboxSceneData> = {}): void {
    fitCamera(this);
    paintHubGround(this);
    const request: SandboxSceneData = {
      garden: data.garden ?? null,
      returning: data.returning ?? false,
    };
    import('./sandbox/SandboxScene')
      .then(({ SandboxScene }) => {
        // Left while loading (nothing here takes input, but the game may have moved on).
        if (!this.sys.isActive()) return;
        if (this.game.scene.keys[SANDBOX_SCENE] === undefined) {
          this.scene.add(SANDBOX_SCENE, SandboxScene, false);
        }
        this.scene.start(SANDBOX_SCENE, request);
      })
      .catch((error: unknown) => {
        // A free mode that does not load never strands the player: back to the hub, and the page
        // says why (`load.failed`).
        contextOf(this).bus.emit('load.failed', { part: 'sandbox', error });
        if (this.sys.isActive()) this.scene.start('hub');
      });
  }
}

/**
 * Opens the free mode from whatever scene is up (the hub, under the epilogue that asked for it):
 * that scene stops and the gate starts in its place.
 */
export function openSandbox(game: Phaser.Game, garden: string | null = null): void {
  const data: SandboxSceneData = { garden, returning: false };
  const [active] = game.scene.getScenes(true);
  if (active === undefined) game.scene.start(SANDBOX_GATE, data);
  else active.scene.start(SANDBOX_GATE, data);
}
