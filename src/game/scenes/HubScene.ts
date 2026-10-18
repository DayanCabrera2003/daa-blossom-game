import Phaser from 'phaser';
import { itemAt } from '@core/shared/itemAt';
import { codexSources, hasNewPages, openCodex } from '@services/codexProgress';
import type { SaveData } from '@services/save';
import { catalogEntries, unlockedLevels, visibleLevels } from '@services/progress';
import { groundOf, seedOf } from '../picture/backdrop';
import type { Rect } from '../picture/boxDistance';
import { BOOK_ICON } from '../picture/buttonIcon';
import { chapterTitle } from '../picture/chapterTitle';
import { finishedChapters, HUB_SIGN, HUB_TINT, hubGarden, signBox } from '../picture/hubGarden';
import { epilogueSignAt, HUB, layoutHub } from '../picture/hubLayout';
import { PIXEL_FONT } from '../picture/pixelFont';
import { labelSeal, SEAL_PAD } from '../picture/signSeal';
import { cutOf, seasonOf } from '../picture/seasons';
import { labelStars, STAR_SIZE } from '../picture/starIcon';
import { CANVAS_WIDTH } from '../scale/integerZoom';
import { epilogueReached } from '../systems/epilogue';
import { trackFor } from '../systems/musicFor';
import { BackdropView } from '../view/BackdropView';
import { Button } from '../view/Button';
import { fitCamera } from '../view/fitCamera';
import { GEAR_SIZE } from '../view/GearButton';
import { css, PALETTE } from '../view/palette';
import { cutFrame } from '../view/sheetCuts';
import { drawStars } from '../view/StarIcons';
import { textStyle } from '../view/textStyle';
import { contextOf } from './context';
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
    const heading = this.add.text(HUB.margin, 6, t('hub.title'), textStyle(12, PALETTE.lit));

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
    const taken: Rect[] = [boxOf(heading)];
    // In teacher mode the hub says so, after its title: every level, page and sign is open.
    if (teacherMode) {
      const badgeX = heading.x + heading.width + HUB.margin * 2;
      const badge = this.add.text(badgeX, 9, t('teacher.badge'), textStyle(8, PALETTE.sun));
      taken.push(boxOf(badge));
    }
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

    // The settings, at the top right across from the title.
    const gear = { x: CANVAS_WIDTH - HUB.margin - GEAR_SIZE, y: 4 };

    // The signs of the top line stand before the settings, right to left.
    const exportX = gear.x;

    // The Cuaderno, before the Códex, once a statement is written (and in teacher mode, to look at
    // the book): it opens as a book over the hub, with a ribbon to the Códex.
    const notebook =
      save.notebook.length > 0 || teacherMode
        ? new Button(this, 0, 0, t('hub.notebook'), () =>
            bus.emit('book.open', { book: 'notebook' }),
          )
        : null;
    // Puts the Cuaderno just before `right`, where the sign to its right starts.
    let notebookX = exportX;
    const placeNotebook = (right: number): void => {
      if (notebook === null) return;
      notebookX = right - HUB.gap - notebook.width;
      notebook.moveTo(notebookX, HUB.topLineY);
    };
    placeNotebook(exportX);

    // The Códex, before the export on the top line, once some page of it is open: the hub grows
    // with the game, and in teacher mode the whole book is open from the start.
    const codexOpen = openCodex(codexSources(catalog), save, teacherMode);
    if (codexOpen.size > 0) {
      const codex = new Button(
        this,
        0,
        0,
        t('hub.codex'),
        () => bus.emit('book.open', { book: 'codex' }),
        [BOOK_ICON],
      );
      // The book's "new" seal, written inside its sign after the word while some open page is
      // still unread, so it reads as part of the Códex and of no other sign. Reading the book over
      // the hub updates the save: the seal and its room go, and the Cuaderno follows the sign.
      const word = t('codex.new');
      const room = labelSeal(word);
      const seal = this.add
        .text(0, HUB.topLineY, word, {
          ...textStyle(8, PALETTE.ink),
          backgroundColor: css(PALETTE.lit),
          padding: { x: SEAL_PAD },
        })
        .setDepth(STAR_DEPTH);
      const showSeal = (now: SaveData): void => {
        const fresh = hasNewPages(codexOpen, now);
        codex.setLabel(fresh ? t('hub.codex') + ' '.repeat(room.spaces) : t('hub.codex'));
        const codexX = exportX - HUB.gap - codex.width;
        codex.moveTo(codexX, HUB.topLineY);
        // The blank cells end where the label does, 2 px inside the sign's right edge.
        seal.setX(codexX + codex.width - 2 - room.spaces * PIXEL_FONT.advance + room.offset);
        seal.setVisible(fresh);
        placeNotebook(codexX);
      };
      showSeal(save);
      // Pages only get read while the hub is up, so the sign is now at its widest.
      const codexX = exportX - HUB.gap - codex.width;
      taken.push({ x: codexX, y: HUB.topLineY - 1, width: codex.width, height: codex.height });
      const unsubscribe = saves.subscribe(showSeal);
      this.events.once(Phaser.Scenes.Events.SHUTDOWN, unsubscribe);
    }
    // The Cuaderno where it stands now, at its leftmost.
    if (notebook !== null) {
      taken.push({
        x: notebookX,
        y: HUB.topLineY - 1,
        width: notebook.width,
        height: notebook.height,
      });
    }

    // Once the last garden is won (and in teacher mode), a sign grows in the garden's bed and opens
    // the epilogue again, over the hub.
    if (epilogueReached(save, teacherMode)) {
      const sign = new Button(this, 0, 0, t('epilogue.title'), () => bus.emit('epilogue.open'));
      const at = epilogueSignAt(sign.width, sign.height);
      sign.moveTo(at.x, at.y);
      taken.push({ x: at.x, y: at.y - 1, width: sign.width, height: sign.height });
    }

    addSettings(this, gear);
    taken.push({ ...gear, width: GEAR_SIZE, height: GEAR_SIZE });

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
