// Entry point and composition root: builds what every scene shares, the bus and the save store the
// game shares with the DOM overlays, then starts the game at the largest whole zoom in device
// pixels that fits the window, keeping it so on resize and on a change of density, making room
// beside the canvas for the teacher's panel, and asking to turn a phone held upright.
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
import { openCredits } from './game/scenes/CreditsGate';
import { openSandbox } from './game/scenes/SandboxGate';
import { CANVAS_HEIGHT, CANVAS_WIDTH, cssPixel, usableDensity } from './game/scale/integerZoom';
import { asksToTurn } from './game/scale/orientation';
import { panelPixel, panelRoom, type PanelRoom } from './game/scale/panelRoom';
import { renderZoom, setRenderZoom } from './game/view/renderZoom';
import { mountLiveRegion } from './ui/a11y/liveRegion';
import { mountMotionMark } from './ui/a11y/motionMark';
import { mountRotateNotice } from './ui/rotateNotice';
import { mountShell } from './ui/shell';
import { mountTeacherShell } from './ui/teacherShell';

const storage = browserStorage();
const clock = (): number => Date.now();
const playtest = playtestRecorder(storage);
playtest.record([{ kind: 'sessionStart', at: clock() }]);
/** Whether the teacher's trace panel is open at the right of the window. */
let panelOpen = false;
/** The screen's device pixels per CSS pixel, now (it changes with the browser's zoom or screen). */
const density = (): number => usableDensity(window.devicePixelRatio);
/** The canvas's zoom and the panel's width for the window as it is now. */
const roomForWindow = () => panelRoom(window.innerWidth, window.innerHeight, panelOpen, density());
/**
 * The whole zoom in device pixels, and the canvas's pixel in CSS pixels as the CSS variable
 * `--zoom`, so the books size their pixels like the canvas.
 */
const applyZoom = (zoom: number): void => {
  setRenderZoom(zoom);
  document.documentElement.style.setProperty('--zoom', String(cssPixel(zoom, density())));
};
applyZoom(roomForWindow().zoom);
// Text is laid out when a scene starts, so the pixel font must be ready first. A failed load leaves
// the monospace fallback of the text styles, never a game that does not start.
await document.fonts.load(`${PIXEL_FONT.nativeSize}px ${PIXEL_FONT.family}`).catch(() => []);
const game = new Phaser.Game(gameConfig(document.body, renderZoom(), density()));
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
// The free mode and the credits are registered (their thin gates, which load them on demand): the
// overlays may offer them now that they listen, and the epilogue's buttons open them from the scene
// that is up.
bus.emit('capabilities', { sandbox: true, credits: true });
bus.on('sandbox.open', () => openSandbox(game));
// The credits' thin gate is registered too: the settings panel and the epilogue open them.
bus.on('credits.open', () => openCredits(game));
// The page says how much it moves, for the books' and the epilogue's styles: the game's motion
// setting, which starts by following the system's preference.
mountMotionMark({
  bus,
  root: document.documentElement,
  choice: settings.motion,
  system: window.matchMedia('(prefers-reduced-motion: reduce)'),
});
// A screen reader hears the dialogue, the notices and the questions through a live region, and
// reads the canvas as one picture named after the game.
mountLiveRegion({ bus, host: document.body });
const nameCanvas = (): void => {
  game.canvas.setAttribute('role', 'img');
  game.canvas.setAttribute('aria-label', createTranslator(strings)('hub.title'));
};
if (game.isBooted) nameCanvas();
else game.events.once(Phaser.Core.Events.READY, nameCanvas);
// In teacher mode, the trace panel beside the garden, folded until asked for.
const teacherShell = teacherMode ? mountTeacherShell({ bus, host: document.body }) : null;
// Over everything, the notice that asks to turn a phone held upright, out of sight until then.
const turnNotice = mountRotateNotice({
  host: document.body,
  text: createTranslator(strings)('notice.turnPhone'),
});
bus.on('overlay.changed', ({ open }) => {
  game.input.enabled = !open;
  if (game.input.keyboard !== null) game.input.keyboard.enabled = !open;
});
const soundOf = bookSounds();
bus.on('sound', (sound) => void audio.play('sfx', soundOf(sound)));
/**
 * Lays out the page round the canvas for the window as it is now: the teacher's panel's room (out
 * of sight where it does not fit) and the notice to turn a phone held upright. Returns the room.
 */
const layoutPage = (): PanelRoom => {
  const room = roomForWindow();
  teacherShell?.fit(room.fits);
  document.documentElement.style.setProperty('--teacher-width', `${room.panel}px`);
  document.documentElement.style.setProperty('--teacher-unit', String(panelPixel(room, density())));
  document.body.style.marginRight = `${room.panel}px`;
  turnNotice.show(asksToTurn(window.innerWidth, window.innerHeight, density()));
  return room;
};
/** The density the canvas was last shown at. */
let shownDensity = density();
/**
 * Fits the canvas to the window at its whole zoom in device pixels, and when the teacher's panel is
 * open and fits shares the window with it: the page body ends where the panel starts, so the canvas
 * centres in what is left and no sprout lies under the panel; the panel's pixel is the books' at
 * that zoom while its lines stay long enough (`layoutPage`).
 */
const relayout = (): void => {
  const { zoom } = layoutPage();
  if (zoom === renderZoom() && density() === shownDensity) {
    game.scale.refresh();
    return;
  }
  applyZoom(zoom);
  shownDensity = density();
  game.scale.resize(CANVAS_WIDTH * zoom, CANVAS_HEIGHT * zoom);
  // Shown at its size over the density, in CSS pixels; this also writes the canvas's style size.
  game.scale.setZoom(1 / shownDensity);
};
window.addEventListener('resize', relayout);
/**
 * Watches the density the page is shown at (the browser's zoom, a window dragged to another
 * screen), which changes without always resizing the window, and lays the canvas out again.
 */
const watchDensity = (): void => {
  window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`).addEventListener(
    'change',
    () => {
      relayout();
      watchDensity();
    },
    { once: true },
  );
};
watchDensity();
// The page opens laid out (the canvas already is, at its zoom): a phone held upright gets the notice.
layoutPage();
bus.on('teacher.panel', ({ open }) => {
  panelOpen = open;
  relayout();
});
// In teacher mode, `?codex=C8` opens the Codex at that entry as the game starts.
const codexAtStart = requestedCodex(window.location.search);
if (codexAtStart !== null) bus.emit('book.open', codexAtStart);
