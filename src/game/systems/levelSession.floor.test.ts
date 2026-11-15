import { describe, expect, it } from 'vitest';
import { catalog } from '@levels/catalog';
import type { Level } from '@levels/build';
import { canUndo } from './history';
import { openSession, respond, stepNow, undoSession, type LevelSession } from './levelSession';

/** The level of the catalog with id `id`. */
const levelOf = (id: string): Level => {
  const found = catalog().find((level) => level.data.id === id);
  if (found === undefined) throw new Error(`no level ${id}`);
  return found;
};

/** The session of `id` once the search that opens its script has been shown: its play step waits. */
const afterSearch = (id: string): LevelSession => {
  const { session } = openSession(levelOf(id), 0);
  const searched = respond(session, { type: 'searched' }, 0).session;
  expect(stepNow(searched)?.step).toBe('play');
  return searched;
};

describe('the floor of undo, where the play step starts', () => {
  it.each(['4.1', '7.4'])(
    'in %s, undoing never takes back the search shown before the play step',
    (id) => {
      const session = afterSearch(id);
      const { cursor } = session.history;
      expect(cursor).toBeGreaterThan(0);
      const undone = undoSession(session);
      expect(undone.history.cursor).toBe(cursor);
      expect(canUndo(undone.history)).toBe(false);
    },
  );
});
