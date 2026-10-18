import { stonesFromForest } from '@core/certificates/fromForest';
import { runPhase } from '@core/edmonds/phase';
import { itemAt } from '@core/shared/itemAt';
import { placeExactly, placingNow, type PlacingSession } from './placing';

/**
 * "Lift the moons" for the stones of C12 (plan 07, phase 5; level 7.4): a search with flowers runs
 * from the lanterns of the garden (`runPhase`) and, when it finds no chain, its moons are the
 * stones (`stonesFromForest`). They are lifted, the others put back, and the search's marks shown
 * on every sprout (a petal wears its flower's). When the lanterns are not yet the most the garden
 * holds, the search finds a chain instead, there are no moons to lift, and the session stays.
 */
export function liftTheMoons(session: PlacingSession): PlacingSession {
  const now = placingNow(session);
  const outcome = runPhase(now.graph, now.matching);
  if (outcome.kind !== 'maximum') return session;
  const { layer, forest } = outcome;
  const marks = layer.nodeOf.map((node) => itemAt(forest.label, node));
  return placeExactly(session, stonesFromForest(layer, forest), marks);
}
