import { describe, expect, it } from 'vitest';
import { catalog } from '@levels/catalog';
import type { Level } from '@levels/build';
import { TOAST_FADE_MS, toastDuration } from '../picture/toastDuration';
import { act, openSession, stepNow, type LevelSession } from './levelSession';
import { pressLeave } from './leaving';

/** The level of the catalog with id `id`. */
const levelOf = (id: string): Level => {
  const found = catalog().find((level) => level.data.id === id);
  if (found === undefined) throw new Error(`no level ${id}`);
  return found;
};

/** `session` after the first `count` moves of its level's reference walkthrough (all of them by default). */
const played = (session: LevelSession, count = session.level.solution.length): LevelSession =>
  session.level.solution.slice(0, count).reduce((now, move) => act(now, move, 0).session, session);

const NOTICE = 'Si sales ahora, este jardín empieza de nuevo. Pulsa otra vez para salir.';

// 1.5: the play step, a line, then the notebook's question.
const opened = openSession(levelOf('1.5'), 0).session;

describe('leaving a level (GDD §5.2)', () => {
  it('leaves at once when no move was made', () => {
    expect(pressLeave(opened, null, 1000, NOTICE)).toEqual({ kind: 'leave', win: null });
  });

  it('with moves made, the first press only warns, for as long as the notice stays', () => {
    const moved = played(opened, 1);
    const press = pressLeave(moved, null, 1000, NOTICE);
    expect(press).toEqual({
      kind: 'warn',
      until: 1000 + toastDuration(NOTICE) + TOAST_FADE_MS,
    });
  });

  it('a second press while the notice shows leaves; once it is gone, it warns again', () => {
    const moved = played(opened, 1);
    const until = 5000;
    expect(pressLeave(moved, until, 4999, NOTICE)).toEqual({ kind: 'leave', win: null });
    expect(pressLeave(moved, until, 5000, NOTICE).kind).toBe('leave');
    expect(pressLeave(moved, until, 5001, NOTICE).kind).toBe('warn');
  });

  it('a level whose play step is won keeps its win when left before the script ends', () => {
    const won = played(opened);
    // The script still asks the notebook's question: the session has no win of its own yet.
    expect(stepNow(won)?.step).toBe('notebook');
    expect(won.won).toBeNull();
    const press = pressLeave(won, null, 1000, NOTICE);
    expect(press).toEqual({
      kind: 'leave',
      win: { total: 2, noHints: true, withinWater: null, betRight: null },
    });
  });

  it('a level whose script is over was saved as it ended: nothing more to keep, no warning', () => {
    const stars = { total: 2, noHints: true, withinWater: null, betRight: null };
    const over: LevelSession = { ...played(opened), won: stars };
    expect(pressLeave(over, null, 1000, NOTICE)).toEqual({ kind: 'leave', win: null });
  });
});
