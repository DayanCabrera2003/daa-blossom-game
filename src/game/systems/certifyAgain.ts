import type { VertexId } from '@core/graph/types';
import type { GardenState } from '@core/rules/state';
import { isVictory, type VictoryCondition } from '@core/rules/victory';
import type { LevelStep } from '@levels/flow';
import { isPresented, stoneSet } from '@levels/stoneSets';
import { lookedIntoTheDark } from './lookStep';

/**
 * What a garden reached by a move means to the script, in the two steps that end on the level's
 * victory: playing, where the victory wins the step, and asking the council for another
 * certificate (7.6), where it wins only with stones different from all those presented before; the
 * same stones again are no new proof. A step that only looks (3.1) is over, as if won, once a
 * sprout in the dark has been inspected. Pure; the stones of each certificate that wins are kept, as
 * sets, for the next one to be compared with.
 */
export type VictoryTurn =
  /** No victory here, or a step that does not wait for one. */
  | { readonly kind: 'none' }
  /** The step is won; `certificates` adds the stones of this one. */
  | { readonly kind: 'won'; readonly certificates: readonly (readonly VertexId[])[] }
  /** The victory holds, but with stones already presented: the council says so, with `line`. */
  | { readonly kind: 'repeated'; readonly line: string };

/** Judges the garden `after` a move in the step `step` of the script. */
export function judgeVictory(
  step: LevelStep | null,
  certificates: readonly (readonly VertexId[])[],
  after: GardenState,
  victory: VictoryCondition | undefined,
): VictoryTurn {
  if (step?.step === 'look') {
    return lookedIntoTheDark(after) ? { kind: 'won', certificates } : { kind: 'none' };
  }
  if (step?.step !== 'play' && step?.step !== 'certifyAgain') return { kind: 'none' };
  if (victory === undefined || !isVictory(after, victory)) return { kind: 'none' };
  if (step.step === 'certifyAgain' && isPresented(certificates, after.stones)) {
    return { kind: 'repeated', line: step.repeated };
  }
  return { kind: 'won', certificates: [...certificates, stoneSet(after.stones)] };
}
