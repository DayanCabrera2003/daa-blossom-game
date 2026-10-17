import { members } from '@core/blossom/hierarchy';
import type { VertexId } from '@core/graph/types';
import { findConflict } from '@core/search/conflict';
import { itemAt } from '@core/shared/itemAt';
import { isPast } from '../systems/flow';
import { garden, type LevelSession } from '../systems/levelSession';

/**
 * The sprouts that wear the split badge, half sun and half moon (GDD 4.2), in ascending order:
 * once the player has pointed at the vine where the light went wrong, every sprout of the loop it
 * closes except the base, which is a sun whichever way the loop is walked. The others are a sun
 * going round one way and a moon going round the other. Empty before the right vine is pointed
 * at (a `pickVine` step is passed only by it), or when the garden shows no conflict any more.
 */
export function splitBadges(session: LevelSession): VertexId[] {
  if (!isPast(session.flow, 'pickVine')) return [];
  const { layer, search } = garden(session);
  const conflict = findConflict(layer, search);
  if (conflict === null) return [];
  return conflict.loop
    .slice(1)
    .flatMap((node) => members(itemAt(layer.nodes, node)))
    .sort((a, b) => a - b);
}
