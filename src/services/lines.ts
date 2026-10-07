import { missing } from './i18n';

/** The text of a dialogue line by its id (`ch4.11.sauce.03`), which also names its voice file. */
export type LineText = (id: string) => string;

/**
 * Looks up dialogue lines. In the greybox most lines are not written yet: they show as `⟨id⟩`, so
 * playtesters see where each line will be spoken.
 */
export function createLines(lines: Readonly<Record<string, string>>): LineText {
  return (id) => lines[id] ?? missing(id);
}
