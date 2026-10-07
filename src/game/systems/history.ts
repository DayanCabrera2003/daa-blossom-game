import { itemAt } from '@core/shared/itemAt';
/**
 * The states a level has gone through and which one is shown. Undo, redo and the sun (GDD 0.5) are
 * all moves of the same cursor, so there is never a second position to keep in step. Acting with
 * the cursor in the past drops the future, as undoing and then doing something else always does.
 */
export interface History<T> {
  readonly states: readonly T[];
  readonly cursor: number;
}

/** A history holding only the starting state. */
export const startHistory = <T>(first: T): History<T> => ({ states: [first], cursor: 0 });

/** The state shown now. */
export const current = <T>(history: History<T>): T => itemAt(history.states, history.cursor);

/** Whether there is a state before the shown one, or after it. */
export const canUndo = <T>(history: History<T>): boolean => history.cursor > 0;
export const canRedo = <T>(history: History<T>): boolean =>
  history.cursor < history.states.length - 1;

/** Records a new state after the shown one, dropping anything that had been undone. */
export const push = <T>(history: History<T>, state: T): History<T> => ({
  states: [...history.states.slice(0, history.cursor + 1), state],
  cursor: history.cursor + 1,
});

/** Shows the state at `step`, clamped to the day: this is what dragging the sun does. */
export const seek = <T>(history: History<T>, step: number): History<T> => ({
  ...history,
  cursor: Math.max(0, Math.min(history.states.length - 1, Math.round(step))),
});

/** One step back, or forward; at either end, nothing changes. */
export const undo = <T>(history: History<T>): History<T> => seek(history, history.cursor - 1);
export const redo = <T>(history: History<T>): History<T> => seek(history, history.cursor + 1);
