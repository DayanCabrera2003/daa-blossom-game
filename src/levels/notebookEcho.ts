import { stepLines } from './lines';
import type { LevelData } from './schema';

/**
 * The right statement of a notebook question that repeats, word for word, a line the player has
 * just heard: the question then measures memory, not understanding (plan 10, phase 6).
 */
export interface NotebookEchoProblem {
  readonly code: 'notebookEcho';
  /** The question, by its index in the level's list, and the right statement in it. */
  readonly question: number;
  readonly option: number;
  /** The line heard before the notebook that the statement repeats. */
  readonly echoes: string;
  /** The words they share, normalized. */
  readonly words: string;
}

/**
 * Words that say nothing on their own: articles, pronouns, prepositions, conjunctions and the
 * commonest verbs and adverbs. A run of them ("uno de los") is shared by any two Spanish sentences.
 */
const FILLER = new Set(
  (
    'a al algo ante bajo cada como con cual cuando de del desde donde e el ella ellas ellos en ' +
    'entre era es esa ese eso esta estan este esto fue ha han hasta hay he la las le les lo los ' +
    'mas me mi mis muy nada ni no nos o otra otro para pero por porque que se si sin sobre solo ' +
    'son su sus tan te tu tus un una uno unos unas y ya yo'
  ).split(' '),
);

/** How many words in a row make an echo, and how many of them must say something. */
const RUN = 3;
const MEANINGFUL = 2;

/** The words of a text: lowercase, without accents (ñ read as n on both sides) or punctuation. */
function wordsOf(text: string): string[] {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 0);
}

/**
 * The first run of three words in a row of `statement` that `heard` also says in a row, with at
 * least two of them saying something (not filler); null when there is none.
 */
export function sharedRun(statement: string, heard: string): string | null {
  const said = ` ${wordsOf(heard).join(' ')} `;
  const words = wordsOf(statement);
  for (let start = 0; start + RUN <= words.length; start++) {
    const run = words.slice(start, start + RUN);
    const meaningful = run.filter((word) => !FILLER.has(word)).length;
    if (meaningful >= MEANINGFUL && said.includes(` ${run.join(' ')} `)) return run.join(' ');
  }
  return null;
}

/**
 * `notebookEcho` (plan 10, phase 6): the right statement of every notebook question shares no run
 * of three words (two of them meaningful) with a line said before its notebook step: the script's
 * lines, reactions while playing, questions and their answers. What comes after (the reply that
 * sums up, lines after the step) and hints, which the player may never ask for, do not count; nor
 * do the false statements, one of which half-copies the mentor on purpose. The texts come from the
 * caller (`text`, by line id), since levels never read the content.
 */
export function notebookEchoProblems(
  level: LevelData,
  text: (id: string) => string | undefined,
): NotebookEchoProblem[] {
  const problems: NotebookEchoProblem[] = [];
  level.flow.forEach((step, index) => {
    if (step.step !== 'notebook') return;
    const asked = level.notebook?.[step.question];
    if (asked === undefined) return;
    const heard = level.flow.slice(0, index).flatMap(stepLines);
    asked.options.forEach((option, at) => {
      const statement = text(option.line);
      if (!option.correct || statement === undefined) return;
      for (const line of heard) {
        const said = text(line);
        const words = said === undefined ? null : sharedRun(statement, said);
        if (words === null) continue;
        problems.push({
          code: 'notebookEcho',
          question: step.question,
          option: at,
          echoes: line,
          words,
        });
        return;
      }
    });
  });
  return problems;
}
