import Phaser from 'phaser';
import { download } from '@services/download';
import { exportLog } from '@services/exportLog';
import { unlockedLevels, visibleLevels } from '@services/progress';
import { Button } from '../view/Button';
import { PALETTE } from '../view/palette';
import { CANVAS_HEIGHT } from '../scale/integerZoom';
import { textStyle } from '../view/textStyle';
import { contextOf } from './context';

/**
 * The greybox hub: the levels of the game by chapter, with their stars; levels not yet open are
 * shown greyed out. In the final game this is the growing garden (GDD §4.1).
 */
export class HubScene extends Phaser.Scene {
  constructor() {
    super('hub');
  }

  create(): void {
    const { catalog, t, save, teacherMode, playtest, clock } = contextOf(this);
    this.add.text(8, 6, t('hub.title'), textStyle(12, PALETTE.lit));

    // Drafts (test levels of chapters not yet written) are shown in teacher mode only.
    const shown = visibleLevels(
      catalog.map((level) => ({ id: level.data.id, draft: level.data.draft })),
      teacherMode,
    );
    const open = unlockedLevels(shown, save, teacherMode);
    const chapters = [...new Set(shown.map((level) => level.id.split('.')[0] as string))];
    chapters.forEach((chapter, row) => {
      const y = 30 + 22 * row;
      this.add.text(8, y, t('hub.chapter', { number: chapter }), textStyle(8));
      let x = 80;
      for (const { id } of shown.filter((level) => level.id.startsWith(`${chapter}.`))) {
        const stars = save.levels[id]?.stars ?? 0;
        const label = open.has(id) ? `${id} ${'★'.repeat(stars)}` : `${id} ·`;
        const button = new Button(this, x, y, label, () =>
          this.scene.start('level', { levelId: id }),
        );
        button.setEnabled(open.has(id));
        x += button.width + 4;
      }
    });

    // Playtesters send this file back; nothing leaves the browser otherwise (GDD §10).
    new Button(this, 8, CANVAS_HEIGHT - 18, t('hub.exportLog'), () =>
      download(exportLog(playtest.current(), clock())),
    );
  }
}
