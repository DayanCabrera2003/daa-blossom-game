// Turns level problems into one-line messages for the check-levels report.
import type { IntegrityProblem } from '@levels/integrity';
import type { LoadError } from '@levels/loader';

/** A reason's code followed by its details, e.g. `notAdjacent {"u":0,"v":2}`. */
const withDetails = ({ code, ...details }: { readonly code: string }): string =>
  Object.keys(details).length > 0 ? `${code} ${JSON.stringify(details)}` : code;

/** One readable line for an integrity problem. */
export function describeProblem(problem: IntegrityProblem): string {
  switch (problem.code) {
    case 'wonAtStart':
      return 'the level is already won before the player does anything';
    case 'goalMismatch':
      return `goal says ${problem.declared} lanterns, but Edmonds finds ${problem.optimum}`;
    case 'victoryOutOfReach':
      return `victory asks for ${problem.value} lanterns, but at most ${problem.optimum} fit`;
    case 'solutionLocked':
      return `solution step ${problem.step + 1} uses "${problem.action}", which this level does not allow`;
    case 'solutionRefused':
      return `solution step ${problem.step + 1} is refused by the rules: ${withDetails(problem.reason)}`;
    case 'solutionFallsShort':
      return 'the solution is accepted but does not win the level';
    case 'solutionOverWater':
      return `the solution spends ${problem.used} drops of water, over the budget of ${problem.budget}`;
    case 'foreignLine':
      return `line ${problem.line} belongs to another level`;
    case 'unlockMismatch':
      return `unlocks "${problem.action}", but the rules unlock it at ${problem.unlockedAt}`;
  }
}

/** One readable line for a file that did not load. */
export function describeLoadError(error: LoadError): string {
  return error.code === 'schema'
    ? `schema: ${error.issues.join('; ')}`
    : `${error.code}: ${JSON.stringify(error.error)}`;
}
