import type { VertexId } from '@core/graph/types';
import type { RejectReason } from '@core/rules/reasons';
import type { GardenState } from '@core/rules/state';
import type { VictoryCondition } from '@core/rules/victory';
import { judgeVictory } from './certifyAgain';
import { currentStep, type FlowSignal, type FlowState } from './flow';

/** What a refusal needs of the session: where the script is, and how the level is won. */
export interface RefusalContext {
  readonly flow: FlowState;
  readonly certificates: readonly (readonly VertexId[])[];
  readonly level: { readonly data: { readonly victory?: VictoryCondition | undefined } };
}

/**
 * What a move the rules refused tells the script: the reason, and whether the level's victory
 * holds in the garden the move was tried on. A play step may wait for that refusal (0.2 and 0.4:
 * a second lantern tried once the first is lit); every other step ignores it. Pure.
 */
export function refusalSignal(
  context: RefusalContext,
  garden: GardenState,
  reason: RejectReason,
): FlowSignal {
  const step = currentStep(context.flow);
  const judged = judgeVictory(step, context.certificates, garden, context.level.data.victory);
  return { type: 'refused', code: reason.code, won: judged.kind === 'won' };
}
