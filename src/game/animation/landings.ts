import type { VertexId } from '@core/graph/types';
import type { AnimationStep } from './plan';

/**
 * Where a lantern passed along a chain comes to rest (GDD §4.1, key animation 1): the last hop of
 * a run of hops lands it, and there the new lantern of the chain appears with a sparkle and a
 * shower of petals. The view shows them and the sounds ring them from the same moments.
 */

/** A chain landing: when, in ms after the plan starts, and the vine of its new lantern. */
export interface ChainLanding {
  readonly at: number;
  readonly u: VertexId;
  readonly v: VertexId;
}

/** The landings of the chains of a plan, in order: each hop that no other hop follows. */
export function chainLandings(steps: readonly AnimationStep[]): ChainLanding[] {
  const landings: ChainLanding[] = [];
  let at = 0;
  steps.forEach((step, i) => {
    at += step.duration;
    if (step.kind === 'hop' && steps[i + 1]?.kind !== 'hop')
      landings.push({ at, u: step.from, v: step.to });
  });
  return landings;
}
