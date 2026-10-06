import { size } from '@core/matching/queries';
import type { Matching } from '@core/matching/types';
import type { Point } from '../input/target';
import { isPast } from '../systems/flow';
import { garden, type LevelSession } from '../systems/levelSession';
import { tanglePicture, type PondPicture } from './tangle';

/** The reflection on screen now: the level's, once its `mirror` step is behind; null otherwise. */
export function shownReflection(session: LevelSession): Matching | null {
  const { mirror } = session.level;
  return mirror !== null && isPast(session.flow, 'mirror') ? mirror : null;
}

/** Whether you light as many lanterns as the reflection: then it has nothing more to show. */
export const ties = (yours: Matching, mirror: Matching): boolean => size(yours) >= size(mirror);

/**
 * The picture of the reflection over the garden (plan 03, phase 7), or null while there is none to
 * show: in a level without one, or before its `mirror` step. It follows your lanterns as they are
 * now, so while playing (2.3) the tangle changes with every move. The pieces drift apart once a
 * `separate` step is behind; the sprout touched to explore shows its strands.
 */
export function pondPicture(
  session: LevelSession,
  positions: readonly Point[],
  labels: readonly string[],
): PondPicture | null {
  const mirror = shownReflection(session);
  if (mirror === null) return null;
  const { flow } = session;
  const yours = garden(session).matching;
  const view = { separated: isPast(flow, 'separate'), touched: flow.touched };
  const picture = tanglePicture(yours, mirror, positions, labels, view);
  return { ...picture, dissolved: ties(yours, mirror) };
}
