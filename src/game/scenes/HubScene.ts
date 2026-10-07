import Phaser from 'phaser';
import { itemAt } from '@core/shared/itemAt';
import { download } from '@services/download';
import { exportLog } from '@services/exportLog';
import { unlockedLevels, visibleLevels } from '@services/progress';
import { chapterTitle } from '../picture/chapterTitle';
import { HUB, layoutHub } from '../picture/hubLayout';
import { Button } from '../view/Button';
import { fitCamera } from '../view/fitCamera';
import { PALETTE } from '../view/palette';
import { textStyle } from '../view/textStyle';
import { contextOf } from './context';

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

    // The buttons are made first, to measure them; then the layout says where each one goes.
    const rows = chapters.map((chapter) =>
      shown
        .filter((level) => level.id.startsWith(`${chapter}.`))
        .map(({ id }) => {
          const stars = save.levels[id]?.stars ?? 0;
          const label = open.has(id) ? `${id} ${'★'.repeat(stars)}` : `${id} ·`;
          const button = new Button(this, 0, 0, label, () =>
            this.scene.start('level', { levelId: id }),
          );
          return button.setEnabled(open.has(id));
        }),
    );
    const height = rows[0]?.[0]?.height ?? 0;
    const layout = layoutHub(
      rows.map((row) => row.map((button) => button.width)),
      height,
    );
    layout.chapters.forEach((placement, c) => {
      const title = chapterTitle(itemAt(chapters, c));
      this.add.text(HUB.margin, placement.titleY, t(title.key, title.params), textStyle(8));
      placement.buttons.forEach((at, b) => itemAt(itemAt(rows, c), b).moveTo(at.x, at.y));
    });

    // Playtesters send this file back; nothing leaves the browser otherwise (GDD §10).
    new Button(this, 0, 0, t('hub.exportLog'), () =>
      download(exportLog(playtest.current(), clock())),
    ).moveTo(HUB.margin, HUB.exportY);
  }
}
