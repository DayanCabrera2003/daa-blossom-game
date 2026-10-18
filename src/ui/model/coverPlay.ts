import { koenigCover } from '@core/certificates/vertexCover';
import { bipartition } from '@core/graph/bipartition';
import { bipartiteMatching } from '@core/search/bipartiteMatching';
import { placeExactly, placingNow, type PlacingSession } from './placing';

/**
 * "On the moons" for the scarecrows of C5 (plan 07, phase 5; level 3.8): the search of bees and
 * flowers runs to its end (`bipartiteMatching`) and König's cover is read off its last forest
 * (`koenigCover`): every moon, and the sprouts of the first side it never reached. The scarecrows
 * are set there, and the search's marks shown with them. A garden that is not of bees and flowers
 * has no such search, and the session stays as it is.
 */
export function onTheMoons(session: PlacingSession): PlacingSession {
  const now = placingNow(session);
  if (bipartition(now.graph).kind !== 'bipartite') return session;
  const run = bipartiteMatching(now.graph, now.matching);
  if (!run.ok) return session;
  return placeExactly(session, koenigCover(now.graph, run.value.forest), run.value.forest.label);
}
