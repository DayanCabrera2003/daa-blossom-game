import type { FlowStep } from './flow';
import type { LevelData } from './schema';

/** The lines one step of the script may say: its own lines, questions, answers and reactions. */
function stepLines(step: FlowStep): string[] {
  switch (step.step) {
    case 'say':
      return [...step.lines];
    case 'play':
      return step.reactions.flatMap((reaction) => reaction.say);
    case 'ask':
      return [
        step.prompt,
        ...step.options.flatMap((option) =>
          option.reply === undefined ? [option.line] : [option.line, option.reply],
        ),
      ];
    case 'bet':
    case 'count':
      return [step.prompt];
    default:
      return [];
  }
}

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
  return [
    ...new Set([
      ...level.flow.flatMap(stepLines),
      ...level.hints.map((hint) => hint.line),
      ...notebook,
    ]),
  ];
}
