import type { VertexId } from '@core/graph/types';
import type { Action } from '@core/rules/actions';
import { applyAction } from '@core/rules/applyAction';
import type { VictoryCondition } from '@core/rules/victory';
import type { Level } from './build';
import { gardenAtPlay } from './playStart';

/** What a grade-2 hint can give away: a decisive move of the solution, or its final certificate. */
export type RevealedPart = 'fold' | 'chain' | 'chainEnds' | 'stem' | 'certificate';

/** Something wrong with the hints of a level (plan 10, phase 5). */
export type HintProblem =
  /**
   * The grade-2 hint lights up the answer itself: the sprouts of a decisive move of the reference
   * solution, or two or more stones, scarecrows or moons of its final certificate. Grade 2 points at
   * a zone or asks a question (GDD §5.3); only grade 3, the mentor's step, gives the move.
   */
  { readonly code: 'hintReveals'; readonly line: string; readonly reveals: RevealedPart };

/** The victories won by presenting a certificate: scarecrows, or stones (the moons in 7.4). */
const CERTIFICATES: ReadonlySet<VictoryCondition['type']> = new Set([
  'coverCertificate',
  'coverComplete',
  'tutteBergeCertificate',
  'moonCertificate',
]);

/** The same sprouts, in any order and each once. */
const sameSprouts = (a: readonly VertexId[], b: readonly VertexId[]): boolean => {
  const set = new Set(a);
  return set.size === new Set(b).size && b.every((v) => set.has(v));
};

/**
 * The sprouts each decisive move of a solution names, with what lighting them up would give away.
 * A fold names the vine where the suns meet; a chain (and a join, a chain of one vine) its path and
 * its two ends; a turn of the stem its stem. Marks, the light's steps, inspections and unfolding
 * only search or look: they decide nothing a hint could spoil.
 */
function decisiveSets(solution: readonly Action[]): { sprouts: VertexId[]; part: RevealedPart }[] {
  return solution.flatMap((move): { sprouts: VertexId[]; part: RevealedPart }[] => {
    switch (move.type) {
      case 'foldAt':
        return [{ sprouts: [move.from, move.to], part: 'fold' }];
      case 'join':
        return [{ sprouts: [move.u, move.v], part: 'chain' }];
      case 'chain': {
        const ends = [move.path[0], move.path[move.path.length - 1]];
        return [
          { sprouts: [...move.path], part: 'chain' },
          { sprouts: ends.filter((v): v is VertexId => v !== undefined), part: 'chainEnds' },
        ];
      }
      case 'rotateStem':
        return [{ sprouts: [...move.stem], part: 'stem' }];
      default:
        return [];
    }
  });
}

/**
 * The final certificate of the reference solution, in a level won by presenting one: the
 * scarecrows and stones it leaves in the garden. Empty in every other level. The solution is
 * played from where the play step starts, while the rules accept it (a refusal is the integrity
 * checks' to report).
 */
function finalCertificate(level: Level): readonly VertexId[] {
  const { victory } = level.data;
  if (victory === undefined || !CERTIFICATES.has(victory.type)) return [];
  let state = gardenAtPlay(level);
  for (const move of level.solution) {
    const outcome = applyAction(state, move);
    if (!outcome.ok) break;
    state = outcome.state;
  }
  return [...state.scarecrows, ...state.stones];
}

/**
 * `hintReveals` (plan 10, phase 5): the sprouts the grade-2 hint lights up are never exactly a
 * decisive move of the reference solution (`decisiveSets`), nor two or more sprouts all inside its
 * final certificate. A wider zone that holds the answer, a single sprout, or the whole garden (which
 * points at nothing) is fine, and so is a hint that lights nothing up.
 */
export function checkHints(level: Level): HintProblem[] {
  const hint = level.hints[1];
  if (hint === undefined) return [];
  const { highlight, line } = hint;
  if (highlight.length < 2 || highlight.length === level.graph.n) return [];
  const decisive = decisiveSets(level.solution).find(({ sprouts }) =>
    sameSprouts(sprouts, highlight),
  );
  if (decisive !== undefined) return [{ code: 'hintReveals', line, reveals: decisive.part }];
  const certificate = new Set(finalCertificate(level));
  if (highlight.every((v) => certificate.has(v))) {
    return [{ code: 'hintReveals', line, reveals: 'certificate' }];
  }
  return [];
}
