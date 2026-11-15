import {
  askHint,
  respond,
  startSession,
  stepNow,
  type LevelSession,
} from '@game/systems/levelSession';
import lines from '@content/es/lines.json';
import { applyAction } from '@core/rules/applyAction';
import { resolveTap } from '@game/input/intent';
import { NO_SELECTION, type Selection } from '@game/input/selection';
import { catalog } from '@levels/catalog';
import { describe, expect, it } from 'vitest';

const TABLE: Readonly<Record<string, string>> = lines;

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

describe('the trap of 1.1, before passing the lantern exists', () => {
  const level = catalog().find((l) => l.data.id === '1.1');
  if (level === undefined) throw new Error('no level 1.1');
  // Four sprouts in a row: the two in the middle lit together are the trap.
  const [end, middle, other] = [0, 1, 2];
  const trap = applyAction(level.start, { type: 'join', u: middle, v: other });
  if (!trap.ok) throw new Error('the trap does not light');

  it('touching the sprout at the end, then its lit neighbor, says it already has a lantern', () => {
    let selection: Selection = NO_SELECTION;
    const actions = [end, middle].map((vertex) => {
      const outcome = resolveTap(trap.state, 'lanterns', selection, { kind: 'sprout', vertex });
      selection = outcome.selection;
      return outcome.action;
    });
    const move = actions[1];
    if (move === null || move === undefined) throw new Error('the second touch does nothing');
    const outcome = applyAction(trap.state, move);
    expect(outcome.ok ? null : outcome.reason.code).toBe('alreadyLit');
  });

  it('its first hint tells that a lit lantern goes out when touched', () => {
    const first = TABLE[level.data.hints[0]?.line ?? ''] ?? '';
    expect(first).toMatch(/apagar/);
    expect(first).toMatch(/tócalo/);
  });
});
