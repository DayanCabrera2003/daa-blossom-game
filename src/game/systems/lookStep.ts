import { isExposed } from '@core/matching/queries';
import type { Action } from '@core/rules/actions';
import { reject, type ActionOutcome } from '@core/rules/outcome';
import type { GardenState } from '@core/rules/state';
import type { LevelStep } from '@levels/flow';
import type { ToolId } from '../input/tools';

/**
 * A step that only looks (GDD 3.1): before the marks, the garden in the fog takes inspections
 * alone, so the fog, the drops and inspecting are met one at a time, before suns and moons. The
 * step is over once a sprout in the dark has been looked at; the play step after it opens the rest.
 * Pure.
 */

/** A move a look step keeps closed, refused as a closed action; null when the rules may judge it. */
export function lookRefusal(step: LevelStep | null, action: Action): ActionOutcome | null {
  return step?.step === 'look' && action.type !== 'inspect'
    ? reject({ code: 'actionClosed', action: action.type })
    : null;
}

/** Whether a sprout in the dark has been inspected: what ends a look step. */
export const lookedIntoTheDark = ({ revealed, matching }: GardenState): boolean =>
  revealed?.some((seen, sprout) => seen && isExposed(matching, sprout)) ?? false;

/** The tools of the bar while `step` is on: only inspecting while it looks. */
export const toolsNow = (tools: readonly ToolId[], step: LevelStep | null): ToolId[] =>
  step?.step === 'look' ? tools.filter((tool) => tool === 'inspect') : [...tools];
