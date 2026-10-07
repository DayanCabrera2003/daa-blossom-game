import { isMaximum, maximumSize } from '@core/edmonds/fast/maximum';
import { nameOf } from '@core/graph/labels';
import type { VertexId } from '@core/graph/types';
import { decomposeSymmetricDifference } from '@core/matching/symmetricDifference';
import type { Matching } from '@core/matching/types';
import type { Action } from '@core/rules/actions';
import { applyAction } from '@core/rules/applyAction';
import type { RejectReason } from '@core/rules/reasons';
import type { GardenState } from '@core/rules/state';
import { findConflict } from '@core/search/conflict';
import type { Level } from './build';
import { demoStart } from './demoStart';

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
  /** A bet whose numbers (1 to `range`) leave out the most lanterns the garden holds. */
  | {
      readonly code: 'betOutOfRange';
      readonly step: number;
      readonly range: number;
      readonly optimum: number;
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
 * nobody can win is no bet), a mirror challenge can be won (a better reflection exists), and
 * every demo is accepted by the rules.
 *
 * Lanterns and marks never move outside a play step, so the garden at a `count` or a `draw` is the
 * one the level starts with, or, after a play step, the one the reference solution leaves.
 */
export function checkFlow(level: Level): FlowProblem[] {
  const problems: FlowProblem[] = [];
  const { data, start, mirror } = level;
  const playedGarden = replay(start, level.solution).state;
  const played = playedGarden.matching;
  let afterPlay = false;
  /** Whether the search of the garden at a step (after a play step or not) meets a conflict. */
  const conflictAt = (pastPlay: boolean): boolean => {
    const garden = pastPlay ? playedGarden : start;
    return findConflict(garden.layer, garden.search) !== null;
  };

  for (const [step, flowStep] of level.flow.entries()) {
    switch (flowStep.step) {
      case 'play':
        afterPlay = true;
        break;
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
        if (!conflictAt(afterPlay)) problems.push({ code: 'noConflict', step });
        break;
      case 'count': {
        if (flowStep.of === 'loop') {
          if (!conflictAt(afterPlay)) problems.push({ code: 'noConflict', step });
          break;
        }
        if (mirror === null) {
          problems.push({ code: 'mirrorMissing', step });
          break;
        }
        const yours = afterPlay ? played : start.matching;
        if (!inTangle(yours, mirror, flowStep.piece)) {
          const sprout = nameOf(level.labels, flowStep.piece);
          problems.push({ code: 'pieceOutsideTangle', step, sprout });
        }
        break;
      }
      case 'draw':
        if (isMaximum(level.graph, afterPlay ? played : start.matching)) {
          problems.push({ code: 'drawUnbeatable', step });
        }
        break;
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
