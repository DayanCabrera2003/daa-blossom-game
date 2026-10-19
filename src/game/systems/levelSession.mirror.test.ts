import { checkAugmentingPath } from '@core/matching/paths';
import { size } from '@core/matching/queries';
import type { Level } from '@levels/build';
import { loadLevel } from '@levels/loader';
import { describe, expect, it } from 'vitest';
import { HINT_DELAY_MS } from './hints';
import {
  act,
  askHint,
  canAskHint,
  checkDrawnMirror,
  drawInMirror,
  garden,
  isHintAvailable,
  respond,
  startSession,
  stepNow,
  undoSession,
  type LevelSession,
} from './levelSession';
import { MISSES_BEFORE_SPARED } from './mirrorChallenge';
import { tangleLevel } from '../../../tests/support/secretScripts';

/**
 * Two rows A–B–C–D and E–F–G–H with the middle vine of each lit: yours holds 2 lanterns and up to
 * 4 fit, so many different reflections beat it. Ids: A…D are 0…3, E…H are 4…7.
 */
const mirrorLevel = (
  attempts = 3,
  lanterns: string[][] = [
    ['B', 'C'],
    ['F', 'G'],
  ],
): Level => {
  const loaded = loadLevel({
    id: '2.4',
    sprouts: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map((label, i) => ({
      label,
      x: 100 + 60 * (i % 4),
      y: i < 4 ? 80 : 160,
    })),
    vines: [
      ['A', 'B'],
      ['B', 'C'],
      ['C', 'D'],
      ['E', 'F'],
      ['F', 'G'],
      ['G', 'H'],
    ],
    lanterns,
    goal: { visible: false },
    flow: [
      { step: 'draw', attempts },
      { step: 'say', lines: ['ch2.4.sauce.01'] },
    ],
    solution: [{ type: 'checkMirror' }],
  });
  if (!loaded.ok) throw new Error(`fixture does not load: ${JSON.stringify(loaded.error)}`);
  return loaded.value;
};

/**
 * The two phases of 2.4 on the rows of `mirrorLevel`: a better reflection, the chain A–B=C–D used,
 * then F=G turned over too, and a challenge nobody can win over the best lanterns, twice.
 */
const twoPhaseLevel = (): Level => {
  const loaded = loadLevel({
    id: '2.4',
    sprouts: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map((label, i) => ({
      label,
      x: 100 + 60 * (i % 4),
      y: i < 4 ? 80 : 160,
    })),
    vines: [
      ['A', 'B'],
      ['B', 'C'],
      ['C', 'D'],
      ['E', 'F'],
      ['F', 'G'],
      ['G', 'H'],
    ],
    lanterns: [
      ['B', 'C'],
      ['F', 'G'],
    ],
    goal: { visible: false },
    victory: { type: 'matchingSize', value: 4 },
    flow: [
      { step: 'draw', attempts: 1 },
      { step: 'play' },
      { step: 'draw', attempts: 2, beatable: false },
      { step: 'say', lines: ['ch2.4.sauce.01'] },
    ],
    solution: [
      {
        type: 'drawMirror',
        lanterns: [
          ['A', 'B'],
          ['C', 'D'],
          ['F', 'G'],
        ],
      },
      { type: 'checkMirror' },
      { type: 'chain', path: ['A', 'B', 'C', 'D'] },
      { type: 'chain', path: ['E', 'F', 'G', 'H'] },
      { type: 'checkMirror' },
      { type: 'checkMirror' },
    ],
  });
  if (!loaded.ok) throw new Error(`fixture does not load: ${JSON.stringify(loaded.error)}`);
  return loaded.value;
};

/** The session of `twoPhaseLevel` at its second, unbeatable, challenge. */
const secondPhase = (): LevelSession => {
  // A check that does not beat the garden first: its miss stays behind with the first phase.
  const missed = checkDrawnMirror(draw(startSession(twoPhaseLevel(), 0), [[0, 1]]), 0).session;
  const drawn = draw(missed, [
    [2, 3],
    [5, 6],
  ]);
  let session = checkDrawnMirror(drawn, 0).session;
  session = act(session, { type: 'chain', path: [0, 1, 2, 3] }, 0).session;
  return act(session, { type: 'chain', path: [4, 5, 6, 7] }, 0).session;
};

/** Draws these vines, in order. */
const draw = (session: LevelSession, vines: [number, number][]): LevelSession =>
  vines.reduce((s, [u, v]) => drawInMirror(s, u, v).session, session);

describe('a level session runs the mirror challenge', () => {
  it('a touch on a vine draws it in silver; a second silver lantern on a sprout is refused', () => {
    const session = draw(startSession(mirrorLevel(), 0), [[0, 1]]);
    expect(size(session.challenge.draft)).toBe(1);
    const refused = drawInMirror(session, 1, 2);
    expect(refused.refusal).toEqual({ code: 'twoSilver', vertex: 1 });
    expect(refused.session).toBe(session);
  });

  it('your lanterns cannot change while you draw, nor can the day move', () => {
    const session = startSession(mirrorLevel(), 0);
    const moved = act(session, { type: 'split', u: 1, v: 2 }, 0);
    expect(moved.outcome).toEqual({ ok: false, reason: { code: 'notNow' } });
    expect(undoSession(session)).toBe(session);
  });

  it('three better reflections finish the step; checks that do not beat you never count', () => {
    let session = startSession(mirrorLevel(), 0);
    const weak = checkDrawnMirror(draw(session, [[0, 1]]), 0);
    expect(weak.check).toMatchObject({ kind: 'notBetter', drawn: 1, yours: 2 });
    expect(weak.effects).toEqual([]);
    session = weak.session;
    const reflections: [number, number][][] = [
      [
        [0, 1],
        [2, 3],
        [5, 6],
      ],
      [
        [0, 1],
        [2, 3],
        [4, 5],
        [6, 7],
      ],
      [
        [1, 2],
        [4, 5],
        [6, 7],
      ],
    ];
    const effects = [];
    for (const vines of reflections) {
      // Each attempt starts from a clean drawing: every silver vine is touched away first.
      const cleared = session.challenge.draft.mate.reduce<LevelSession>(
        (s, partner, v) => (partner > v ? drawInMirror(s, v, partner).session : s),
        session,
      );
      const checked = checkDrawnMirror(draw(cleared, vines), 0);
      expect(checked.check?.kind).toBe('better');
      if (checked.check?.kind === 'better') {
        const yours = garden(session).matching;
        const { graph } = garden(session);
        expect(checkAugmentingPath(graph, yours, checked.check.piece.sprouts).ok).toBe(true);
      }
      effects.push(...checked.effects);
      session = checked.session;
    }
    expect(effects).toEqual([{ kind: 'say', lines: ['ch2.4.sauce.01'] }, { kind: 'finished' }]);
    expect(session.won).not.toBeNull();
  });

  it('checking the same better reflection again is no new attempt', () => {
    const drawn = draw(startSession(mirrorLevel(2), 0), [
      [0, 1],
      [2, 3],
      [5, 6],
    ]);
    const first = checkDrawnMirror(drawn, 0).session;
    const again = checkDrawnMirror(first, 0);
    expect(again.check).toMatchObject({ kind: 'better', fresh: false });
    expect(again.effects).toEqual([]);
    expect(again.session.flow.attempts).toBe(1);
  });

  it(`after ${MISSES_BEFORE_SPARED} checks that do not win, the step is over anyway`, () => {
    let session = startSession(mirrorLevel(), 0);
    for (let k = 1; k < MISSES_BEFORE_SPARED; k++) {
      const checked = checkDrawnMirror(session, 0);
      expect(checked.effects).toEqual([]);
      session = checked.session;
    }
    const spared = checkDrawnMirror(session, 0);
    expect(spared.check).toMatchObject({ kind: 'notBetter', spared: true });
    expect(spared.effects).toEqual([
      { kind: 'say', lines: ['ch2.4.sauce.01'] },
      { kind: 'finished' },
    ]);
  });

  it('hints are offered while drawing; the grade-3 one draws a reflection the check accepts', () => {
    let session = startSession(mirrorLevel(1), 0);
    expect(isHintAvailable(session, HINT_DELAY_MS)).toBe(true);
    let hint = null;
    for (let k = 1; k <= 3; k++) {
      const opened = askHint(session, k * HINT_DELAY_MS);
      if (opened === null) throw new Error('hint not offered');
      ({ session, hint } = opened);
    }
    expect(hint?.mirror).not.toBeNull();
    expect(hint?.highlight.length).toBeGreaterThan(0);
    expect(size(session.challenge.draft)).toBe(3);
    const checked = checkDrawnMirror(session, 0);
    expect(checked.check).toMatchObject({ kind: 'better', fresh: true });
    expect(checked.effects.at(-1)).toEqual({ kind: 'finished' });
  });

  it('over a garden already at its best, the mentor has no better reflection to draw', () => {
    const full = [
      ['A', 'B'],
      ['C', 'D'],
      ['E', 'F'],
      ['G', 'H'],
    ];
    let session = startSession(mirrorLevel(1, full), 0);
    let hint = null;
    for (let k = 1; k <= 3; k++) {
      const opened = askHint(session, k * HINT_DELAY_MS);
      if (opened === null) throw new Error('hint not offered');
      ({ session, hint } = opened);
    }
    expect(hint).toMatchObject({ mirror: null, highlight: [] });
    expect(size(session.challenge.draft)).toBe(0);
  });

  it('outside the mirror challenge, drawing is refused and checking does nothing', () => {
    const level = mirrorLevel(1);
    const done = checkDrawnMirror(
      draw(startSession(level, 0), [
        [0, 1],
        [2, 3],
        [5, 6],
      ]),
      0,
    ).session;
    expect(stepNow(done)).toBeNull();
    expect(drawInMirror(done, 0, 1)).toEqual({ session: done, refusal: { code: 'notNow' } });
    expect(checkDrawnMirror(done, 0)).toEqual({ session: done, check: null, effects: [] });
    // Answers do not reach the challenge either.
    expect(respond(done, { type: 'tap' }, 0).effects).toEqual([]);
  });

  it('each challenge starts from a clean drawing, whatever the one before left', () => {
    const session = secondPhase();
    expect(stepNow(session)).toMatchObject({ step: 'draw', beatable: false });
    expect(size(session.challenge.draft)).toBe(0);
    expect(session.challenge).toMatchObject({ misses: 0, checked: [], shown: null });
  });

  it('where nobody can win, every check says it does not beat you and counts as an attempt', () => {
    let session = secondPhase();
    session = draw(session, [
      [0, 1],
      [2, 3],
      [4, 5],
      [6, 7],
    ]);
    const first = checkDrawnMirror(session, 0);
    expect(first.check).toMatchObject({ kind: 'notBetter', drawn: 4, yours: 4, spared: false });
    expect(first.effects).toEqual([]);
    const second = checkDrawnMirror(first.session, 0);
    expect(second.effects).toEqual([
      { kind: 'say', lines: ['ch2.4.sauce.01'] },
      { kind: 'finished' },
    ]);
  });

  it('where nobody can win, no hint is at hand: there is nothing to find', () => {
    const session = secondPhase();
    expect(canAskHint(session)).toBe(false);
    expect(isHintAvailable(session, 10 * HINT_DELAY_MS)).toBe(false);
    expect(askHint(session, 10 * HINT_DELAY_MS)).toBeNull();
  });

  it('the winning threads are counted on the tangle before it is separated: 2, not 9 − 8', () => {
    const session = startSession(tangleLevel(), 0);
    expect(stepNow(session)?.step).toBe('count');
    // The temptation: the reflection holds one lantern more, so "one thread". Asked again.
    const tempted = respond(session, { type: 'answer', option: 1 }, 0);
    expect(tempted.effects).toContainEqual({ kind: 'answered', step: 1, value: 1, correct: false });
    expect(stepNow(tempted.session)?.step).toBe('count');
    const right = respond(tempted.session, { type: 'answer', option: 2 }, 0);
    expect(right.effects).toContainEqual({ kind: 'answered', step: 1, value: 2, correct: true });
    expect(stepNow(right.session)?.step).toBe('separate');
  });
});
