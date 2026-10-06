import Phaser from 'phaser';
import { download } from '@services/download';
import { exportLog } from '@services/exportLog';
import { unlockedLevels } from '@services/progress';
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
    const open = unlockedLevels(
      catalog.map((level) => level.data.id),
      save,
      teacherMode,
    );
    this.add.text(8, 6, t('hub.title'), textStyle(12, PALETTE.lit));

    const chapters = [...new Set(catalog.map((level) => level.data.id.split('.')[0] as string))];
    chapters.forEach((chapter, row) => {
      const y = 30 + 22 * row;
      this.add.text(8, y, t('hub.chapter', { number: chapter }), textStyle(8));
      let x = 80;
      for (const level of catalog.filter((l) => l.data.id.startsWith(`${chapter}.`))) {
        const id = level.data.id;
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
