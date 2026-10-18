import type { TeacherFeed } from '@services/busEvents';
import type { LevelSession } from './levelSession';

/**
 * What the teacher's trace panel gets from a level being played (GDD §5.8; plan 07, phase 12):
 * the level, every garden of the day with the events that made it, and where the sun is. Only in
 * teacher mode; for a player there is no feed, and the game emits nothing.
 */
export function teacherFeed(session: LevelSession, teacherMode: boolean): TeacherFeed | null {
  if (!teacherMode) return null;
  return {
    level: session.level.data.id,
    day: session.history.states,
    events: session.dayEvents,
    cursor: session.history.cursor,
  };
}
