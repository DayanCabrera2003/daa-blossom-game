import { describe, expect, it } from 'vitest';
import {
  answerShowing,
  blocksInput,
  emptyStage,
  finishShowing,
  hasCards,
  hintsShowBeside,
  present,
  type Presentation,
} from './presentation';
import type { Question } from './question';

const lines = (...said: string[]): Presentation => ({ kind: 'lines', lines: said });
const replay: Presentation = { kind: 'replay', day: [] };
const question: Question = {
  kind: 'ask',
  step: 1,
  prompt: 'ch1.8.sauce.01',
  options: [
    { value: 0, line: 'ch1.8.sauce.02' },
    { value: 1, line: 'ch1.8.sauce.03' },
  ],
  right: [0, 1],
  preview: null,
};
const asking: Presentation = { kind: 'question', question };
const victory: Presentation = {
  kind: 'victory',
  stars: { total: 3, noHints: true, withinWater: null },
};

describe('the order the player sees things in', () => {
  it('on an empty stage the first item shows at once; the rest wait their turn', () => {
    const { stage, start } = present(emptyStage, [lines('a'), replay, victory]);
    expect(start).toEqual(lines('a'));
    expect(stage).toEqual({ showing: lines('a'), waiting: [replay, victory] });
  });

  it('nothing new shows while something is on stage', () => {
    const first = present(emptyStage, [lines('a')]).stage;
    const { stage, start } = present(first, [lines('b')]);
    expect(start).toBeNull();
    expect(stage).toEqual({ showing: lines('a'), waiting: [lines('b')] });
  });

  it('the victory panel waits until the lines are closed and the replay is over', () => {
    let { stage } = present(emptyStage, [lines('a'), replay]);
    stage = present(stage, [victory]).stage;
    const closed = finishShowing(stage);
    expect(closed.start).toEqual(replay);
    const replayed = finishShowing(closed.stage);
    expect(replayed.start).toEqual(victory);
    expect(finishShowing(replayed.stage)).toEqual({ stage: emptyStage, start: null });
  });

  it('presenting nothing, or finishing an empty stage, changes nothing', () => {
    expect(present(emptyStage, [])).toEqual({ stage: emptyStage, start: null });
    expect(finishShowing(emptyStage)).toEqual({ stage: emptyStage, start: null });
  });

  it('input is blocked only while the day replays', () => {
    expect(blocksInput(emptyStage)).toBe(false);
    expect(blocksInput(present(emptyStage, [lines('a'), replay]).stage)).toBe(false);
    expect(blocksInput(present(emptyStage, [replay, lines('a')]).stage)).toBe(true);
    expect(blocksInput(present(emptyStage, [victory]).stage)).toBe(false);
    // The light searching by itself is a day replaying too (4.1, 4.2).
    expect(blocksInput(present(emptyStage, [{ ...replay, light: true }]).stage)).toBe(true);
  });

  it('a question waits for the lines before it, and what follows waits for its answer', () => {
    let turn = present(emptyStage, [lines('a'), asking, victory]);
    turn = finishShowing(turn.stage);
    expect(turn.start).toEqual(asking);
    expect(present(turn.stage, [lines('b')]).start).toBeNull();
    const answered = answerShowing(turn.stage);
    expect(answered.start).toEqual(victory);
  });

  it('a counterexample waits its turn, and the notebook opens again once the player is back', () => {
    const refuting: Presentation = { kind: 'counterexample', option: 1 };
    const noting: Presentation = { kind: 'question', question: { ...question, kind: 'notebook' } };
    let turn = present(emptyStage, [lines('a'), refuting, noting]);
    turn = finishShowing(turn.stage);
    expect(turn.start).toEqual(refuting);
    expect(answerShowing(turn.stage)).toEqual({ stage: turn.stage, start: null });
    expect(blocksInput(turn.stage)).toBe(false);
    expect(finishShowing(turn.stage).start).toEqual(noting);
  });

  it('only a question on stage is closed by an answer', () => {
    const talking = present(emptyStage, [lines('a'), asking]).stage;
    expect(answerShowing(talking)).toEqual({ stage: talking, start: null });
    expect(answerShowing(emptyStage)).toEqual({ stage: emptyStage, start: null });
  });

  it('hints show beside an open question; otherwise they wait their turn', () => {
    expect(hintsShowBeside(present(emptyStage, [asking]).stage)).toBe(true);
    expect(hintsShowBeside(present(emptyStage, [lines('a'), asking]).stage)).toBe(false);
    expect(hintsShowBeside(emptyStage)).toBe(false);
    expect(blocksInput(present(emptyStage, [asking]).stage)).toBe(false);
  });

  it('a mechanic card shows before what it opens, and only closing it moves the queue on', () => {
    const card: Presentation = { kind: 'tutorial', card: 'bet' };
    const turn = present(emptyStage, [card, asking]);
    expect(turn.start).toEqual(card);
    expect(blocksInput(turn.stage)).toBe(false);
    expect(hintsShowBeside(turn.stage)).toBe(false);
    expect(answerShowing(turn.stage)).toEqual({ stage: turn.stage, start: null });
    expect(finishShowing(turn.stage).start).toEqual(asking);
  });

  it('knows whether a mechanic card is on stage or waiting, so "?" never queues them twice', () => {
    const card: Presentation = { kind: 'tutorial', card: 'sun' };
    expect(hasCards(emptyStage)).toBe(false);
    expect(hasCards(present(emptyStage, [lines('a')]).stage)).toBe(false);
    expect(hasCards(present(emptyStage, [card]).stage)).toBe(true);
    expect(hasCards(present(emptyStage, [lines('a'), card]).stage)).toBe(true);
  });
});
