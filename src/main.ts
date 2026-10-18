// Entry point and composition root: builds what every scene shares, the bus and the save store the
// game shares with the DOM overlays, then starts the game at the largest whole zoom that fits the
// window, keeping it so on resize.
import strings from '@content/es/strings.json';
import lines from '@content/es/lines.json';
import { catalog } from '@levels/catalog';
import { browserStorage } from '@services/browserStorage';
import { createBus } from '@services/bus';
import type { BusEvents } from '@services/busEvents';
import { createTranslator } from '@services/i18n';
import { createLines } from '@services/lines';
import { playtestRecorder } from '@services/playtestRecorder';
import { createSaveStore } from '@services/saveStore';
import { loadSettings } from '@services/settings';
import { requestedLevel } from '@services/startLevel';
import { isTeacherMode } from '@services/teacherMode';
import Phaser from 'phaser';
import { AudioBus } from './game/audio/AudioBus';
import { bookSounds } from './game/systems/bookSounds';
import { PIXEL_FONT } from './game/picture/pixelFont';
import { MusicPlayer } from './game/audio/MusicPlayer';
import { gameConfig } from './game/config';
import { provideContext } from './game/scenes/context';
import { CANVAS_HEIGHT, CANVAS_WIDTH, integerZoom } from './game/scale/integerZoom';
import { renderZoom, setRenderZoom } from './game/view/renderZoom';
import { mountShell } from './ui/shell';

const storage = browserStorage();
const clock = (): number => Date.now();
const playtest = playtestRecorder(storage);
playtest.record([{ kind: 'sessionStart', at: clock() }]);
const zoomForWindow = (): number => integerZoom(window.innerWidth, window.innerHeight);
/** The whole zoom, also as the CSS variable `--zoom`, so the books size their pixels like the canvas. */
const applyZoom = (zoom: number): void => {
  setRenderZoom(zoom);
  document.documentElement.style.setProperty('--zoom', String(zoom));
};
applyZoom(zoomForWindow());
// Text is laid out when a scene starts, so the pixel font must be ready first. A failed load leaves
// the monospace fallback of the text styles, never a game that does not start.
await document.fonts.load(`${PIXEL_FONT.nativeSize}px ${PIXEL_FONT.family}`).catch(() => []);
const game = new Phaser.Game(gameConfig(document.body, renderZoom()));
const levels = catalog();
const settings = loadSettings(storage);
const audio = new AudioBus(game, settings);
const bus = createBus<BusEvents>();
const saves = createSaveStore(storage);
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
  bus,
  saves,
  settings,
  audio,
  music: new MusicPlayer(game, audio),
  playtest,
  clock,
});
// The DOM overlays, over the canvas. While a book is open the game takes no pointer nor key, so a
// touch or a key meant for the book never reaches the garden behind it.
mountShell({ bus, saves, host: document.body });
bus.on('overlay.changed', ({ open }) => {
  game.input.enabled = !open;
  if (game.input.keyboard !== null) game.input.keyboard.enabled = !open;
});
const soundOf = bookSounds();
bus.on('sound', (sound) => void audio.play('sfx', soundOf(sound)));
window.addEventListener('resize', () => {
  const zoom = zoomForWindow();
  if (zoom === renderZoom()) return;
  applyZoom(zoom);
  game.scale.resize(CANVAS_WIDTH * zoom, CANVAS_HEIGHT * zoom);
});
