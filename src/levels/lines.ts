import type { FlowStep } from './flow';
import type { NotebookData } from './notebook';
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
    case 'pickVine':
      return step.reply === undefined ? [step.prompt] : [step.prompt, step.reply];
    default:
      return [];
  }
}

/**
 * The lines of one notebook statement, in the order they may be heard: the statement, the mentor's
 * reply, then its counterexample's presenting line and, when it is drawn on, the line of its chain.
 */
function optionLines(option: NotebookData['options'][number]): string[] {
  const { counterexample } = option;
  return [
    option.line,
    ...(option.reply === undefined ? [] : [option.reply]),
    ...(counterexample === undefined ? [] : [counterexample.line]),
    ...(counterexample?.mode === 'mirrorDraw' ? [counterexample.found] : []),
  ];
}

/**
 * Every dialogue line a level refers to, in the order it may be heard: the script, the hints, then
 * the notebook question, its statements and what refutes them. Each id appears once, so content checks can match the ids
 * against the line table and the voice files.
 */
export function referencedLines(level: LevelData): string[] {
  const notebook =
    level.notebook === undefined
      ? []
      : [level.notebook.prompt, ...level.notebook.options.flatMap(optionLines)];
  return [
    ...new Set([
      ...level.flow.flatMap(stepLines),
      ...level.hints.map((hint) => hint.line),
      ...notebook,
    ]),
  ];
}
