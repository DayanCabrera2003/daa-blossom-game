import { stepLines } from './lines';
import type { LevelData } from './schema';

/** The line heard before a question that its right answer repeats, and the words they share. */
interface Echo {
  /** The line heard before the question that the right answer repeats. */
  readonly echoes: string;
  /** The words they share, normalized. */
  readonly words: string;
}

/**
 * The right statement of a notebook question (plan 10, phase 6), or the right answer of a question
 * of the script (`askEcho`, phase 7), that repeats, word for word, a line the player has just
 * heard: the question then measures memory, not understanding.
 */
export type NotebookEchoProblem =
  /** The notebook question, by its index in the level's list, and the right statement in it. */
  | ({ readonly code: 'notebookEcho'; readonly question: number; readonly option: number } & Echo)
  /** The step of the script that asks, and the right answer in it. */
  | ({ readonly code: 'askEcho'; readonly step: number; readonly option: number } & Echo);

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

/** The first line of `heard` that `statement` echoes, with the words they share; null if none. */
function echoIn(statement: string, heard: readonly string[], text: TextOf): Echo | null {
  for (const line of heard) {
    const said = text(line);
    const words = said === undefined ? null : sharedRun(statement, said);
    if (words !== null) return { echoes: line, words };
  }
  return null;
}

/** The texts of line ids, as the caller reads them from the content. */
type TextOf = (id: string) => string | undefined;

/**
 * `notebookEcho` (plan 10, phase 6): the right statement of every notebook question shares no run
 * of three words (two of them meaningful) with a line said before its notebook step: the script's
 * lines, reactions while playing, questions and their answers. What comes after (the reply that
 * sums up, lines after the step) and hints, which the player may never ask for, do not count; nor
 * do the false statements, one of which half-copies the mentor on purpose. The right answers of
 * the questions of the script (`ask`) are held to the same rule (`askEcho`, phase 7), with their
 * own prompt and replies not counted. The texts come from the caller (`text`, by line id), since
 * levels never read the content.
 */
export function notebookEchoProblems(level: LevelData, text: TextOf): NotebookEchoProblem[] {
  const problems: NotebookEchoProblem[] = [];
  level.flow.forEach((step, index) => {
    const heard = level.flow.slice(0, index).flatMap(stepLines);
    const options =
      step.step === 'ask'
        ? step.options
        : step.step === 'notebook'
          ? level.notebook?.[step.question]?.options
          : undefined;
    options?.forEach((option, at) => {
      const statement = text(option.line);
      if (!option.correct || statement === undefined) return;
      const echo = echoIn(statement, heard, text);
      if (echo === null) return;
      problems.push(
        step.step === 'notebook'
          ? { code: 'notebookEcho', question: step.question, option: at, ...echo }
          : { code: 'askEcho', step: index, option: at, ...echo },
      );
    });
  });
  return problems;
}
