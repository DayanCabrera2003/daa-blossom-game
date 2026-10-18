import Phaser from 'phaser';
import type { AssetKey } from '../../assets/keys';
import { creditLines } from '../../assets/creditsModel';
import { groupKeys, loadRequests } from '../../assets/loadPlan';
import {
  CREDITS_ROLL,
  offsetAt,
  pageAfter,
  pageBefore,
  pageStarts,
  rollLines,
  rollTravel,
  scrolled,
  timeAt,
} from '../../picture/creditsRoll';
import { keyAction } from '../../input/keyBindings';
import { LINE_HEIGHT } from '../../picture/textWrap';
import { WOOD_PANEL } from '../../picture/wood';
import { CANVAS_WIDTH } from '../../scale/integerZoom';
import { Button } from '../../view/Button';
import { fitCamera } from '../../view/fitCamera';
import { PALETTE } from '../../view/palette';
import { textStyle } from '../../view/textStyle';
import { WoodFrame } from '../../view/WoodFrame';
import { contextOf } from '../context';
import { FocusController } from '../focus/FocusController';
import { CREDITS_SCENE, paintDawnGround, wakeOpened, type CreditsSceneData } from '../CreditsGate';
import { queueLoads } from '../queueLoads';
import { movesLess } from '../motion';

/** The track the credits play, loaded with them the first time they open. */
const TRACK: AssetKey = 'music.credits';

/**
 * Where the roll's letters are written in the world: far below the canvas, where only the roll's
 * own camera looks, so its window cuts every line cleanly at its edges.
 */
const ROLL_WORLD_Y = 10_000;

/** How far a wheel notch or an arrow key moves the roll: two lines of body text. */
const STEP = 2 * LINE_HEIGHT;

/**
 * The credits screen (plan 09, phase 3), loaded on demand through its gate: the hub's grass at
 * dawn, a wooden panel with the credits' roll in the panel's ink, the credits' own music, and the
 * way back. What the roll says comes from `assets/creditsModel.ts` and where it stands and moves
 * from `picture/creditsRoll.ts`; this scene only draws, plays and listens. The roll moves slowly
 * for as long as the music plays and stays at the end; with reduced motion it stays still and is
 * read page by page. Enter, Space or a touch turn a page (and, at the end, go back), the arrows
 * and the wheel move it by hand, Page Up and Page Down turn pages, and Escape or "Volver" go back
 * at any time to the scenes the credits were opened over, as they were, with their music.
 */
export class CreditsScene extends Phaser.Scene {
  private opened: CreditsSceneData = { opened: [] };
  /** The instant of the roll, from which its offset follows (`creditsRoll.offsetAt`). */
  private elapsed = 0;
  private travel = 0;
  private pages: number[] = [0];
  private still = false;
  private rollCamera: Phaser.Cameras.Scene2D.Camera | null = null;
  /** The track that played before, which plays again when the credits end. */
  private trackBefore: AssetKey | null = null;

  constructor() {
    super(CREDITS_SCENE);
  }

  /** The credits' music, the first time they open. */
  preload(): void {
    const missing = groupKeys('credits').filter((key) => !this.cache.audio.exists(key));
    queueLoads(this.load, loadRequests(missing));
  }

  create(data: CreditsSceneData): void {
    fitCamera(this);
    this.opened = data;
    const { t, music } = contextOf(this);
    this.trackBefore = music.track;
    music.play(TRACK);
    paintDawnGround(this);
    new WoodFrame(this, WOOD_PANEL, CREDITS_ROLL.panel, 10);

    const { window: view } = CREDITS_ROLL;
    const lines = rollLines(creditLines(t), view.width);
    for (const line of lines) {
      this.add.text(
        view.x + line.x,
        ROLL_WORLD_Y + line.top,
        line.text,
        textStyle(8 * line.scale, PALETTE[WOOD_PANEL.text]),
      );
    }
    this.travel = rollTravel(lines, view.height);
    this.pages = pageStarts(lines, view.height, this.travel);
    this.still = movesLess(this);
    this.elapsed = 0;
    this.addRollCamera();

    const back = new Button(this, 0, 0, t('credits.back'), () => this.leave());
    back.moveTo(
      CREDITS_ROLL.panel.x + CREDITS_ROLL.panel.width - back.width + 2,
      CREDITS_ROLL.backRow,
    );
    this.listen();
  }

  override update(_: number, delta: number): void {
    if (!this.still) this.elapsed += delta;
    this.rollCamera?.setScroll(
      CREDITS_ROLL.window.x,
      ROLL_WORLD_Y + offsetAt(this.elapsed, this.travel),
    );
  }

  /** A camera that shows the roll through the panel's window, at the canvas's zoom. */
  private addRollCamera(): void {
    const camera = this.cameras.add(0, 0, 1, 1).setOrigin(0, 0);
    const fit = (): void => {
      const zoom = this.scale.width / CANVAS_WIDTH;
      const { x, y, width, height } = CREDITS_ROLL.window;
      camera.setViewport(x * zoom, y * zoom, width * zoom, height * zoom).setZoom(zoom);
    };
    fit();
    this.scale.on('resize', fit);
    this.events.once('shutdown', () => {
      this.scale.off('resize', fit);
      this.rollCamera = null;
    });
    this.rollCamera = camera;
  }

  /** The keys, the touches and the wheel of the credits. */
  private listen(): void {
    // Tab reaches "Volver"; Enter or Space press it in focus, or else turn the page.
    new FocusController(this, { screen: () => 'credits', fallback: () => this.forward() });
    this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
      const action = keyAction('credits', {
        key: event.key,
        ctrl: event.ctrlKey || event.metaKey,
        shift: event.shiftKey,
      });
      if (action === 'escape') this.leave();
      else if (action === 'rollDown') this.moveTo(scrolled(this.offset(), STEP, this.travel));
      else if (action === 'rollUp') this.moveTo(scrolled(this.offset(), -STEP, this.travel));
      else if (action === 'pageDown') this.moveTo(pageAfter(this.offset(), this.pages));
      else if (action === 'pageUp') this.moveTo(pageBefore(this.offset(), this.pages));
    });
    this.input.on('pointerdown', () => this.forward());
    this.input.on('wheel', (_: unknown, __: unknown, ___: number, dy: number) =>
      this.moveTo(scrolled(this.offset(), Math.sign(dy) * STEP, this.travel)),
    );
  }

  /** Where the roll is now. */
  private offset(): number {
    return offsetAt(this.elapsed, this.travel);
  }

  /** Moves the roll to `offset` (nothing for null); a moving roll goes on from there. */
  private moveTo(offset: number | null): void {
    if (offset !== null) this.elapsed = timeAt(offset, this.travel);
  }

  /** The next page, or, at the end of the roll, the way back. */
  private forward(): void {
    const next = pageAfter(this.offset(), this.pages);
    if (next === null) this.leave();
    else this.moveTo(next);
  }

  /** Back to the scenes the credits were opened over, with the music that played there. */
  private leave(): void {
    contextOf(this).music.play(this.trackBefore);
    wakeOpened(this, this.opened);
    this.scene.stop();
  }
}
