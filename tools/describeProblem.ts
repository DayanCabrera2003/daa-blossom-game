// Turns level problems into one-line messages for the check-levels report.
import type { WalkthroughProblem } from '@game/systems/walkthrough';
import type { IntegrityProblem } from '@levels/integrity';
import type { LoadError } from '@levels/loader';

/** A reason's code followed by its details, e.g. `notAdjacent {"u":0,"v":2}`. */
const withDetails = ({ code, ...details }: { readonly code: string }): string =>
  Object.keys(details).length > 0 ? `${code} ${JSON.stringify(details)}` : code;

/** One readable line for an integrity problem. */
export function describeProblem(problem: IntegrityProblem): string {
  switch (problem.code) {
    case 'playWithoutVictory':
      return 'the script has a play step, but the level has no victory to end it';
    case 'victoryWithoutPlay':
      return 'the level has a victory, but its script has no play step to reach it';
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
    case 'sameKindVine':
      return `vine ${problem.u}–${problem.v} joins two ${problem.kind}s, but a bee only pairs with a flower`;
    case 'noCorrectOption':
      return `script step ${problem.step + 1} asks a question with no right answer`;
    case 'notebookMissing':
      return `script step ${problem.step + 1} opens the notebook, but the level has no notebook question`;
    case 'mirrorMissing':
      return `script step ${problem.step + 1} needs the reflection, but the level has no mirror`;
    case 'pieceOutsideTangle':
      return `script step ${problem.step + 1} counts the piece through ${problem.sprout}, which is in no thread or loop`;
    case 'drawUnbeatable':
      return `script step ${problem.step + 1} asks for a better reflection, but the lanterns already hold the most`;
    case 'betOutOfRange':
      return `script step ${problem.step + 1} bets from 1 to ${problem.range} lanterns, but the garden holds ${problem.optimum}: nobody can win it`;
    case 'demoRefused':
      return `script step ${problem.step + 1}: demo move ${problem.move + 1} is refused by the rules: ${withDetails(problem.reason)}`;
    case 'badCounterexample':
      return `notebook statement ${problem.option + 1}: its counterexample is no garden: ${withDetails(problem.error)}`;
    case 'counterexampleLocked':
      return `notebook statement ${problem.option + 1}: its counterexample uses "${problem.action}", which this level does not allow`;
    case 'counterexampleUnbeatable':
      return `notebook statement ${problem.option + 1}: its lanterns already hold the most, so no better reflection can be drawn`;
    case 'counterexampleSameKindVine':
      return `notebook statement ${problem.option + 1}: its vine ${problem.u}–${problem.v} joins two ${problem.kind}s, but a bee only pairs with a flower`;
  }
}

/** One readable line for a walkthrough that does not play through the interface. */
export function describeWalkthroughProblem(problem: WalkthroughProblem): string {
  switch (problem.code) {
    case 'moveRefused':
      return `walkthrough entry ${problem.entry + 1} is refused while playing: ${withDetails(problem.reason)}`;
    case 'gestureImpossible':
      return `walkthrough entry ${problem.entry + 1} cannot be made with gestures: ${problem.message}`;
    case 'gestureMismatch':
      return `walkthrough entry ${problem.entry + 1}: the gestures make a different move`;
    case 'inputIgnored':
      return `walkthrough entry ${problem.entry + 1} is an input the script is not waiting for`;
    case 'unfinished':
      return `the walkthrough ends with the script still waiting at step ${problem.step + 1}`;
  }
}

/** One readable line for a file that did not load. */
export function describeLoadError(error: LoadError): string {
  return error.code === 'schema'
    ? `schema: ${error.issues.join('; ')}`
    : `${error.code}: ${JSON.stringify(error.error)}`;
}
