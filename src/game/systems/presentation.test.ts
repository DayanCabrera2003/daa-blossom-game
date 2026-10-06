import { describe, expect, it } from 'vitest';
import {
  answerShowing,
  blocksInput,
  emptyStage,
  finishShowing,
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
  });

  it('a question waits for the lines before it, and what follows waits for its answer', () => {
    let turn = present(emptyStage, [lines('a'), asking, victory]);
    turn = finishShowing(turn.stage);
    expect(turn.start).toEqual(asking);
    expect(present(turn.stage, [lines('b')]).start).toBeNull();
    const answered = answerShowing(turn.stage);
    expect(answered.start).toEqual(victory);
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
});
