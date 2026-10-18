// Turns level problems into one-line messages for the check-levels report.
import type { WalkthroughProblem } from '@game/systems/walkthrough';
import type { CodexProblem } from '@levels/codexChecks';
import type { IntegrityProblem } from '@levels/integrity';
import type { LoadError } from '@levels/loader';
import type { SecretProblem } from '@levels/secretChecks';

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
    case 'waterAndBet':
      return 'the level has both a water budget and a formal bet, but it can give only one extra star';
    case 'foreignLine':
      return `line ${problem.line} belongs to another level`;
    case 'unlockMismatch':
      return `unlocks "${problem.action}", but the rules unlock it at ${problem.unlockedAt}`;
    case 'sameKindVine':
      return `vine ${problem.u}–${problem.v} joins two ${problem.kind}s, but a bee only pairs with a flower`;
    case 'noCorrectOption':
      return `script step ${problem.step + 1} asks a question with no right answer`;
    case 'notebookMissing':
      return `script step ${problem.step + 1} opens a notebook question the level does not write`;
    case 'mirrorMissing':
      return `script step ${problem.step + 1} needs the reflection, but the level has no mirror`;
    case 'pieceOutsideTangle':
      return `script step ${problem.step + 1} counts the piece through ${problem.sprout}, which is in no thread or loop`;
    case 'threadsBeforeMirror':
      return `script step ${problem.step + 1} counts the winning threads before the reflection shows`;
    case 'threadsAfterSeparate':
      return `script step ${problem.step + 1} counts the winning threads after the tangle is separated, which already tells them`;
    case 'threadsOutOfRange':
      return `script step ${problem.step + 1} offers 0 to ${problem.range} winning threads, but the reflection wins ${problem.answer}`;
    case 'noConflict':
      return `script step ${problem.step + 1} is about the conflict of the search, but the reference search meets none there`;
    case 'drawUnbeatable':
      return `script step ${problem.step + 1} asks for a better reflection, but the lanterns already hold the most`;
    case 'flowerMissing':
      return `script step ${problem.step + 1} is a flower challenge, but the level declares no flower`;
    case 'noChainToDraw':
      return `script step ${problem.step + 1} asks for chains, but the garden already holds the most`;
    case 'certifyAgainWithoutCertificate':
      return `script step ${problem.step + 1} asks for another certificate, but the level is not won with stones`;
    case 'certifyAgainBeforePlay':
      return `script step ${problem.step + 1} asks for another certificate before any play step presents a first one`;
    case 'sameCertificate':
      return `script step ${problem.step + 1} asks for another certificate, but the walkthrough presents no new stones`;
    case 'recallAhead':
      return `script step ${problem.step + 1} is a recipe that recalls level ${problem.level}, which is not played yet`;
    case 'flowerAfterPlay':
      return `script step ${problem.step + 1} is a flower challenge after a play step, whose moves may undo the flower`;
    case 'betOutOfRange':
      return `script step ${problem.step + 1} bets from 1 to ${problem.range} lanterns, but the garden holds ${problem.optimum}: nobody can win it`;
    case 'raceBetWithoutRaces':
      return `script step ${problem.step + 1} is a doubling bet, but it needs a race before it and one after it`;
    case 'raceNotDoubled':
      return `script step ${problem.step + 1} bets on a doubling, but the races go from ${problem.before} to ${problem.after} sprouts of the same family`;
    case 'raceBetUnclear':
      return `script step ${problem.step + 1} bets on a doubling whose steps sit near an edge of "${problem.answer}": pick other seeds`;
    case 'demoRefused':
      return `script step ${problem.step + 1}: demo move ${problem.move + 1} is refused by the rules: ${withDetails(problem.reason)}`;
    case 'lightRefused':
      return `script step ${problem.step + 1}: move ${problem.move + 1} of the light's own search is refused by the rules: ${withDetails(problem.reason)}`;
    case 'automatonRefused':
      return `script step ${problem.step + 1}: move ${problem.move + 1} of the automaton's run is refused by the rules: ${withDetails(problem.reason)}`;
    case 'recipeCannotRun':
      return `script step ${problem.step + 1} runs a recipe the automaton cannot run: only the fold card may be missing`;
    case 'notAFlower':
      return `the declared flower is no flower of the starting lanterns: ${withDetails(problem.error)}`;
    case 'flowerBaseLit':
      return `the base ${problem.base} of the declared flower holds a lantern, but it must be in the dark`;
    case 'flowerBaseNotFirst':
      return `the declared flower must start at its base, ${problem.base}`;
    case 'flowerOffSide':
      return `sprout ${problem.sprout} sits in the right half, where the folded garden is drawn`;
    case 'badCounterexample':
      return `${statementAt(problem)}: its counterexample is no garden: ${withDetails(problem.error)}`;
    case 'counterexampleLocked':
      return `${statementAt(problem)}: its counterexample uses "${problem.action}", which this level does not allow`;
    case 'counterexampleUnbeatable':
      return `${statementAt(problem)}: its lanterns already hold the most, so no better reflection can be drawn`;
    case 'counterexampleSameKindVine':
      return `${statementAt(problem)}: its vine ${problem.u}–${problem.v} joins two ${problem.kind}s, but a bee only pairs with a flower`;
  }
}

/** Where a notebook statement is, counted from 1: its question, then the statement itself. */
const statementAt = (problem: { readonly question: number; readonly option: number }): string =>
  `notebook question ${problem.question + 1}, statement ${problem.option + 1}`;

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

/** One readable line for a problem of how the catalog opens the Codex. */
export function describeCodexProblem(problem: CodexProblem): string {
  switch (problem.code) {
    case 'codexNeverWhole':
      return `Codex entry ${problem.entry} never opens whole in a playable level`;
    case 'codexPartAfterWhole':
      return `level ${problem.level} opens only some tabs of Codex entry ${problem.entry}, already whole before`;
    case 'notebookLinkBehind':
      return `level ${problem.level}: notebook question ${problem.question + 1} links to ${problem.entry}, already open since ${problem.opensAt}`;
  }
}

/** One readable line for a problem of a secret flower. */
export function describeSecretProblem(problem: SecretProblem): string {
  switch (problem.code) {
    case 'secretNotLast':
      return `secret flower ${problem.level} comes before ${problem.before} of its chapter; it must close the chapter`;
    case 'secretTwice':
      return `chapter ${problem.chapter} has more than one secret flower: ${problem.levels.join(', ')}`;
    case 'secretUnlocks':
      return `secret flower ${problem.level} unlocks something; it must open nothing`;
    case 'secretNotebook':
      return `secret flower ${problem.level} asks a notebook question`;
    case 'secretDraft':
      return `secret flower ${problem.level} is a draft`;
    case 'secretStarsOutOfRange':
      return `secret flower ${problem.level} asks for ${problem.stars} stars; its chapter allows ${problem.least} to ${problem.most}`;
  }
}

/** One readable line for a file that did not load. */
export function describeLoadError(error: LoadError): string {
  return error.code === 'schema'
    ? `schema: ${error.issues.join('; ')}`
    : `${error.code}: ${JSON.stringify(error.error)}`;
}
