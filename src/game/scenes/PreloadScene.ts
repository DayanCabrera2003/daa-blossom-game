import Phaser from 'phaser';
import { startScreen } from '@services/startScreen';
import type { AssetKey } from '../assets/keys';
import { BOOT_KEYS, loadRequests, recolouredSheets } from '../assets/loadPlan';
import { LOADING_TONES, loadingBar } from '../picture/loadingBar';
import { fitCamera } from '../view/fitCamera';
import { PALETTE } from '../view/palette';
import { contextOf } from './context';
import { openLevel } from './LevelGate';
import { queueLoads } from './queueLoads';
import { SANDBOX_GATE, type SandboxSceneData } from './SandboxGate';
import { paletteFrom, recolourSheets } from './recolourSheets';
import { TITLE_SCENE } from './TitleScene';

/** The palette swatch the Kenney sheets are recoloured to. */
const PALETTE_KEY: AssetKey = 'image.palette';

/**
 * Loads the `boot` group (`game/assets/loadPlan.ts` says what it holds) behind a loading bar, which
 * takes over from the lantern the page drew before the script (it says so on the bus), then
 * recolours the Kenney sheets to the Ninja Adventure palette read from its swatch, and hands over
 * to the screen `services/startScreen.ts` chooses: the hub, or the title for a player with no
 * garden won, or straight to a level when teacher mode asks for one (`?teacher&level=ID`), or to
 * the free mode when a shared link brings a garden (`?garden=CODE`; a teacher's level comes first).
 * A file that fails to load is left out; the game still starts, drawing what it has.
 */
export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('preload');
  }

  preload(): void {
    fitCamera(this);
    const bar = this.add.graphics();
    const draw = (progress: number): void => {
      const { frame, fill } = loadingBar(progress);
      const { edge, empty, fill: lit } = LOADING_TONES;
      bar.clear();
      bar.fillStyle(PALETTE[edge]).fillRect(frame.x, frame.y, frame.width, frame.height);
      bar.fillStyle(PALETTE[empty]).fillRect(fill.x, fill.y, frame.width - 2, fill.height);
      bar.fillStyle(PALETTE[lit]).fillRect(fill.x, fill.y, fill.width, fill.height);
    };
    draw(0);
    // The bar is drawn: the lantern the page drew before the script makes way for it.
    contextOf(this).bus.emit('loading.drawn');
    this.load.on(Phaser.Loader.Events.PROGRESS, draw);
    this.load.once(Phaser.Loader.Events.COMPLETE, () => bar.destroy());
    queueLoads(this.load, loadRequests(BOOT_KEYS));
  }

  create(): void {
    if (this.textures.exists(PALETTE_KEY)) {
      recolourSheets(
        this.textures,
        recolouredSheets(BOOT_KEYS),
        paletteFrom(this.textures, PALETTE_KEY),
      );
    }
    const { startLevel, startGarden, teacherMode, saves } = contextOf(this);
    const first = startScreen({ startLevel, startGarden, teacherMode, save: saves.get() });
    if (first.kind === 'level') openLevel(this, { levelId: first.levelId });
    else if (first.kind === 'garden')
      this.scene.start(SANDBOX_GATE, {
        garden: first.code,
        returning: false,
      } satisfies SandboxSceneData);
    else this.scene.start(first.kind === 'title' ? TITLE_SCENE : 'hub');
  }
}
