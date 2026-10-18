import type { Design } from '@levels/sandbox/design';
import { current, push, type History } from './history';

/**
 * Undo and redo of the free mode's editor (plan 08, phase 11): the same cursor over states as a
 * level's (`history.ts`, already generic), holding designs. Two things only the editor needs: an
 * edit that gives back the very design shown leaves nothing to undo, and the generate menu amends
 * the garden it grew while the player tries sizes and seeds, so a single undo goes back to the
 * design from before the menu.
 */

/** Records `design` after the one shown, unless it is that very design. */
export const recordDesign = (history: History<Design>, design: Design): History<Design> =>
  design === current(history) ? history : push(history, design);

/** Puts `design` in place of the one shown, dropping anything that had been undone. */
export const amendDesign = (history: History<Design>, design: Design): History<Design> => ({
  states: [...history.states.slice(0, history.cursor), design],
  cursor: history.cursor,
});
