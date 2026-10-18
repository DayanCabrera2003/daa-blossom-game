import type { TeacherFeed } from '@services/busEvents';

/**
 * The teacher's trace panel as a state, decided without the DOM (GDD §5.8; plan 07, phase 13): it
 * starts folded, so a recording of the game starts clean; the trace button and the T key open and
 * fold it; it shows while it is open and a level feeds it. Leaving a level takes the garden away
 * but not the wish to see it, so jumping from level to level keeps it open. Inside it, the keys
 * walk the run of Edmonds a step at a time, and Escape folds it.
 */
export interface PanelState {
  /** Whether the teacher wants the panel open. */
  readonly open: boolean;
  /** The level's last feed, or null outside a level. */
  readonly feed: TeacherFeed | null;
}

/** Folded, with no level: how the panel starts. */
export const FOLDED_PANEL: PanelState = { open: false, feed: null };

/** Whether the panel is on screen. */
export const isShown = (state: PanelState): boolean => state.open && state.feed !== null;

/** The panel opened if it was folded, and folded if it was open. */
export const toggled = (state: PanelState): PanelState => ({ ...state, open: !state.open });

/** The panel with the level's newest feed. */
export const withFeed = (state: PanelState, feed: TeacherFeed): PanelState => ({ ...state, feed });

/** The panel once the level is left. */
export const withoutFeed = (state: PanelState): PanelState => ({ ...state, feed: null });

/** Step `step` of a trace whose last step is `last`, kept inside it. */
export const walkTo = (step: number, last: number): number => Math.max(0, Math.min(last, step));

/** What a key pressed in the panel does: a step to show, folding the panel, or nothing. */
export type PanelKey = { readonly kind: 'step'; readonly step: number } | { readonly kind: 'fold' };

/** The steps a key moves by; Home and End are handled apart. */
const STEPS: Readonly<Record<string, number>> = {
  ArrowDown: 1,
  ArrowRight: 1,
  ArrowUp: -1,
  ArrowLeft: -1,
};

/** What `key` does with step `shown` of a trace whose last step is `last` shown. */
export function panelKey(key: string, shown: number, last: number): PanelKey | null {
  if (key === 'Escape') return { kind: 'fold' };
  if (key === 'Home') return { kind: 'step', step: 0 };
  if (key === 'End') return { kind: 'step', step: last };
  const step = STEPS[key];
  return step === undefined ? null : { kind: 'step', step: walkTo(shown + step, last) };
}
