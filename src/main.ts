// Entry point: builds what every scene shares, then starts the game at the largest whole zoom that
// fits the window, keeping it so on resize.
import strings from '@content/es/strings.json';
import lines from '@content/es/lines.json';
import { catalog } from '@levels/catalog';
import { browserStorage } from '@services/browserStorage';
import { createTranslator } from '@services/i18n';
import { createLines } from '@services/lines';
import { playtestRecorder } from '@services/playtestRecorder';
import { loadSave } from '@services/save';
import { loadSettings } from '@services/settings';
import { requestedLevel } from '@services/startLevel';
import { isTeacherMode } from '@services/teacherMode';
import Phaser from 'phaser';
import { AudioBus } from './game/audio/AudioBus';
import { PIXEL_FONT } from './game/picture/pixelFont';
import { MusicPlayer } from './game/audio/MusicPlayer';
import { gameConfig } from './game/config';
import { provideContext } from './game/scenes/context';
import { CANVAS_HEIGHT, CANVAS_WIDTH, integerZoom } from './game/scale/integerZoom';
import { renderZoom, setRenderZoom } from './game/view/renderZoom';

const storage = browserStorage();
const clock = (): number => Date.now();
const playtest = playtestRecorder(storage);
playtest.record([{ kind: 'sessionStart', at: clock() }]);
const zoomForWindow = (): number => integerZoom(window.innerWidth, window.innerHeight);
setRenderZoom(zoomForWindow());
// Text is laid out when a scene starts, so the pixel font must be ready first. A failed load leaves
// the monospace fallback of the text styles, never a game that does not start.
await document.fonts.load(`${PIXEL_FONT.nativeSize}px ${PIXEL_FONT.family}`).catch(() => []);
const game = new Phaser.Game(gameConfig(document.body, renderZoom()));
const levels = catalog();
const settings = loadSettings(storage);
const audio = new AudioBus(game, settings);
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
  settings,
  audio,
  music: new MusicPlayer(game, audio),
  playtest,
  clock,
});
window.addEventListener('resize', () => {
  const zoom = zoomForWindow();
  if (zoom === renderZoom()) return;
  setRenderZoom(zoom);
  game.scale.resize(CANVAS_WIDTH * zoom, CANVAS_HEIGHT * zoom);
});
