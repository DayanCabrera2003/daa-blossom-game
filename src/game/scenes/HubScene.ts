import Phaser from 'phaser';
import { itemAt } from '@core/shared/itemAt';
import { catalogEntries, unlockedLevels, visibleLevels } from '@services/progress';
import { groundOf, seedOf } from '../picture/backdrop';
import type { Rect } from '../picture/boxDistance';
import { chapterTitle } from '../picture/chapterTitle';
import { finishedChapters, HUB_SIGN, HUB_TINT, hubGarden, signBox } from '../picture/hubGarden';
import { epilogueSignAt, HUB, layoutHub } from '../picture/hubLayout';
import { PIXEL_FONT } from '../picture/pixelFont';
import { cutOf, seasonOf } from '../picture/seasons';
import { labelStars, STAR_SIZE } from '../picture/starIcon';
import { epilogueReached } from '../systems/epilogue';
import { trackFor } from '../systems/musicFor';
import { BackdropView } from '../view/BackdropView';
import { Button } from '../view/Button';
import { fitCamera } from '../view/fitCamera';
import { cutFrame } from '../view/sheetCuts';
import { drawStars } from '../view/StarIcons';
import { textStyle } from '../view/textStyle';
import { contextOf } from './context';
import { addHubTopLine } from './hub/HubTopLine';
import { addSettings } from './settingsPanel';

/** Above the buttons' labels, which sit at depth 101. */
const STAR_DEPTH = 102;

/** Where a chapter title starts: after the signpost it hangs from. */
const TITLE_X = HUB.margin + HUB_SIGN.width + HUB_SIGN.gap;

/** The box a text or a button covers, to keep the hub's garden off it. */
const boxOf = (thing: { x: number; y: number; width: number; height: number }): Rect => ({
  x: thing.x,
  y: thing.y,
  width: thing.width,
  height: thing.height,
});

/** What a scene can ask of the hub it starts: to open the epilogue over it (after the last garden). */
export interface HubSceneData {
  readonly epilogue?: boolean;
}

/**
 * The hub: the levels of the game by chapter, each chapter's name hanging from a signpost, with
 * their stars; levels not yet open are shown greyed out. It stands on the orchard's grass, and each
 * finished chapter plants its piece of the garden that grows along the bottom (GDD §4.1). Where
 * everything goes is decided by `picture/hubLayout.ts`, and the garden by `picture/hubGarden.ts`.
 */
export class HubScene extends Phaser.Scene {
  constructor() {
    super('hub');
  }

  create(data: HubSceneData = {}): void {
    fitCamera(this);
    const { catalog, t, saves, teacherMode, music, bus } = contextOf(this);
    const save = saves.get();
    // The hub's own track; coming back from a level crossfades to it.
    music.play(trackFor({ kind: 'hub' }));
    const backdrop = new BackdropView(this);
    // The title, the counter of stars and seeds, and the signs of the books, along the top.
    const topLine = addHubTopLine(this);

    // Drafts (test levels of chapters not yet written) are shown in teacher mode only; secret
    // flowers are never buttons.
    const shown = visibleLevels(catalogEntries(catalog), teacherMode);
    const open = unlockedLevels(shown, save, teacherMode);
    const chapters = [...new Set(shown.map((level) => level.id.split('.')[0] as string))];

    // The buttons and titles are made first, to measure them; then the layout says where they go.
    const rows = chapters.map((chapter) =>
      shown
        .filter((level) => level.id.startsWith(`${chapter}.`))
        .map(({ id }) => {
          // The pixel font has no star: the label leaves blank cells where its stars are drawn.
          const room = labelStars(open.has(id) ? (save.levels[id]?.stars ?? 0) : 0);
          const label = open.has(id) ? `${id} ${' '.repeat(room.spaces)}` : `${id} ·`;
          const button = new Button(this, 0, 0, label, () =>
            this.scene.start('level', { levelId: id }),
          );
          return { button: button.setEnabled(open.has(id)), room };
        }),
    );
    const titles = chapters.map((chapter) => {
      const title = chapterTitle(chapter);
      return this.add.text(TITLE_X, 0, t(title.key, title.params), textStyle(8));
    });
    const height = rows[0]?.[0]?.button.height ?? 0;
    // Each title is laid out with its signpost before it.
    const layout = layoutHub(
      rows.map((row) => row.map(({ button }) => button.width)),
      height,
      titles.map((title) => title.width + TITLE_X - HUB.margin),
    );
    // What the hub's garden must leave uncovered: every sign, title and button.
    const taken: Rect[] = [...topLine.taken];
    const signpost = cutOf('signpost');
    const signFrame = cutFrame(this.textures, signpost);
    layout.chapters.forEach((placement, c) => {
      // On the line of its first buttons' labels, hanging from its signpost.
      const title = itemAt(titles, c).setY(placement.titleY);
      const sign = signBox(placement.titleY, height);
      if (signFrame !== null) {
        this.add.image(sign.x, sign.y, signpost.sheet, signFrame).setOrigin(0, 0);
      }
      taken.push(sign, boxOf(title));
      placement.buttons.forEach((at, b) => {
        const { button, room } = itemAt(itemAt(rows, c), b);
        button.moveTo(at.x, at.y);
        taken.push({ x: at.x, y: at.y - 1, width: button.width, height: button.height });
        if (room.spaces === 0) return;
        // The blank cells end where the label does, 2 px inside the button's right edge.
        const left = at.x + button.width - 2 - room.spaces * PIXEL_FONT.advance;
        const top = at.y + Math.round((button.height - 2 - STAR_SIZE) / 2);
        const stars = room.offsets.map((x) => ({ x, earned: true }));
        drawStars(this, left, top, stars, STAR_DEPTH);
      });
    });

    // Once the last garden is won (and in teacher mode), a sign grows in the garden's bed and opens
    // the epilogue again, over the hub.
    if (epilogueReached(save, teacherMode)) {
      const sign = new Button(this, 0, 0, t('epilogue.title'), () => bus.emit('epilogue.open'));
      const at = epilogueSignAt(sign.width, sign.height);
      sign.moveTo(at.x, at.y);
      taken.push({ x: at.x, y: at.y - 1, width: sign.width, height: sign.height });
    }

    // The settings, at the top right across from the title.
    addSettings(this, topLine.gear);

    // The garden grows on the orchard's grass, a piece for each chapter finished.
    const finished = finishedChapters(
      catalogEntries(catalog),
      (id) => save.levels[id] !== undefined,
    );
    backdrop.paint({
      tiles: groundOf(seasonOf('0'), seedOf('hub')),
      ornaments: hubGarden(finished, taken),
    });
    backdrop.tint(HUB_TINT);
    // After the last garden the epilogue opens over the hub, now laid out behind it. Phaser keeps
    // a scene's data when it is started again without any, so the request is spent here: coming
    // back to the hub later never opens the epilogue again by itself.
    this.sys.settings.data = {};
    if (data.epilogue === true) bus.emit('epilogue.open');
  }
}
