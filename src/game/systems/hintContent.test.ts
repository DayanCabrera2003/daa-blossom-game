import { describe, expect, it } from 'vitest';
import { hintContent, sproutsOf } from './hintContent';

// Level 4.1 hints: a nudge, the sprout e glowing, the mentor tracing R–a=b–d.
const festivalHints = [
  { line: 'ch4.1.sauce.01', highlight: [] },
  { line: 'ch4.1.sauce.02', highlight: [5] },
  { line: 'ch4.1.sauce.03', highlight: [0, 1, 2, 4] },
];
const step = { type: 'chain', path: [0, 1, 2, 4, 3, 5] } as const;

describe('what each hint grade shows (GDD §5.3)', () => {
  it('grade k is the k-th hint written for the level', () => {
    expect(hintContent(festivalHints, 1, step)).toEqual({
      line: 'ch4.1.sauce.01',
      generic: false,
      highlight: [],
      move: null,
    });
    expect(hintContent(festivalHints, 2, step).highlight).toEqual([5]);
  });

  it('only grade 3 has the mentor make a move', () => {
    expect(hintContent(festivalHints, 3, step)).toEqual({
      line: 'ch4.1.sauce.03',
      generic: false,
      highlight: [0, 1, 2, 4],
      move: step,
    });
  });

  it('a level without hints falls back on the generic lines, and the mentor shows the way', () => {
    expect(hintContent([], 1, step)).toEqual({
      line: 'hint.generic.1',
      generic: true,
      highlight: [],
      move: null,
    });
    expect(hintContent([], 2, step).highlight).toEqual([0, 1, 2, 3, 4, 5]);
    expect(hintContent([], 3, null)).toEqual({
      line: 'hint.generic.3',
      generic: true,
      highlight: [],
      move: null,
    });
  });

  it('the sprouts an action involves, each once', () => {
    expect(sproutsOf({ type: 'join', u: 3, v: 1 })).toEqual([1, 3]);
    expect(sproutsOf({ type: 'markMoon', from: 2, to: 0 })).toEqual([0, 2]);
    expect(sproutsOf({ type: 'fold', loop: [4, 2, 3] })).toEqual([2, 3, 4]);
    expect(sproutsOf({ type: 'rotateStem', stem: [0, 1, 2] })).toEqual([0, 1, 2]);
    expect(sproutsOf({ type: 'liftStone', vertex: 6 })).toEqual([6]);
    expect(sproutsOf({ type: 'unfold', blossom: 0 })).toEqual([]);
    expect(sproutsOf({ type: 'declareDone' })).toEqual([]);
  });
});
