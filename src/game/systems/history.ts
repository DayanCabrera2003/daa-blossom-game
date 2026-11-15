import { itemAt } from '@core/shared/itemAt';
/**
 * The states a level has gone through and which one is shown. Undo, redo and the sun (GDD 0.5) are
 * all moves of the same cursor, so there is never a second position to keep in step. Acting with
 * the cursor in the past drops the future, as undoing and then doing something else always does.
 * A floor, once laid, is the earliest state the cursor may go back to (GDD §5.2): what the garden
 * did before the player took over stays done.
 */
export interface History<T> {
  readonly states: readonly T[];
  readonly cursor: number;
  /** The earliest state undo and the sun reach; the first one when no floor was laid. */
  readonly floor?: number;
}

/** A history holding only the starting state. */
export const startHistory = <T>(first: T): History<T> => ({ states: [first], cursor: 0 });

/** The state shown now. */
export const current = <T>(history: History<T>): T => itemAt(history.states, history.cursor);

/** The earliest state undo and the sun reach. */
export const floorOf = <T>(history: History<T>): number => history.floor ?? 0;

/** Whether there is a state before the shown one (above the floor), or after it. */
export const canUndo = <T>(history: History<T>): boolean => history.cursor > floorOf(history);
export const canRedo = <T>(history: History<T>): boolean =>
  history.cursor < history.states.length - 1;

/** Records a new state after the shown one, dropping anything that had been undone. */
export const push = <T>(history: History<T>, state: T): History<T> => ({
  ...history,
  states: [...history.states.slice(0, history.cursor + 1), state],
  cursor: history.cursor + 1,
});

/** Lays the floor at the state shown now: undo and the sun never go back past it. */
export const layFloor = <T>(history: History<T>): History<T> => ({
  ...history,
  floor: history.cursor,
});

/** Shows the state at `step`, clamped to the day above the floor: this is what dragging the sun does. */
export const seek = <T>(history: History<T>, step: number): History<T> => ({
  ...history,
  cursor: Math.max(floorOf(history), Math.min(history.states.length - 1, Math.round(step))),
});

/** One step back, or forward; at either end, nothing changes. */
export const undo = <T>(history: History<T>): History<T> => seek(history, history.cursor - 1);
export const redo = <T>(history: History<T>): History<T> => seek(history, history.cursor + 1);
