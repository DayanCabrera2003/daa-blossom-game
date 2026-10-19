import { isMaximum } from '@core/edmonds/fast/maximum';
import type { ActionType } from '@core/rules/actions';
import type { Level } from './build';
import { buildCounterexample } from './counterexample';
import type { GardenError } from './garden';
import { sameKindVines, type KindClash } from './kinds';
import { checkLayout, vineCrossings, type LayoutProblem } from './layoutChecks';

/** Where a statement is: the index of its question in the level's list, and its own index. */
interface StatementAt {
  readonly question: number;
  readonly option: number;
}

/** Something wrong with the notebook of a level, at one of its statements. */
export type NotebookProblem =
  /** A false statement with neither a reply nor a garden: choosing it would teach nothing. */
  | ({ readonly code: 'statementUnrefuted' } & StatementAt)
  /** The counterexample does not describe a garden. */
  | ({ readonly code: 'badCounterexample' } & StatementAt & { readonly error: GardenError })
  /** The counterexample is touched with an action the player has not met by this level. */
  | ({ readonly code: 'counterexampleLocked' } & StatementAt & { readonly action: ActionType })
  /** A garden to draw a better reflection on whose lanterns nobody can beat. */
  | ({ readonly code: 'counterexampleUnbeatable' } & StatementAt)
  /** A vine of a garden of bees and flowers joins two of a kind. */
  | ({ readonly code: 'counterexampleSameKindVine' } & StatementAt & KindClash)
  /** The counterexample's garden is hard to read: a name drawn over something, or vines crossing. */
  | ({ readonly code: 'counterexampleLayout' } & StatementAt & { readonly problem: LayoutProblem });

/**
 * The checks of a level's notebook (plan 03, phase 6) that the schema cannot see, over every one of
 * its questions: every false statement is refuted, by the mentor's reply or by a garden; each
 * counterexample is a garden under the core's rules, it is played with tools the
 * level already gives or knows and closes for the day in its own garden (a counterexample never
 * teaches a new move: 4.7 closes marks by hand, since its light searches by itself, yet its
 * counterexample is marked by hand), and a `mirrorDraw` one leaves a better
 * reflection to find, or its search would never show the chain it promises. A garden of bees and
 * flowers joins only a bee and a flower, as a level's does, and every garden reads as well as a
 * secret flower's: no name drawn over anything and no crossing vines. Its lines belonging to
 * the level is checked with every other line of the level.
 */
export function checkNotebook(level: Level): NotebookProblem[] {
  const problems: NotebookProblem[] = [];
  const statements = (level.data.notebook ?? []).flatMap((asked, question) =>
    asked.options.map((statement, option) => ({ at: { question, option }, statement })),
  );
  for (const { at, statement } of statements) {
    const { counterexample } = statement;
    if (!statement.correct && statement.reply === undefined && counterexample === undefined) {
      problems.push({ code: 'statementUnrefuted', ...at });
    }
    if (counterexample === undefined) continue;
    const built = buildCounterexample(counterexample);
    if (!built.ok) {
      problems.push({ code: 'badCounterexample', ...at, error: built.error });
      continue;
    }
    const { start } = built.value;
    for (const action of start.allowed) {
      if (!level.start.allowed.has(action) && !level.start.closed.has(action)) {
        problems.push({ code: 'counterexampleLocked', ...at, action });
      }
    }
    if (counterexample.mode === 'mirrorDraw' && isMaximum(start.graph, start.matching)) {
      problems.push({ code: 'counterexampleUnbeatable', ...at });
    }
    for (const clash of sameKindVines(counterexample.sprouts, counterexample.vines)) {
      problems.push({ code: 'counterexampleSameKindVine', ...at, ...clash });
    }
    for (const problem of [...vineCrossings(counterexample), ...checkLayout(counterexample)]) {
      problems.push({ code: 'counterexampleLayout', ...at, problem });
    }
  }
  return problems;
}
