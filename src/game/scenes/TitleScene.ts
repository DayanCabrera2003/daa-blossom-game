import Phaser from 'phaser';
import { catalogEntries, nextLevel } from '@services/progress';
import { groundOf, seedOf } from '../picture/backdrop';
import { HUB_TINT } from '../picture/hubGarden';
import { CANVAS_WIDTH } from '../scale/integerZoom';
import { seasonOf } from '../picture/seasons';
import { TITLE_SCREEN } from '../picture/titleScreen';
import { BackdropView } from '../view/BackdropView';
import { fitCamera } from '../view/fitCamera';
import { OutlinedText } from '../view/OutlinedText';
import { PALETTE } from '../view/palette';
import { textStyle } from '../view/textStyle';
import { contextOf } from './context';
import { openLevel } from './LevelGate';
import { sayAloud } from './sayAloud';

/** The key of the title screen. */
export const TITLE_SCENE = 'title';

/**
 * The title screen a player with no garden won sees first (GDD §6): on the hub's grass, the game's
 * name and the invitation to touch, where `picture/titleScreen.ts` puts them; no art of its own. A
 * touch anywhere, Enter or Space opens the first level to play (0.1), and from then on the game
 * opens on the hub. Which screen the game opens on is `services/startScreen.ts`'s.
 */
export class TitleScene extends Phaser.Scene {
  constructor() {
    super(TITLE_SCENE);
  }

  create(): void {
    fitCamera(this);
    const { catalog, t, saves, teacherMode } = contextOf(this);
    const backdrop = new BackdropView(this);
    backdrop.paint({ tiles: groundOf(seasonOf('0'), seedOf('hub')), ornaments: [] });
    backdrop.tint(HUB_TINT);
    // Written straight on the grass, outlined as the hub's title is (`picture/textContrast.ts`).
    const middle = CANVAS_WIDTH / 2;
    new OutlinedText(
      this,
      middle,
      TITLE_SCREEN.titleY,
      t('hub.title'),
      textStyle(TITLE_SCREEN.titleSize, PALETTE.lit),
    ).setOrigin(0.5);
    new OutlinedText(
      this,
      middle,
      TITLE_SCREEN.promptY,
      t('title.start'),
      textStyle(TITLE_SCREEN.promptSize),
    ).setOrigin(0.5);
    sayAloud(this)(`${t('hub.title')}. ${t('title.start')}`);

    // The first level to play: 0.1 for a player with nothing won (the hub, should there be none).
    const first = nextLevel(catalogEntries(catalog), saves.get(), teacherMode);
    let started = false;
    const start = (): void => {
      if (started) return;
      started = true;
      if (first === null) this.scene.start('hub');
      else openLevel(this, { levelId: first });
    };
    this.input.once(Phaser.Input.Events.POINTER_DOWN, start);
    this.input.keyboard?.once('keydown-ENTER', start);
    this.input.keyboard?.once('keydown-SPACE', start);
  }
}
