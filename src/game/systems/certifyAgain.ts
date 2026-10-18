import type { VertexId } from '@core/graph/types';
import type { GardenState } from '@core/rules/state';
import { isVictory, type VictoryCondition } from '@core/rules/victory';
import type { LevelStep } from '@levels/flow';
import { isPresented, stoneSet } from '@levels/stoneSets';

/**
 * What a garden reached by a move means to the script, in the two steps that end on the level's
 * victory: playing, where the victory wins the step, and asking the council for another
 * certificate (7.6), where it wins only with stones different from all those presented before; the
 * same stones again are no new proof. Pure; the stones of each certificate that wins are kept, as
 * sets, for the next one to be compared with.
 */
export type VictoryTurn =
  /** No victory here, or a step that does not wait for one. */
  | { readonly kind: 'none' }
  /** The step is won; `certificates` adds the stones of this one. */
  | { readonly kind: 'won'; readonly certificates: readonly (readonly VertexId[])[] }
  /** The victory holds, but with stones already presented: the council says so. */
  | { readonly kind: 'repeated' };

/** Judges the garden `after` a move in the step `step` of the script. */
export function judgeVictory(
  step: LevelStep | null,
  certificates: readonly (readonly VertexId[])[],
  after: GardenState,
  victory: VictoryCondition | undefined,
): VictoryTurn {
  if (step?.step !== 'play' && step?.step !== 'certifyAgain') return { kind: 'none' };
  if (victory === undefined || !isVictory(after, victory)) return { kind: 'none' };
  if (step.step === 'certifyAgain' && isPresented(certificates, after.stones)) {
    return { kind: 'repeated' };
  }
  return { kind: 'won', certificates: [...certificates, stoneSet(after.stones)] };
}
