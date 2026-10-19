import {
  askHint,
  respond,
  startSession,
  stepNow,
  type LevelSession,
} from '@game/systems/levelSession';
import { catalog } from '@levels/catalog';
import { describe, expect, it } from 'vitest';

/** The levels of the Meadow that had no hints of their own before plan 10 (phase 5). */
const MEADOW = ['1.5', '1.6', '1.7', '1.8', '1.9'];

/** A session of level `id` at its play step, as the script reaches it. */
function playing(id: string): LevelSession {
  const level = catalog().find((l) => l.data.id === id);
  if (level === undefined) throw new Error(`no level ${id}`);
  let session = startSession(level, 0);
  if (stepNow(session)?.step === 'bet')
    session = respond(session, { type: 'bet', value: 4 }, 0).session;
  return session;
}

describe('the hints of 1.5–1.9 (plan 10, phase 5)', () => {
  it.each(MEADOW)('%s has three hints of its own, and at grade 3 the mentor makes a move', (id) => {
    let session = playing(id);
    expect(session.level.hints).toHaveLength(3);
    const lines: string[] = [];
    for (let grade = 1; grade <= 3; grade++) {
      const opened = askHint(session, grade);
      if (opened === null) throw new Error(`grade ${grade} does not open in ${id}`);
      expect(opened.hint.generic).toBe(false);
      lines.push(opened.hint.line);
      session = opened.session;
      if (grade === 3) expect(opened.hint.move).not.toBeNull();
    }
    expect(lines.every((line) => line.startsWith(`ch${id}.`))).toBe(true);
  });
});
