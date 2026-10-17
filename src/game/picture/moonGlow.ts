import { stonesFromForest } from '@core/certificates/fromForest';
import type { VertexId } from '@core/graph/types';
import type { GardenState } from '@core/rules/state';
import type { VictoryCondition } from '@core/rules/victory';
import { searchStatus } from '@core/search/searchStatus';

/**
 * The sprouts that glow as Sauce says "Levanta las lunas" (7.4): in a level won by the stones the
 * search hands over (`moonCertificate`), once its search is over without a chain, each of its moons
 * (`stonesFromForest`) not lifted yet. Nothing glows anywhere else, nor while the search goes on.
 */
export function moonGlow(
  victory: VictoryCondition | undefined,
  state: GardenState,
): readonly VertexId[] {
  if (victory?.type !== 'moonCertificate' || state.search === null) return [];
  const status = searchStatus(state.layer, state.search, {
    roots: state.roots,
    foldAllowed: state.allowed.has('foldAt'),
  });
  if (status !== 'exhausted') return [];
  return stonesFromForest(state.layer, state.search).filter((moon) => !state.stones.includes(moon));
}
