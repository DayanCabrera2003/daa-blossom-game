import type { TeacherFeed } from '@services/busEvents';

/**
 * The teacher's trace panel as a state, decided without the DOM (GDD §5.8; plan 07, phase 13): it
 * starts folded, so a recording of the game starts clean; the trace button and the T key open and
 * fold it; it shows while it is open and a level feeds it. Leaving a level takes the garden away
 * but not the wish to see it, so jumping from level to level keeps it open. Inside it, the keys
 * walk a trace a row at a time (skipping the rows hidden), and Escape folds it.
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

/** The way a key moves, down or up the list; Home and End are handled apart. */
const STEPS: Readonly<Record<string, number>> = {
  ArrowDown: 1,
  ArrowRight: 1,
  ArrowUp: -1,
  ArrowLeft: -1,
};

/**
 * The row step `step` is marked on, among the steps `rows` of a list (ascending, from 0): its own,
 * or, for a step whose row is hidden, the last row before it.
 */
export function rowOf(rows: readonly number[], step: number): number {
  return rows.reduce((found, row) => (row <= step ? row : found), 0);
}

/**
 * What `key` does with step `shown` of a trace listed by the steps `rows` (ascending, from 0; a
 * step whose row is hidden is missing): the arrows go to the next row or the one before, from a
 * hidden step too, Home and End to the first and last rows.
 */
export function panelKey(key: string, shown: number, rows: readonly number[]): PanelKey | null {
  if (key === 'Escape') return { kind: 'fold' };
  const first = rows[0] ?? 0;
  const last = rows[rows.length - 1] ?? 0;
  if (key === 'Home') return { kind: 'step', step: first };
  if (key === 'End') return { kind: 'step', step: last };
  const way = STEPS[key];
  if (way === undefined) return null;
  const next = way > 0 ? (rows.find((row) => row > shown) ?? last) : rowOf(rows, shown - 1);
  return { kind: 'step', step: Math.max(first, next) };
}
