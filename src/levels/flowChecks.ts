import { isMaximum, maximumSize } from '@core/edmonds/fast/maximum';
import { RECIPE_CASES, RIGHT_RECIPE, withoutCases } from '@core/recipe/recipe';
import { runOptionsOf, runRecipe } from '@core/recipe/run';
import { nameOf } from '@core/graph/labels';
import type { VertexId } from '@core/graph/types';
import { decomposeSymmetricDifference } from '@core/matching/symmetricDifference';
import type { Matching } from '@core/matching/types';
import type { Action } from '@core/rules/actions';
import { applyAction } from '@core/rules/applyAction';
import type { RejectReason } from '@core/rules/reasons';
import type { GardenState } from '@core/rules/state';
import { autoSearch } from '@core/search/autoSearch';
import { findConflict } from '@core/search/conflict';
import type { Level } from './build';
import { compareLevelIds } from './catalog';
import { demoStart } from './demoStart';
import { TAUGHT_IN } from './recipeCards';

/** Something wrong with the script of a level; `step` is the index of the step in the script. */
export type FlowProblem =
  | { readonly code: 'noCorrectOption'; readonly step: number }
  | { readonly code: 'notebookMissing'; readonly step: number }
  | { readonly code: 'mirrorMissing'; readonly step: number }
  | { readonly code: 'pieceOutsideTangle'; readonly step: number; readonly sprout: string }
  /** A step about the conflict of the search, where the reference search has met no conflict. */
  | { readonly code: 'noConflict'; readonly step: number }
  /** A mirror challenge over lanterns that already hold the most: no reflection can beat them. */
  | { readonly code: 'drawUnbeatable'; readonly step: number }
  /** A flower challenge in a level that declares no flower to cut the chains at. */
  | { readonly code: 'flowerMissing'; readonly step: number }
  /** A flower challenge over a garden with no chain: nothing can be drawn. */
  | { readonly code: 'noChainToDraw'; readonly step: number }
  /** A flower challenge after a play step, whose moves may have undone the declared flower. */
  | { readonly code: 'flowerAfterPlay'; readonly step: number }
  /** A recipe whose cards recall a level (`level`) not played yet: "esto lo hiciste en…" lies. */
  | { readonly code: 'recallAhead'; readonly step: number; readonly level: string }
  /** A bet whose numbers (1 to `range`) leave out the most lanterns the garden holds. */
  | {
      readonly code: 'betOutOfRange';
      readonly step: number;
      readonly range: number;
      readonly optimum: number;
    }
  /** An automaton step whose fixed recipe the automaton cannot run (only the fold may be missing). */
  | { readonly code: 'recipeCannotRun'; readonly step: number }
  /** A move of the automaton's run that the level's rules refuse (moves locked, fog, roots). */
  | {
      readonly code: 'automatonRefused';
      readonly step: number;
      readonly move: number;
      readonly reason: RejectReason;
    }
  /** A move of the light's own search that the rules refuse (marks locked, fog, roots). */
  | {
      readonly code: 'lightRefused';
      readonly step: number;
      readonly move: number;
      readonly reason: RejectReason;
    }
  | {
      readonly code: 'demoRefused';
      readonly step: number;
      readonly move: number;
      readonly reason: RejectReason;
    };

/** Plays moves from a garden; the first refusal stops it, with the index of the refused move. */
function replay(
  from: GardenState,
  moves: readonly Action[],
): {
  readonly state: GardenState;
  readonly refused: { move: number; reason: RejectReason } | null;
} {
  let state = from;
  for (const [move, action] of moves.entries()) {
    const outcome = applyAction(state, action);
    if (!outcome.ok) return { state, refused: { move, reason: outcome.reason } };
    state = outcome.state;
  }
  return { state, refused: null };
}

/** Whether a sprout lies on some thread or loop of the tangle `yours ⊕ mirror`. */
function inTangle(yours: Matching, mirror: Matching, sprout: VertexId): boolean {
  return decomposeSymmetricDifference(yours, mirror).some((piece) =>
    piece.vertices.includes(sprout),
  );
}

/**
 * The checks of a level script (plan 03, phase 1) that the schema cannot see: every question has a
 * right answer, the notebook step has a notebook to show, the steps of the pond have a reflection,
 * a `count` of lanterns asks about a sprout that is in the tangle, pointing at the conflict and a
 * `count` of its loop come where the search has met a conflict (4.2), a bet offers the right number among its own (a bet
 * nobody can win is no bet), a mirror challenge can be won (a better reflection exists), a flower
 * challenge has a flower and a chain to draw in the garden the level starts with, every demo is
 * accepted by the rules, and so is every move of the light's own search and of the automaton's run
 * (whose recipe must be one it can run), and a recipe recalls only levels that come before it.
 *
 * Lanterns and marks only move in a play step, where the reference solution is played, and when the
 * light searches by itself (4.1, 4.2), where its marks are added, and when the automaton runs from
 * the level's starting lanterns (6.2, 6.3); so the garden at a `count`, a `pickVine` or a `draw` is
 * the one the steps before it leave.
 */
export function checkFlow(level: Level): FlowProblem[] {
  const problems: FlowProblem[] = [];
  const { data, start, mirror } = level;
  /** The garden as the steps so far leave it. */
  let garden = start;
  let afterPlay = false;
  /** Whether the search of the garden now meets a conflict. */
  const conflictNow = (): boolean => findConflict(garden.layer, garden.search) !== null;

  for (const [step, flowStep] of level.flow.entries()) {
    switch (flowStep.step) {
      case 'play':
        garden = replay(garden, level.solution).state;
        afterPlay = true;
        break;
      case 'autoSearch': {
        const light = autoSearch(garden.layer, garden.search, garden.roots);
        const searched = replay(garden, light);
        if (searched.refused !== null) {
          problems.push({ code: 'lightRefused', step, ...searched.refused });
        }
        garden = searched.state;
        break;
      }
      case 'automaton': {
        // Without `missing`, the player's recipe runs, which a recipe step lets pass only when right.
        const options = runOptionsOf(withoutCases(RIGHT_RECIPE, flowStep.missing ?? []));
        if (options === null) {
          problems.push({ code: 'recipeCannotRun', step });
          break;
        }
        const ran = replay(start, runRecipe(start, options));
        if (ran.refused !== null) problems.push({ code: 'automatonRefused', step, ...ran.refused });
        garden = ran.state;
        break;
      }
      case 'ask':
        if (!flowStep.options.some((option) => option.correct)) {
          problems.push({ code: 'noCorrectOption', step });
        }
        break;
      case 'bet': {
        // A bet offers 1 to its range; the right one is what the core says the garden holds.
        const optimum = maximumSize(level.graph);
        if (optimum < 1 || optimum > flowStep.range) {
          problems.push({ code: 'betOutOfRange', step, range: flowStep.range, optimum });
        }
        break;
      }
      case 'notebook':
        if (data.notebook === undefined) problems.push({ code: 'notebookMissing', step });
        break;
      case 'mirror':
      case 'explore':
      case 'separate':
        if (mirror === null) problems.push({ code: 'mirrorMissing', step });
        break;
      case 'pickVine':
        if (!conflictNow()) problems.push({ code: 'noConflict', step });
        break;
      case 'count': {
        if (flowStep.of === 'loop') {
          if (!conflictNow()) problems.push({ code: 'noConflict', step });
          break;
        }
        if (mirror === null) {
          problems.push({ code: 'mirrorMissing', step });
          break;
        }
        if (!inTangle(garden.matching, mirror, flowStep.piece)) {
          const sprout = nameOf(level.labels, flowStep.piece);
          problems.push({ code: 'pieceOutsideTangle', step, sprout });
        }
        break;
      }
      case 'draw':
        if (isMaximum(level.graph, garden.matching)) {
          problems.push({ code: 'drawUnbeatable', step });
        }
        break;
      case 'flowerChallenge':
        // The flower is declared on the starting lanterns, so the challenge comes before any play.
        if (level.flower === null) problems.push({ code: 'flowerMissing', step });
        if (afterPlay) problems.push({ code: 'flowerAfterPlay', step });
        else if (isMaximum(level.graph, start.matching)) {
          problems.push({ code: 'noChainToDraw', step });
        }
        break;
      case 'recipe': {
        const recalled = new Set(RECIPE_CASES.map((recipeCase) => TAUGHT_IN[recipeCase]));
        for (const taught of recalled) {
          if (compareLevelIds(taught, data.id) >= 0) {
            problems.push({ code: 'recallAhead', step, level: taught });
          }
        }
        break;
      }
      case 'replay': {
        if (flowStep.demo === undefined) break;
        const { refused } = replay(demoStart(start), flowStep.demo);
        if (refused !== null) problems.push({ code: 'demoRefused', step, ...refused });
        break;
      }
      default:
        break;
    }
  }
  return problems;
}
