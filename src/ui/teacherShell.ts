import type { Bus } from '@services/bus';
import type { BusEvents } from '@services/busEvents';
import {
  FOLDED_PANEL,
  isShown,
  toggled,
  withFeed,
  withoutFeed,
  type PanelState,
} from '@ui/model/teacherPanel';

/** The teacher's panel once built: it shows a state of the panel, every time it changes. */
export interface TeacherView {
  show(state: PanelState): void;
}

/**
 * What the light shell needs of the deferred books chunk: building the panel in its layer. The
 * type lives here, not in that chunk, so the shell names it without importing it.
 */
export interface TeacherModule {
  mountTeacher(layer: HTMLElement, bus: Bus<BusEvents>): TeacherView;
}

/** The shell once mounted, as the page's layout speaks to it. */
export interface TeacherShell {
  /**
   * Tells whether the panel fits beside the canvas in the window as it is now
   * (`game/scale/panelRoom.ts`): where it does not (a phone, a narrow window), an open panel stays
   * out of sight, and shows again where it was left once there is room.
   */
  fit(fits: boolean): void;
}

/** What `mountTeacherShell` needs; `load` and `later` stand in for the chunk and the clock in tests. */
export interface TeacherShellOptions {
  readonly bus: Bus<BusEvents>;
  /** The element the layer is added to (the page body). */
  readonly host: HTMLElement;
  /** Loads the panel; by default with import(), so KaTeX stays out of the initial script. */
  readonly load?: () => Promise<TeacherModule>;
  /** Runs `run` after `ms` milliseconds. */
  readonly later?: (run: () => void, ms: number) => void;
}

/**
 * How long a level that was left may take to feed the panel again before it hides: a jump from
 * level to level (PageUp, PageDown, "next level") feeds the new one within a frame or two, so the
 * panel and the canvas stay as they are, while going back to the hub folds the room away.
 */
export const LEAVE_GRACE_MS = 300;

/**
 * Mounts the light shell of the teacher's trace panel (GDD §5.8; plan 07, phase 13): an empty layer
 * at the right of the window, hidden until the panel is opened in a level (`ui/model/teacherPanel`
 * decides when). Opening it tells the game to make room beside the canvas (`teacher.panel`) and,
 * the first time, loads the panel with the books chunk, KaTeX and all. Every feed of the level is
 * then shown as it comes. A panel that fails to load folds again, and is tried anew next time.
 * Where the window has no room for it beside the canvas, an open panel stays out of sight (`fit`).
 */
export function mountTeacherShell({
  bus,
  host,
  load = () => import('./books'),
  later = (run, ms) => void setTimeout(run, ms),
}: TeacherShellOptions): TeacherShell {
  const layer = host.ownerDocument.createElement('div');
  layer.className = 'teacher-layer';
  layer.hidden = true;
  // At the right of the window, beside the canvas, under the books' layer.
  Object.assign(layer.style, {
    position: 'fixed',
    top: '0',
    right: '0',
    bottom: '0',
    width: 'var(--teacher-width, 0px)',
    zIndex: '5',
  });
  host.appendChild(layer);

  let state = FOLDED_PANEL;
  /** Whether the window has room for the panel beside the canvas. */
  let fits = true;
  let view: TeacherView | null = null;
  let loading: Promise<void> | null = null;

  /** Builds the panel the first time it shows; a failure folds it and lets the next try load. */
  const build = (): void => {
    loading ??= load()
      .then((module) => {
        view = module.mountTeacher(layer, bus);
        if (isShown(state)) view.show(state);
      })
      .catch((error: unknown) => {
        loading = null;
        console.error(error);
        if (state.open) update(toggled(state));
      });
  };

  /** Moves to `next`, showing or hiding the layer and making room for it when that changes. */
  const update = (next: PanelState): void => {
    const was = isShown(state);
    state = next;
    const now = isShown(state);
    layer.hidden = !(now && fits);
    if (now !== was) bus.emit('teacher.panel', { open: now });
    if (!now) return;
    if (view === null) build();
    else view.show(state);
  };

  bus.on('teacher.feed', (feed) => update(withFeed(state, feed)));
  bus.on('teacher.toggle', () => update(toggled(state)));
  bus.on('teacher.leave', () => {
    const left = state.feed;
    later(() => {
      if (state.feed === left) update(withoutFeed(state));
    }, LEAVE_GRACE_MS);
  });
  return {
    fit(next) {
      fits = next;
      layer.hidden = !(isShown(state) && fits);
    },
  };
}
