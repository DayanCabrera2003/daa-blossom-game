import { describe, expect, it } from 'vitest';
import { blocksInput, emptyStage, finishShowing, present, type Presentation } from './presentation';

const lines = (...said: string[]): Presentation => ({ kind: 'lines', lines: said });
const replay: Presentation = { kind: 'replay', day: [] };
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
});
