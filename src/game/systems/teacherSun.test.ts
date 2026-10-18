import { catalog } from '@levels/catalog';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { handle, startController } from './levelController';
import { act } from './levelSession';
import { stepAtFraction } from './sun';
import { teacherSun } from './teacherSun';

const level = catalog().find((each) => each.data.id === '1.3');
if (level === undefined) throw new Error('the catalog has 1.3');

describe("the sun the teacher's panel asks for", () => {
  it('lands on exactly the step of the day chosen on the panel', () => {
    fc.assert(
      fc.property(
        fc
          .integer({ min: 1, max: 400 })
          .chain((length) =>
            fc.tuple(fc.constant(length), fc.integer({ min: 0, max: length - 1 })),
          ),
        ([length, step]) => {
          const event = teacherSun(step, length);
          expect(event.kind).toBe('seek');
          expect(stepAtFraction(event.fraction, length)).toBe(step);
        },
      ),
    );
  });

  it('keeps a step outside the day inside it', () => {
    expect(stepAtFraction(teacherSun(9, 3).fraction, 3)).toBe(2);
    expect(stepAtFraction(teacherSun(-4, 3).fraction, 3)).toBe(0);
  });

  it('moves the game sun of 1.3 back to dawn after its chain', () => {
    const [chain] = level.solution;
    if (chain === undefined) throw new Error('1.3 has a chain to play');
    const opened = startController(level, 0);
    const played = { ...opened, session: act(opened.session, chain, 0).session };
    const length = played.session.history.states.length;
    const moved = handle(played, teacherSun(0, length), 0).controller.session;
    expect(moved.history.cursor).toBe(0);
  });
});
