// Entry point and composition root: builds what every scene shares, the bus and the save store the
// game shares with the DOM overlays, then starts the game at the largest whole zoom that fits the
// window, keeping it so on resize, and making room beside the canvas for the teacher's panel.
import strings from '@content/es/strings.json';
import lines from '@content/es/lines.json';
import { catalog } from '@levels/catalog';
import { browserStorage } from '@services/browserStorage';
import { createBus } from '@services/bus';
import { codexSources, openCodex } from '@services/codexProgress';
import type { BusEvents } from '@services/busEvents';
import { createTranslator } from '@services/i18n';
import { createLines } from '@services/lines';
import { playtestRecorder } from '@services/playtestRecorder';
import { createSaveStore } from '@services/saveStore';
import { loadSettings } from '@services/settings';
import { requestedGarden } from '@services/startGarden';
import { requestedCodex, requestedLevel } from '@services/startLevel';
import { isTeacherMode } from '@services/teacherMode';
import Phaser from 'phaser';
import { AudioBus } from './game/audio/AudioBus';
import { bookSounds } from './game/systems/bookSounds';
import { PIXEL_FONT } from './game/picture/pixelFont';
import { MusicPlayer } from './game/audio/MusicPlayer';
import { gameConfig } from './game/config';
import { provideContext } from './game/scenes/context';
import { openSandbox } from './game/scenes/SandboxGate';
import { CANVAS_HEIGHT, CANVAS_WIDTH } from './game/scale/integerZoom';
import { panelRoom, panelUnit } from './game/scale/panelRoom';
import { renderZoom, setRenderZoom } from './game/view/renderZoom';
import { mountShell } from './ui/shell';
import { mountTeacherShell } from './ui/teacherShell';

const storage = browserStorage();
const clock = (): number => Date.now();
const playtest = playtestRecorder(storage);
playtest.record([{ kind: 'sessionStart', at: clock() }]);
/** Whether the teacher's trace panel is open at the right of the window. */
let panelOpen = false;
/** The canvas's zoom and the panel's width for the window as it is now. */
const roomForWindow = () => panelRoom(window.innerWidth, window.innerHeight, panelOpen);
/** The whole zoom, also as the CSS variable `--zoom`, so the books size their pixels like the canvas. */
const applyZoom = (zoom: number): void => {
  setRenderZoom(zoom);
  document.documentElement.style.setProperty('--zoom', String(zoom));
};
applyZoom(roomForWindow().zoom);
// Text is laid out when a scene starts, so the pixel font must be ready first. A failed load leaves
// the monospace fallback of the text styles, never a game that does not start.
await document.fonts.load(`${PIXEL_FONT.nativeSize}px ${PIXEL_FONT.family}`).catch(() => []);
const game = new Phaser.Game(gameConfig(document.body, renderZoom()));
const levels = catalog();
const settings = loadSettings(storage);
const audio = new AudioBus(game, settings);
const bus = createBus<BusEvents>();
const saves = createSaveStore(storage);
const teacherMode = isTeacherMode(window.location.search);
provideContext(game, {
  catalog: levels,
  t: createTranslator(strings),
  line: createLines(lines),
  storage,
  teacherMode,
  startLevel: requestedLevel(
    window.location.search,
    levels.map((level) => level.data.id),
  ),
  startGarden: requestedGarden(window.location.search),
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
const codexLevels = codexSources(levels);
mountShell({
  bus,
  saves,
  codexOpen: (save) => openCodex(codexLevels, save, teacherMode),
  host: document.body,
});
// The free mode is registered (its thin gate, which loads it on demand): the overlays may offer it
// now that they listen, and the epilogue's button opens it from the scene that is up.
bus.emit('capabilities', { sandbox: true });
bus.on('sandbox.open', () => openSandbox(game));
// In teacher mode, the trace panel beside the garden, folded until asked for.
if (teacherMode) mountTeacherShell({ bus, host: document.body });
bus.on('overlay.changed', ({ open }) => {
  game.input.enabled = !open;
  if (game.input.keyboard !== null) game.input.keyboard.enabled = !open;
});
const soundOf = bookSounds();
bus.on('sound', (sound) => void audio.play('sfx', soundOf(sound)));
/**
 * Fits the canvas to the window at its whole zoom, and when the teacher's panel is open shares the
 * window with it: the page body ends where the panel starts, so the canvas centres in what is left
 * and no sprout lies under the panel; the panel's pixel is the books' at that zoom while its lines
 * stay long enough.
 */
const relayout = (): void => {
  const { zoom, panel } = roomForWindow();
  document.documentElement.style.setProperty('--teacher-width', `${panel}px`);
  document.documentElement.style.setProperty('--teacher-unit', String(panelUnit(zoom, panel)));
  document.body.style.marginRight = `${panel}px`;
  if (zoom !== renderZoom()) {
    applyZoom(zoom);
    game.scale.resize(CANVAS_WIDTH * zoom, CANVAS_HEIGHT * zoom);
  } else {
    game.scale.refresh();
  }
};
window.addEventListener('resize', relayout);
bus.on('teacher.panel', ({ open }) => {
  panelOpen = open;
  relayout();
});
// In teacher mode, `?codex=C8` opens the Codex at that entry as the game starts.
const codexAtStart = requestedCodex(window.location.search);
if (codexAtStart !== null) bus.emit('book.open', codexAtStart);
