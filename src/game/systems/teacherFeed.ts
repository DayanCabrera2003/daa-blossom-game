import type { TeacherFeed } from '@services/busEvents';
import type { LevelSession } from './levelSession';

/**
 * What the teacher's trace panel gets from a level being played (GDD §5.8; plan 07, phase 12):
 * the level, every garden of the day with the events that made it, and where the sun is; with
 * `ownGarden` (a garden of the free mode, not in the catalog), its sprouts too. Only in teacher
 * mode; for a player there is no feed, and the game emits nothing.
 */
export function teacherFeed(
  session: LevelSession,
  teacherMode: boolean,
  ownGarden = false,
): TeacherFeed | null {
  if (!teacherMode) return null;
  const feed: TeacherFeed = {
    level: session.level.data.id,
    day: session.history.states,
    events: session.dayEvents,
    cursor: session.history.cursor,
  };
  return ownGarden ? { ...feed, sprouts: session.level.data.sprouts } : feed;
}
