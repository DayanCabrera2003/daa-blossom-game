import notation from '@content/es/notation.json';
import type { Level } from '@levels/build';
import { catalog } from '@levels/catalog';
import type { Bus } from '@services/bus';
import type { BusEvents, TeacherFeed } from '@services/busEvents';
import type { Translate } from '@services/i18n';
import { diagramGarden, type DiagramGarden } from '@ui/model/diagramGarden';
import { fitGarden, miniGarden, type MiniLayout, type MiniMoment } from '@ui/model/miniGarden';
import { walkTo, type PanelState } from '@ui/model/teacherPanel';
import {
  dayMoment,
  edmondsMoment,
  edmondsRows,
  teacherTrace,
  type TeacherTrace,
} from '@ui/model/teacherTrace';
import { LOOK_ONLY, drawGarden, gardenSvg } from '../diagram/GardenSvg';
import { diagramButton, part } from '../diagram/parts';
import { stepControls } from '../diagram/stepControls';
import type { TeacherView } from '../teacherShell';
import { texLine, traceList, type TraceList } from './traceList';
import '../diagram/diagram.css';
import './teacher.css';

/**
 * The teacher's trace panel beside the garden (GDD §5.8; plan 07, phase 13), at the right of the
 * window in the room the canvas leaves it (`game/scale/panelRoom.ts`), so it never covers a sprout.
 * From the top: the badge of teacher mode with the way to fold it (T, Escape or its button); the
 * small garden of the step chosen; "Your day", a row per move written in the notation of the
 * Codex, with the step the sun shows marked and followed as the sun moves, and a press on a row
 * moving the game's sun to it (`teacher.sun`); "Edmonds from here",
 * the core's run from the lanterns of that step, walked with its own sun, a press on a row or the
 * arrows, its vines examined (the cost) shown until a button hides them, each line keeping its
 * step; and the certificate that closes it. What it shows is decided in `ui/model/teacherTrace`
 * and `ui/model/teacherPanel`; this module only builds the DOM.
 */

/** Which trace the small garden shows, and at which step. */
type Chosen = { readonly list: 'day' | 'edmonds'; readonly step: number };

/** The levels of the catalog by id, gathered the first time the panel opens. */
let levels: ReadonlyMap<string, Level> | null = null;

/** The garden of the level `id`, with its names and places; null for an unknown level. */
function gardenOf(id: string): DiagramGarden | null {
  levels ??= new Map(catalog().map((level) => [level.data.id, level]));
  const found = diagramGarden(
    { level: id },
    { level: (level) => levels?.get(level), card: () => undefined },
  );
  return found.ok ? found.value : null;
}

/** Builds the panel in `layer`; it draws nothing until it is shown a feed. */
export function mountTeacherPanel(
  layer: HTMLElement,
  bus: Bus<BusEvents>,
  t: Translate,
): TeacherView {
  const page = layer.ownerDocument;
  const panel = part(page, 'aside', 'teacher-panel');
  panel.setAttribute('aria-label', t('teacher.panel'));
  const fold = (): void => bus.emit('teacher.toggle');

  const head = part(page, 'header', 'teacher-head');
  const foldButton = diagramButton(page, t('teacher.fold'), fold);
  foldButton.setAttribute('aria-keyshortcuts', 'T Escape');
  head.append(
    part(page, 'span', 'teacher-badge', t('teacher.badge')),
    part(page, 'h2', 'teacher-title', t('hud.trace')),
    foldButton,
  );
  const keys = part(page, 'p', 'teacher-keys', t('teacher.keys'));

  const figure = part(page, 'figure', 'codex-diagram teacher-garden');
  const svg = gardenSvg(page, t('diagram.garden'));
  const caption = part(page, 'figcaption', 'teacher-caption');
  caption.setAttribute('aria-live', 'polite');
  figure.append(svg, caption);

  const daySection = part(page, 'section', 'teacher-section');
  const edmondsSection = part(page, 'section', 'teacher-section');
  const certificate = part(page, 'section', 'teacher-section teacher-certificate');
  panel.append(head, keys, figure, daySection, edmondsSection, certificate);
  layer.replaceChildren(panel);
  // Escape anywhere in the panel folds it, and never reaches the garden (it would leave the level).
  panel.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    event.stopPropagation();
    fold();
  });

  // What is drawn now: the feed, its garden and traces, and the step chosen.
  let fed: TeacherFeed | null = null;
  let garden: DiagramGarden | null = null;
  let layout: MiniLayout | null = null;
  let trace: TeacherTrace | null = null;
  let dayList: TraceList | null = null;
  let edmondsList: TraceList | null = null;
  let sun: ReturnType<typeof stepControls> | null = null;
  let chosen: Chosen = { list: 'day', step: 0 };
  // Whether "Edmonds from here" lists the vines examined; kept from feed to feed.
  let scans = true;
  const scansButton = diagramButton(page, '', () => {
    scans = !scans;
    writeEdmonds();
    choose(chosen);
  });
  /** The scans button says what a press on it will do, and whether the lines are shown. */
  const labelScans = (): void => {
    scansButton.textContent = t(scans ? 'teacher.scans.hide' : 'teacher.scans.show');
    scansButton.setAttribute('aria-pressed', String(scans));
  };

  /** Shows `next` in the small garden and marks it on its list. */
  const choose = (next: Chosen): void => {
    if (fed === null || garden === null || layout === null || trace === null) return;
    const last = next.list === 'day' ? fed.day.length - 1 : trace.trace.length;
    chosen = { list: next.list, step: walkTo(next.step, last) };
    const moment: MiniMoment =
      chosen.list === 'day' ? dayMoment(fed, chosen.step) : edmondsMoment(trace, chosen.step);
    drawGarden(svg, miniGarden(garden, layout, moment), { ...LOOK_ONLY, t });
    const where = { step: chosen.step, count: last };
    caption.textContent = t(`teacher.shown.${chosen.list}`, where);
    dayList?.mark(chosen.list === 'day' ? chosen.step : null, fed.cursor);
    edmondsList?.mark(chosen.list === 'edmonds' ? chosen.step : null);
    const run = chosen.list === 'edmonds' ? chosen.step : 0;
    sun?.show(run, t('teacher.shown.edmonds', { step: run, count: trace.trace.length }));
  };

  /** Writes "Edmonds from here" of the trace shown: its sun, the scans button and its lines. */
  const writeEdmonds = (): void => {
    if (trace === null) return;
    const focused = page.activeElement === edmondsList?.element;
    edmondsList = traceList(
      page,
      t('teacher.edmonds'),
      t('teacher.edmondsStart'),
      edmondsRows(trace, scans).map(({ step, tex }) => ({ step, lines: [tex] })),
      (step) => choose({ list: 'edmonds', step }),
      fold,
    );
    sun = stepControls(page, t, 0, trace.trace.length, (step) => choose({ list: 'edmonds', step }));
    labelScans();
    // The run's sun and the scans button, in the wood and colours of the Codex's controls.
    const controls = part(page, 'div', 'codex-diagram teacher-controls');
    controls.append(...sun.rows, scansButton);
    edmondsSection.replaceChildren(
      part(page, 'h3', 'teacher-heading', t('teacher.edmonds')),
      part(page, 'p', 'teacher-help', t('teacher.edmondsHelp')),
      controls,
      edmondsList.element,
    );
    if (focused) edmondsList.element.focus();
  };

  /** Chooses step `step` of the day, and asks the game's sun to show it too. */
  const chooseDay = (step: number): void => {
    choose({ list: 'day', step });
    if (fed !== null && step !== fed.cursor) bus.emit('teacher.sun', { step });
  };

  /** Writes the two traces of a new feed; the small garden follows the sun. */
  const write = (feed: TeacherFeed): void => {
    // A list walked with the keys keeps the keyboard once it is written anew (`writeEdmonds`
    // keeps its own).
    const dayFocused = page.activeElement === dayList?.element;
    if (garden === null || fed?.level !== feed.level) {
      garden = gardenOf(feed.level);
      layout = garden === null ? null : fitGarden(garden.positions);
    }
    fed = feed;
    if (garden === null) return;
    trace = teacherTrace(feed, garden.names, notation);
    dayList = traceList(page, t('teacher.day'), t('teacher.dawn'), trace.day, chooseDay, fold);
    daySection.replaceChildren(
      part(page, 'h3', 'teacher-heading', t('teacher.day')),
      part(page, 'p', 'teacher-help', t('teacher.dayHelp')),
      dayList.element,
    );
    writeEdmonds();
    const proof = part(page, 'ul', 'teacher-proof');
    proof.append(
      ...trace.certificate.map((tex) => {
        const item = part(page, 'li', 'teacher-proof-line');
        item.append(texLine(page, tex));
        return item;
      }),
    );
    certificate.replaceChildren(
      part(page, 'h3', 'teacher-heading', t('teacher.certificate')),
      proof,
    );
    choose({ list: 'day', step: feed.cursor });
    if (dayFocused) dayList.element.focus();
  };

  return {
    show(state: PanelState) {
      if (state.feed !== null && state.feed !== fed) write(state.feed);
    },
  };
}
