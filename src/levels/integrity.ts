import { fastEdmonds } from '@core/edmonds/fast/solve';
import { size } from '@core/matching/queries';
import type { ActionType } from '@core/rules/actions';
import { applyAction } from '@core/rules/applyAction';
import { UNLOCKED_AT } from '@core/rules/permissions';
import type { RejectReason } from '@core/rules/reasons';
import { isVictory } from '@core/rules/victory';
import type { Level } from './build';
import { referencedLines } from './lines';

/** Something wrong with a level that the schema alone cannot see. */
export type IntegrityProblem =
  | { readonly code: 'wonAtStart' }
  | { readonly code: 'goalMismatch'; readonly declared: number; readonly optimum: number }
  | { readonly code: 'victoryOutOfReach'; readonly value: number; readonly optimum: number }
  | { readonly code: 'solutionLocked'; readonly step: number; readonly action: ActionType }
  | { readonly code: 'solutionRefused'; readonly step: number; readonly reason: RejectReason }
  | { readonly code: 'solutionFallsShort' }
  | { readonly code: 'solutionOverWater'; readonly used: number; readonly budget: number }
  | { readonly code: 'foreignLine'; readonly line: string }
  | { readonly code: 'unlockMismatch'; readonly action: ActionType; readonly unlockedAt: string };

/**
 * The integrity checks of a level (plan 01, phase 10), shared by the test suite and
 * `tools/check-levels`. The optimum is always recomputed with Edmonds and the reference solution is
 * replayed with the real rules, so a level can never promise what its garden cannot give (the
 * mistake once made in the design of 4.3). An empty list means the level is sound.
 */
export function checkIntegrity(level: Level): IntegrityProblem[] {
  const problems: IntegrityProblem[] = [];
  const { data, start } = level;
  const optimum = size(fastEdmonds(level.graph));

  if (isVictory(start, data.victory)) problems.push({ code: 'wonAtStart' });
  if (data.goal.visible && data.goal.value !== optimum) {
    problems.push({ code: 'goalMismatch', declared: data.goal.value, optimum });
  }
  if (data.victory.type === 'matchingSize' && data.victory.value > optimum) {
    problems.push({ code: 'victoryOutOfReach', value: data.victory.value, optimum });
  }

  let state = start;
  let replayed = true;
  for (const [step, action] of level.solution.entries()) {
    if (!start.allowed.has(action.type)) {
      problems.push({ code: 'solutionLocked', step, action: action.type });
      replayed = false;
      break;
    }
    const outcome = applyAction(state, action);
    if (!outcome.ok) {
      problems.push({ code: 'solutionRefused', step, reason: outcome.reason });
      replayed = false;
      break;
    }
    state = outcome.state;
  }
  if (replayed && !isVictory(state, data.victory)) problems.push({ code: 'solutionFallsShort' });
  if (replayed && data.water !== null && state.waterUsed > data.water) {
    problems.push({ code: 'solutionOverWater', used: state.waterUsed, budget: data.water });
  }

  for (const line of referencedLines(data)) {
    if (!line.startsWith(`ch${data.id}.`)) problems.push({ code: 'foreignLine', line });
  }
  for (const action of data.unlocks.actions) {
    if (UNLOCKED_AT[action] !== data.id) {
      problems.push({ code: 'unlockMismatch', action, unlockedAt: UNLOCKED_AT[action] });
    }
  }
  return problems;
}
