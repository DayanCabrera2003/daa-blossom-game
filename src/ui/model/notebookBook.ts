import type { BookCommand } from './codexKeys';

/**
 * Where the open notebook is (plan 07, phase 6): it opens at the statement written last, the
 * newest, and its pages turn one statement at a time with the keys of the Codex (the arrows and the
 * page keys, Home and End); it has no tabs, so the keys that choose one do nothing. Pages are
 * numbered from 0 in the order written (`notebookPages.ts`).
 */

/** The page the notebook opens at among `count` statements, or null when none is written. */
export const openNotebook = (count: number): number | null => (count === 0 ? null : count - 1);

/** The page a command leads to from page `index` of `count`, or null when it leads nowhere new. */
export function notebookMove(count: number, index: number, command: BookCommand): number | null {
  if (command.kind === 'tab') return null;
  const target =
    command.kind === 'turn' ? index + command.step : command.step === 1 ? count - 1 : 0;
  return target === index || target < 0 || target >= count ? null : target;
}
