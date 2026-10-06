// Entry point: builds what every scene shares, then starts the game at the largest whole zoom that
// fits the window, keeping it so on resize.
import strings from '@content/es/strings.json';
import lines from '@content/es/lines.json';
import { catalog } from '@levels/catalog';
import { browserStorage } from '@services/browserStorage';
import { createTranslator } from '@services/i18n';
import { createLines } from '@services/lines';
import { loadSave } from '@services/save';
import { requestedLevel } from '@services/startLevel';
import { isTeacherMode } from '@services/teacherMode';
import Phaser from 'phaser';
import { gameConfig } from './game/config';
import { provideContext } from './game/scenes/context';
import { integerZoom } from './game/scale/integerZoom';

const storage = browserStorage();
const zoomForWindow = (): number => integerZoom(window.innerWidth, window.innerHeight);
const game = new Phaser.Game(gameConfig(document.body, zoomForWindow()));
const levels = catalog();
provideContext(game, {
  catalog: levels,
  t: createTranslator(strings),
  line: createLines(lines),
  storage,
  teacherMode: isTeacherMode(window.location.search),
  startLevel: requestedLevel(
    window.location.search,
    levels.map((level) => level.data.id),
  ),
  save: loadSave(storage),
});
window.addEventListener('resize', () => game.scale.setZoom(zoomForWindow()));
