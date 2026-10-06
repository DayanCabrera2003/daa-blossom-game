import { nameOf } from '@core/graph/labels';
import type { VertexId } from '@core/graph/types';
import { decomposeSymmetricDifference } from '@core/matching/symmetricDifference';
import type { Matching } from '@core/matching/types';
import type { Action, ActionType } from '@core/rules/actions';
import { applyAction } from '@core/rules/applyAction';
import { UNLOCKED_AT } from '@core/rules/permissions';
import type { RejectReason } from '@core/rules/reasons';
import type { GardenState } from '@core/rules/state';
import type { Level } from './build';

/** Something wrong with the script of a level; `step` is the index of the step in the script. */
export type FlowProblem =
  | { readonly code: 'noCorrectOption'; readonly step: number }
  | { readonly code: 'notebookMissing'; readonly step: number }
  | { readonly code: 'mirrorMissing'; readonly step: number }
  | { readonly code: 'pieceOutsideTangle'; readonly step: number; readonly sprout: string }
  | {
      readonly code: 'demoRefused';
      readonly step: number;
      readonly move: number;
      readonly reason: RejectReason;
    };

/** Every action of the game: a demo is shown with all of them allowed. */
const EVERY_ACTION = Object.keys(UNLOCKED_AT) as ActionType[];

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
 * a `count` asks about a sprout that is in the tangle, and every demo is accepted by the rules.
 *
 * Lanterns never move outside a play step, so the player's lanterns at a `count` are those the
 * level starts with, or, after a play step, those the reference solution leaves.
 */
export function checkFlow(level: Level): FlowProblem[] {
  const problems: FlowProblem[] = [];
  const { data, start, mirror } = level;
  const played = replay(start, level.solution).state.matching;
  let afterPlay = false;

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
      case 'notebook':
        if (data.notebook === undefined) problems.push({ code: 'notebookMissing', step });
        break;
      case 'mirror':
      case 'explore':
      case 'separate':
        if (mirror === null) problems.push({ code: 'mirrorMissing', step });
        break;
      case 'count': {
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
      case 'replay': {
        if (flowStep.demo === undefined) break;
        const open = { ...start, allowed: new Set(EVERY_ACTION) };
        const { refused } = replay(open, flowStep.demo);
        if (refused !== null) problems.push({ code: 'demoRefused', step, ...refused });
        break;
      }
      default:
        break;
    }
  }
  return problems;
}
