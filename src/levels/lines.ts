import type { LevelData } from './schema';

/**
 * Every dialogue line a level refers to, in the order it may be heard: the script, the hints, then
 * the notebook question and its options. Each id appears once, so content checks can match the ids
 * against the line table and the voice files.
 */
export function referencedLines(level: LevelData): string[] {
  const notebook =
    level.notebook === undefined
      ? []
      : [level.notebook.prompt, ...level.notebook.options.map((option) => option.line)];
  return [...new Set([...level.script, ...level.hints.map((hint) => hint.line), ...notebook])];
}
