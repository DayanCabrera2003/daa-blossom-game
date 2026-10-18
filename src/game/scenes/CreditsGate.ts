import Phaser from 'phaser';
import { HUB_TINT } from '../picture/hubGarden';
import { backdropTint } from '../picture/dayTint';
import { fitCamera } from '../view/fitCamera';
import { paintHubGround } from '../view/hubGround';

/** The key of the gate, the scene the game starts to open the credits. */
export const CREDITS_GATE = 'creditsGate';

/** The key of the credits' own scene, added by the gate once its code has loaded. */
export const CREDITS_SCENE = 'credits';

/** What the credits open with: the scenes they were opened over, asleep until the credits end. */
export interface CreditsSceneData {
  readonly opened: readonly string[];
}

/** Paints the hub's bare grass at dawn: the ground of the credits and of their gate. */
export function paintDawnGround(scene: Phaser.Scene): void {
  paintHubGround(scene).tint(backdropTint(HUB_TINT, 0));
}

/** Wakes the scenes the credits were opened over: the game is back where it was. */
export function wakeOpened(scene: Phaser.Scene, data: CreditsSceneData): void {
  for (const key of data.opened) scene.scene.wake(key);
}

/**
 * The thin gate of the credits screen (plan 09, phase 3), the only part of it in the initial
 * script, like the free mode's: started, it shows the hub's grass at dawn, loads the credits'
 * scene with import() (its own chunk), adds it to the game the first time and starts it with the
 * scenes it was opened over. If the chunk cannot load (offline), those scenes wake again and the
 * player is back where they were. It imports nothing of the credits but through that import().
 */
export class CreditsGate extends Phaser.Scene {
  constructor() {
    super(CREDITS_GATE);
  }

  create(data: Partial<CreditsSceneData> = {}): void {
    fitCamera(this);
    paintDawnGround(this);
    const request: CreditsSceneData = { opened: data.opened ?? [] };
    import('./credits/CreditsScene')
      .then(({ CreditsScene }) => {
        if (!this.sys.isActive()) return;
        if (this.game.scene.keys[CREDITS_SCENE] === undefined) {
          this.scene.add(CREDITS_SCENE, CreditsScene, false);
        }
        this.scene.start(CREDITS_SCENE, request);
      })
      .catch((error: unknown) => {
        // Credits that do not load never strand the player: report it, back where they were.
        console.error(error);
        if (!this.sys.isActive()) return;
        wakeOpened(this, request);
        this.scene.stop();
      });
  }
}

/**
 * Opens the credits over whatever scenes are up (the hub, a level, the free mode): they sleep, as
 * they are, and the gate starts; the credits wake them when they end. Asked again while the
 * credits are up, it does nothing.
 */
export function openCredits(game: Phaser.Game): void {
  const opened = game.scene.getScenes(true).map((scene) => scene.scene.key);
  if (opened.includes(CREDITS_GATE) || opened.includes(CREDITS_SCENE)) return;
  for (const key of opened) game.scene.sleep(key);
  const data: CreditsSceneData = { opened };
  game.scene.start(CREDITS_GATE, data);
}
