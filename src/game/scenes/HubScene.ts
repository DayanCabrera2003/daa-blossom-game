import Phaser from 'phaser';
import { itemAt } from '@core/shared/itemAt';
import { download } from '@services/download';
import { exportLog } from '@services/exportLog';
import { unlockedLevels, visibleLevels } from '@services/progress';
import { chapterTitle } from '../picture/chapterTitle';
import { HUB, layoutHub } from '../picture/hubLayout';
import { PIXEL_FONT } from '../picture/pixelFont';
import { labelStars, STAR_SIZE } from '../picture/starIcon';
import { CANVAS_WIDTH } from '../scale/integerZoom';
import { Button } from '../view/Button';
import { fitCamera } from '../view/fitCamera';
import { GEAR_SIZE } from '../view/GearButton';
import { PALETTE } from '../view/palette';
import { drawStars } from '../view/StarIcons';
import { textStyle } from '../view/textStyle';
import { contextOf } from './context';
import { addSettings } from './settingsPanel';

/** Above the buttons' labels, which sit at depth 101. */
const STAR_DEPTH = 102;

/**
 * The greybox hub: the levels of the game by chapter, each chapter under its name, with their
 * stars; levels not yet open are shown greyed out. In the final game this is the growing garden
 * (GDD §4.1). Where everything goes is decided by `picture/hubLayout.ts`.
 */
export class HubScene extends Phaser.Scene {
  constructor() {
    super('hub');
  }

  create(): void {
    fitCamera(this);
    const { catalog, t, save, teacherMode, playtest, clock } = contextOf(this);
    this.add.text(HUB.margin, 6, t('hub.title'), textStyle(12, PALETTE.lit));

    // Drafts (test levels of chapters not yet written) are shown in teacher mode only.
    const shown = visibleLevels(
      catalog.map((level) => ({ id: level.data.id, draft: level.data.draft })),
      teacherMode,
    );
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
      return this.add.text(HUB.margin, 0, t(title.key, title.params), textStyle(8));
    });
    const height = rows[0]?.[0]?.button.height ?? 0;
    const layout = layoutHub(
      rows.map((row) => row.map(({ button }) => button.width)),
      height,
      titles.map((title) => title.width),
    );
    layout.chapters.forEach((placement, c) => {
      // On the line of its first buttons' labels.
      itemAt(titles, c).setY(placement.titleY);
      placement.buttons.forEach((at, b) => {
        const { button, room } = itemAt(itemAt(rows, c), b);
        button.moveTo(at.x, at.y);
        if (room.spaces === 0) return;
        // The blank cells end where the label does, 2 px inside the button's right edge.
        const left = at.x + button.width - 2 - room.spaces * PIXEL_FONT.advance;
        const top = at.y + Math.round((button.height - 2 - STAR_SIZE) / 2);
        const stars = room.offsets.map((x) => ({ x, earned: true }));
        drawStars(this, left, top, stars, STAR_DEPTH);
      });
    });

    // Playtesters send this file back; nothing leaves the browser otherwise (GDD §10).
    new Button(this, 0, 0, t('hub.exportLog'), () =>
      download(exportLog(playtest.current(), clock())),
    ).moveTo(HUB.margin, HUB.exportY);

    // The settings, at the top right across from the title.
    addSettings(this, { x: CANVAS_WIDTH - HUB.margin - GEAR_SIZE, y: 4 });
  }
}
