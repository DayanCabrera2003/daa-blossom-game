import type { Action } from '@core/rules/actions';
import type { Level } from '@levels/build';
import { catalog } from '@levels/catalog';
import { loadLevel } from '@levels/loader';
import { describe, expect, it } from 'vitest';
import { HINT_DELAY_MS } from './hints';
import {
  act,
  askHint,
  garden,
  isHintAvailable,
  openSession,
  respond,
  seekSession,
  startSession,
  undoSession,
  redoSession,
  type LevelSession,
} from './levelSession';

const levelById = (id: string): Level => {
  const level = catalog().find((l) => l.data.id === id);
  if (level === undefined) throw new Error(`no level ${id}`);
  return level;
};
const playAll = (session: LevelSession, actions: readonly Action[], now = 0) =>
  actions.reduce((s, action) => act(s, action, now).session, session);

describe('a level session', () => {
  it('playing 4.6 with its solution wins, with the star for no hints', () => {
    const level = levelById('4.6');
    const won = playAll(startSession(level, 0), level.solution);
    expect(won.won).toEqual({ total: 2, noHints: true, withinWater: null });
  });

  it('a wrong "Terminé" in 4.9 neither wins nor punishes: it is counted, and play goes on', () => {
    const level = levelById('4.9');
    const wrong = playAll(startSession(level, 0), [
      { type: 'split', u: 1, v: 2 },
      { type: 'declareDone' },
    ]);
    expect(wrong.won).toBeNull();
    expect(wrong.claims).toEqual({ right: 0, wrong: 1 });
    const fixed = playAll(undoSession(undoSession(wrong)), [{ type: 'declareDone' }]);
    expect(fixed.won).not.toBeNull();
    expect(fixed.claims).toEqual({ right: 1, wrong: 1 });
  });

  it('undo, redo and the sun move through the day; acting in the past drops the future', () => {
    const level = levelById('1.1');
    const played = playAll(startSession(level, 0), level.solution);
    expect(garden(undoSession(played)).matching).toEqual(garden(seekSession(played, 2)).matching);
    expect(garden(seekSession(played, 0))).toBe(level.start);
    expect(redoSession(undoSession(played)).history).toEqual(played.history);
    const branched = playAll(seekSession(played, 0), [{ type: 'join', u: 0, v: 1 }]);
    expect(branched.history.states).toHaveLength(2);
  });

  it('refusals are answered and counted, and three in a row offer a hint', () => {
    const level = levelById('1.1');
    let session = startSession(level, 0);
    for (let k = 0; k < 3; k++) {
      const result = act(session, { type: 'join', u: 0, v: 2 }, 10);
      expect(result.outcome).toMatchObject({ ok: false, reason: { code: 'notAdjacent' } });
      session = result.session;
    }
    expect(session.rejections).toBe(3);
    expect(isHintAvailable(session, 10)).toBe(true);
  });

  it('a hint opens grade by grade; at grade 3 the mentor makes the next step of the solution', () => {
    const level = levelById('4.1');
    let session = startSession(level, 0);
    const grades = [];
    for (let k = 1; k <= 3; k++) {
      const opened = askHint(session, k * HINT_DELAY_MS);
      if (opened === null) throw new Error('hint not offered');
      grades.push(opened.hint);
      session = opened.session;
    }
    expect(grades.map((hint) => hint.line)).toEqual([
      'ch4.1.sauce.01',
      'ch4.1.sauce.02',
      'ch4.1.sauce.03',
    ]);
    expect(grades[1]?.highlight).toEqual([5]);
    expect(grades[2]?.move).toEqual(level.solution[0]);
    expect(session.hints.opened).toBe(3);
    expect(askHint(startSession(level, 0), 1)).toBeNull();
  });

  it('a level without a victory is never won by moves, and its mentor proposes none', () => {
    const talk = loadLevel({
      id: '2.2',
      sprouts: [
        { label: 'A', x: 100, y: 100 },
        { label: 'B', x: 200, y: 100 },
      ],
      vines: [['A', 'B']],
      goal: { visible: false },
      flow: [
        { step: 'say', lines: ['ch2.2.sauce.00'] },
        {
          step: 'ask',
          prompt: 'ch2.2.sauce.01',
          options: [
            { line: 'ch2.2.sauce.02', correct: true },
            { line: 'ch2.2.sauce.03', correct: false },
          ],
        },
      ],
      solution: [{ type: 'answer', option: 0 }],
    });
    if (!talk.ok) throw new Error('fixture does not load');
    const played = playAll(startSession(talk.value, 0), [{ type: 'join', u: 0, v: 1 }]);
    expect(played.won).toBeNull();
    let session = played;
    for (let k = 1; k <= 3; k++) {
      const opened = askHint(session, k * HINT_DELAY_MS);
      if (opened === null) throw new Error('hint not offered');
      session = opened.session;
      expect(opened.hint.move).toBeNull();
    }
  });

  it('water spent in the session is not given back by undoing (the water star)', () => {
    const foggy = loadLevel({
      id: '3.1',
      sprouts: [
        { label: 'A', x: 100, y: 100 },
        { label: 'B', x: 200, y: 100 },
      ],
      vines: [['A', 'B']],
      goal: { visible: true, value: 1 },
      fog: true,
      water: 1,
      victory: { type: 'matchingSize', value: 1 },
      solution: [{ type: 'join', u: 'A', v: 'B' }],
    });
    if (!foggy.ok) throw new Error('fixture does not load');
    const looked = playAll(startSession(foggy.value, 0), [
      { type: 'inspect', vertex: 0 },
      { type: 'inspect', vertex: 1 },
    ]);
    const undone = undoSession(undoSession(looked));
    expect(undone.waterSpent).toBe(2);
    const won = playAll(undone, [{ type: 'join', u: 0, v: 1 }]);
    expect(won.won).toEqual({ total: 2, noHints: true, withinWater: false });
  });
});

/**
 * A path A–B–C–D whose script is `flow`; the play step (if any) is won with two lanterns, and the
 * reflection lights A–B and C–D.
 */
const scripted = (flow: unknown[]): Level => {
  const loaded = loadLevel({
    id: '2.9',
    sprouts: [
      { label: 'A', x: 100, y: 100 },
      { label: 'B', x: 200, y: 100 },
      { label: 'C', x: 300, y: 100 },
      { label: 'D', x: 400, y: 100 },
    ],
    vines: [
      ['A', 'B'],
      ['B', 'C'],
      ['C', 'D'],
    ],
    lanterns: [['B', 'C']],
    mirror: [
      ['A', 'B'],
      ['C', 'D'],
    ],
    goal: { visible: false },
    ...(flow.some((step) => (step as { step: string }).step === 'play')
      ? { victory: { type: 'matchingSize', value: 2 } }
      : {}),
    flow,
    solution: [{ type: 'tapGarden' }],
  });
  if (!loaded.ok) throw new Error('fixture does not load');
  return loaded.value;
};
/** The two moves that light A–B and C–D from B=C. */
const toTwo: Action[] = [
  { type: 'split', u: 1, v: 2 },
  { type: 'join', u: 0, v: 1 },
  { type: 'join', u: 2, v: 3 },
];
const question = {
  step: 'ask',
  prompt: 'ch2.9.sauce.01',
  options: [
    { line: 'ch2.9.sauce.02', correct: false, reply: 'ch2.9.sauce.03' },
    { line: 'ch2.9.sauce.04', correct: true },
  ],
  retry: true,
};

describe('a level session follows its script', () => {
  it('the default script opens with its lines and wins as before: both moments coincide', () => {
    const level = levelById('4.6');
    expect(openSession(level, 0).effects).toEqual([
      { kind: 'say', lines: ['ch4.6.sauce.00'] },
      { kind: 'play' },
    ]);
    let session = startSession(level, 0);
    for (const [k, action] of level.solution.entries()) {
      const result = act(session, action, 0);
      session = result.session;
      const last = k === level.solution.length - 1;
      expect(result.effects).toEqual(last ? [{ kind: 'finished' }] : []);
      expect(session.won === null).toBe(!last);
    }
  });

  it('play → say → ask: the level is won only when the question is answered right', () => {
    const level = scripted([
      { step: 'play' },
      { step: 'say', lines: ['ch2.9.sauce.00'] },
      question,
    ]);
    const played = toTwo.reduce<{ session: LevelSession; effects: unknown[] }>(
      ({ session }, action) => act(session, action, 0),
      { session: startSession(level, 0), effects: [] },
    );
    expect(played.effects.map((effect) => (effect as { kind: string }).kind)).toEqual([
      'say',
      'ask',
    ]);
    expect(played.session.won).toBeNull();
    const wrong = respond(played.session, { type: 'answer', option: 0 }, 0);
    expect(wrong.session.won).toBeNull();
    expect(wrong.effects.map((effect) => effect.kind)).toEqual(['answered', 'say', 'ask']);
    const right = respond(wrong.session, { type: 'answer', option: 1 }, 0);
    expect(right.effects.map((effect) => effect.kind)).toEqual(['answered', 'finished']);
    expect(right.session.won).toEqual({ total: 2, noHints: true, withinWater: null });
  });

  it('outside the play step, moves are refused with notNow and change nothing', () => {
    const level = scripted([question, { step: 'play' }]);
    const session = startSession(level, 0);
    const tried = act(session, { type: 'split', u: 1, v: 2 }, 0);
    expect(tried.outcome).toEqual({ ok: false, reason: { code: 'notNow' } });
    expect(garden(tried.session)).toBe(level.start);
    expect(tried.effects).toEqual([]);
  });

  it('while waiting for the sun, undo, redo and the sun work; under a question they do not', () => {
    const level = scripted([{ step: 'play' }, { step: 'sun' }, question]);
    const won = playAll(startSession(level, 0), toTwo);
    expect(won.flow.steps[won.flow.index]).toEqual({ step: 'sun' });
    const undone = undoSession(won);
    expect(undone.history.cursor).toBe(2);
    expect(redoSession(undone).history.cursor).toBe(3);
    expect(seekSession(won, 0).history.cursor).toBe(0);
    const asked = respond(undone, { type: 'sunMoved' }, 0).session;
    expect(asked.flow.index).toBe(2);
    expect(undoSession(asked)).toBe(asked);
    expect(redoSession(asked)).toBe(asked);
    expect(seekSession(asked, 0)).toBe(asked);
  });

  it('a step never repeats: undoing after the win does not reopen the play step', () => {
    const level = levelById('1.1');
    const won = playAll(startSession(level, 0), level.solution);
    const replayed = act(seekSession(won, 1), level.solution[1] as Action, 0);
    expect(replayed.outcome.ok).toBe(true);
    expect(replayed.effects).toEqual([]);
    expect(replayed.session.won).toBe(won.won);
  });

  it('hints are offered while playing and asking, never in a step that only waits', () => {
    const level = scripted([{ step: 'play' }, question, { step: 'separate' }]);
    const late = 2 * HINT_DELAY_MS;
    expect(isHintAvailable(startSession(level, 0), late)).toBe(true);
    const asked = playAll(startSession(level, 0), toTwo, HINT_DELAY_MS);
    expect(isHintAvailable(asked, HINT_DELAY_MS + 10)).toBe(false);
    expect(isHintAvailable(asked, HINT_DELAY_MS * 2)).toBe(true);
    const opened = askHint(asked, late);
    expect(opened?.hint.move).toBeNull();
    const waiting = respond(asked, { type: 'answer', option: 1 }, late).session;
    expect(isHintAvailable(waiting, 10 * HINT_DELAY_MS)).toBe(false);
    expect(askHint(waiting, 10 * HINT_DELAY_MS)).toBeNull();
  });

  it('1.8-like: every answer to "how do you know?" is valid and leads to the same line', () => {
    const level = scripted([
      { step: 'play' },
      {
        step: 'ask',
        prompt: 'ch2.9.sauce.01',
        options: [
          { line: 'ch2.9.sauce.02', correct: true, reply: 'ch2.9.sauce.05' },
          { line: 'ch2.9.sauce.03', correct: true, reply: 'ch2.9.sauce.05' },
          { line: 'ch2.9.sauce.04', correct: true, reply: 'ch2.9.sauce.05' },
        ],
      },
    ]);
    const asked = playAll(startSession(level, 0), toTwo);
    for (const option of [0, 1, 2]) {
      const answered = respond(asked, { type: 'answer', option }, 0);
      expect(answered.effects).toEqual([
        { kind: 'answered', step: 1, value: option, correct: true },
        { kind: 'say', lines: ['ch2.9.sauce.05'] },
        { kind: 'finished' },
      ]);
      expect(answered.session.won).not.toBeNull();
    }
  });

  it('the wait for a hint starts again with each step', () => {
    const level = scripted([{ step: 'play' }, question]);
    const asked = playAll(startSession(level, 0), toTwo, 80_000);
    expect(isHintAvailable(asked, 100_000)).toBe(false);
    expect(isHintAvailable(asked, 80_000 + HINT_DELAY_MS)).toBe(true);
  });

  it('stars count the hints opened over the whole level, questions included', () => {
    const level = scripted([{ step: 'play' }, question]);
    const opened = askHint(startSession(level, 0), HINT_DELAY_MS);
    if (opened === null) throw new Error('hint not offered');
    const asked = playAll(opened.session, toTwo);
    const done = respond(asked, { type: 'answer', option: 1 }, 0).session;
    expect(done.won).toEqual({ total: 1, noHints: false, withinWater: null });
  });

  it('a right formal bet, judged by the core, adds a star', () => {
    const betting = (informal: boolean) =>
      scripted([{ step: 'bet', prompt: 'ch2.9.sauce.05', range: 3, informal }, { step: 'play' }]);
    const finish = (level: Level, value: number) =>
      playAll(respond(startSession(level, 0), { type: 'bet', value }, 0).session, toTwo).won;
    expect(finish(betting(false), 2)?.total).toBe(3);
    expect(finish(betting(false), 3)?.total).toBe(2);
    expect(finish(betting(true), 2)?.total).toBe(2);
  });

  it('a count is judged by the core on the tangle of the garden and its reflection', () => {
    const level = scripted([
      { step: 'mirror' },
      { step: 'count', prompt: 'ch2.9.sauce.06', piece: 'A', of: 'mirror', range: 3 },
    ]);
    const session = startSession(level, 0);
    expect(respond(session, { type: 'answer', option: 1 }, 0).session.won).toBeNull();
    expect(respond(session, { type: 'answer', option: 2 }, 0).session.won).not.toBeNull();
  });

  it('a script of lines only completes the level as it opens', () => {
    const opened = openSession(scripted([{ step: 'say', lines: ['ch2.9.sauce.00'] }]), 0);
    expect(opened.effects.map((effect) => effect.kind)).toEqual(['say', 'finished']);
    expect(opened.session.won).toEqual({ total: 2, noHints: true, withinWater: null });
  });

  it('touches end the steps that wait for them', () => {
    const level = scripted([{ step: 'explore' }, { step: 'separate' }]);
    const explored = respond(startSession(level, 0), { type: 'tapSprout', vertex: 2 }, 0);
    expect(explored.effects).toEqual([{ kind: 'sproutTapped', vertex: 2 }, { kind: 'separate' }]);
    expect(respond(explored.session, { type: 'tap' }, 0).session.won).not.toBeNull();
  });
});
